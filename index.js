var log = require('debug')('ninja:bus');
var rabbit = require('rabbit.js');
var amqp = require('amqp');
var events = require('events');
var util = require('util');
var topicStream = require('./lib/topic_stream.js')
var queueStream = require('./lib/queue_stream.js')

var Bus = function (options) {
  events.EventEmitter.call(this);

  log('connect', options.rabbit_url);
  this._connection =
    amqp.createConnection({url: "amqp://guest:guest@localhost:5672"});

  var self = this;
  this._connection.once('ready', function(){
    log('Bus', 'ready')
    self.emit('ready')
  });

  this.subscribe = function (path, queueName, cb) {
    log('subscribe', path)
    queueStream({connection: this._connection, exchangeName: path, queueName: queueName}, cb)
  }

  this.publish = function (path, cb) {
    log('publish', path)
    topicStream({connection: this._connection, exchangeName: path}, cb)
  }
}


util.inherits(Bus, events.EventEmitter);

module.exports = Bus;
