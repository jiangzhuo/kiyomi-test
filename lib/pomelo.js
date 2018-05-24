const path = require('path')
const Application = require('./application')
const uuid = require('uuid/v1')
const _ = require('lodash')

class PomeloTest {
  constructor (opts) {
    this.apps = new Map()

    this.env = opts.env || 'development'
    this.base = opts.base || path.dirname(require.main.filename)

    let configPath = this.base + '/config/servers.json'
    let serversConfig = require(configPath)
    Object.entries(serversConfig[this.env]).forEach(([serverType, serverTypeConfigs]) => {
      this.apps.set(serverType, new Map())
      serverTypeConfigs.forEach((serverTypeConfig) => {
        let app = new Application({
          base: this.base,
          env: this.env,
          id: serverTypeConfig.id,
          serverType: serverType
        })
        this.apps.get(serverType).set(serverTypeConfig.id, app)
      })
    })

    this.sessions = new Map()
  }

  startAll () {
    let startCount = 0
    let callbacked = 0
    this.apps.forEach((servers) => {
      servers.forEach((server) => {
        server.init()
      })
    })

    // 链接rpc
    this.apps.forEach((servers,serverType) => {
      servers.forEach((server,serverId) => {
        let app = server
        app.rpc = {}
        app.rpcMap = {}

        this.apps.forEach((remoteServers,remoteServerType) => {
          remoteServers.forEach((remoteServer) => {
            let remoteApp = remoteServer
            if (!app.rpcMap[remoteServerType]) {
              app.rpcMap[remoteServerType] = new Map()
            }
            app.rpcMap[remoteServerType].set(remoteApp.serverId, remoteApp.remote)
            app.rpc = new Proxy(app, {
              get: function (target, prop, receiver) {
                // todo custom route func
                let getServerId = (serverType) => {return serverType + '-1'}
                let serverId = getServerId(prop)
                return new Proxy(target.rpcMap[prop].get(serverId), {
                  get: function (target, handlerName, receiver) {
                    return new Proxy(target[handlerName], {
                      get: function (target, funcName, receiver) {
                        return (routeArg, ...args) => {return target[funcName](...args)}
                      }
                    })
                  }
                })
                // return target.rpcMap[prop].get(serverId)
              }
            })
          })
        })
      })
    })

    this.apps.forEach((servers) => {
      servers.forEach((server) => {
        startCount++
      })
    })
    this.apps.forEach((servers) => {
      servers.forEach((server) => {
        server.start(() => {
          callbacked += 1
          if (callbacked === startCount) {
            this.apps.forEach((servers) => {
              servers.forEach((server) => {
                server.afterStartAll(server)
              })
            })
          }
        })
      })
    })
  }

  createSession () {
    let session = new Session(this)
    this.sessions.set(session.id, session)
    return session
  }

}

class Session {
  constructor (pomeloTest) {
    this.id = uuid()
    this.setting = new Map()
    this.routeMap = new Map()
    this.pomeloTest = pomeloTest
  }

  request (route, msg, cb) {
    let [serverType, handlerName, funcName] = route.split('.')
    // todo custom route func
    let getServerId = (serverType) => {return serverType + '-1'}
    let serverId = getServerId(serverType)
    let app = this.pomeloTest.apps.get(serverType).get(serverId)
    let handler = _.get(app.handler, handlerName)
    _.get(handler, funcName).bind(handler)(msg, this).then(cb)
  }

  bind (uid, cb) {
    this.uid = uid
    cb()
  }

  pushAll (cb) {
    cb()
  }

  set (key, value) {
    this.setting.set(key, value)
  }

  get (key) {
    return this.setting.get(key)
  }

  on (route, cb) {
    this.routeMap.set(route, cb)
  }
}

module.exports = PomeloTest
