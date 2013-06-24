var settings = require('./models/config');
var log = require('debug')('ninja:libs:bus');
var rabbit = require('rabbit.js');

var Bus = function () {
  log('connect', settings.rabbit_url);
  this.rabbitContext = rabbit.createContext(settings.rabbit_url);
}

Bus.prototype.subscribe = function (path, cb) {
  log('subscribe', path)
  var subStream = this.rabbitContext.socket('SUB');
  subStream.connect(path);
  cb(null, subStream);
}

Bus.prototype.publish = function (path, cb) {
  log('publish', path)
  var pubStream = this.rabbitContext.socket('PUB');
  pubStream.connect(path);
  cb(null, pubStream);
}

module.exports = new Bus();
