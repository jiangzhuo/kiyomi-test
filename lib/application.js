const Loader = require('pomelo-loader-upgrade')
const fs = require('fs')
// const {lstatSync, readdirSync} = require('fs')
// const {join} = require('path')
// const isDirectory = source => lstatSync(source).isDirectory()
// const getDirectories = source => readdirSync(source).filter(name => isDirectory(join(source, name)))

const LIFECYCLE = {
  BEFORE_STARTUP: 'beforeStartup',
  BEFORE_SHUTDOWN: 'beforeShutdown',
  AFTER_STARTUP: 'afterStartup',
  AFTER_STARTALL: 'afterStartAll'
}

class Application {
  constructor (opts) {
    opts = opts || {}
    this.serverId = opts.id
    this.serverType = opts.serverType
    this.base = opts.base

    this.settings = new Map()

    // globalChannelService
    let globalChannelService = {}
    globalChannelService['pushMessageByUidArr'] = () => { return new Promise((resolve) => {setTimeout(resolve, 2)})}
    globalChannelService['add'] = () => { return new Promise((resolve) => {setTimeout(resolve, 2)})}
    globalChannelService['leave'] = () => { return new Promise((resolve) => {setTimeout(resolve, 2)})}
    globalChannelService['destroyChannel'] = () => { return new Promise((resolve) => {setTimeout(resolve, 2)})}
    globalChannelService['pushMessage'] = () => { return new Promise((resolve) => {setTimeout(resolve, 2)})}
    this.settings.set('globalChannelService', globalChannelService)

    // backendSessionService
    let backendSessionService = {}
    backendSessionService['getByUid'] = function (sid, uid, cb) {cb()}
    this.settings.set('backendSessionService', backendSessionService)

    // channelService
    let channelService = {}
    channelService['getChannel'] = function (name, create) {
      return {
        add: (uid, sid) => {},
        leave: (uid, sid) => {},
        pushMessage: (route, msg, opts, cb) => {setTimeout(cb, 2)},
        destroy: () => {},
        getMembers: () => {},
        getMember: (uid) => {}
      }
    }
    channelService['pushMessageByUids'] = (route, msg, uids, opts, cb = () => {}) => {
      setTimeout(cb, 2)
    }
    channelService['broadcast'] = (stype, route, msg, opts, cb = () => {}) => {setTimeout(cb, 2)}
    this.settings.set('channelService', channelService)

    // sessionService
    let sessionService = {}
    sessionService['kick'] = (uid, reason, cb) => {setTimeout(cb, 2)}
    sessionService['kickBySessionId'] = (uid, reason, cb) => {setTimeout(cb, 2)}
    this.settings.set('sessionService', sessionService)
  }

  init(){
    this.lifeCycle = {}
    try {
      let lifecyclePath = this.base + '/app/servers/' + this.serverType + '/lifecycle.js'
      fs.accessSync(lifecyclePath, fs.constants.R_OK)
      this.lifeCycle = require(this.base + '/app/servers/' + this.serverType + '/lifecycle')
    } catch (err) {
    }

    try {
      let handlerPath = this.base + '/app/servers/' + this.serverType + '/handler'
      fs.accessSync(handlerPath, fs.constants.R_OK)
      this.handler = Loader.load(handlerPath, this)
    } catch (err) {
    }

    try {
      let remotePath = this.base + '/app/servers/' + this.serverType + '/remote'
      fs.accessSync(remotePath, fs.constants.R_OK)
      this.remote = Loader.load(remotePath, this)
    } catch (err) {
    }
  }

  get (name) {
    return this.settings.get(name)
  }

  set (key, val) {
    this.settings.set(key, val)
  }

  getServerId(){
    return this.serverId
  }

  start (cb = () => {}) {
    let beforeStart = this.lifeCycle[LIFECYCLE.BEFORE_STARTUP]
    let afterStart = this.lifeCycle[LIFECYCLE.AFTER_STARTUP]
    if (beforeStart) {
      beforeStart(this, () => {
        if (afterStart) {
          afterStart(this, cb)
        } else {
          cb()
        }
      })
    } else {
      cb()
    }
  }

  afterStartAll () {
    if (this.lifeCycle[LIFECYCLE.AFTER_STARTALL]) {
      return this.lifeCycle[LIFECYCLE.AFTER_STARTALL](this)
    }
  }

}

module.exports = Application
