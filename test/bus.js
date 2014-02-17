"use strict";

var chai = require('chai');
var log = require('debug')('test:bus');
var through = require('through');
var Bus = require('../index.js');
var amqplib = require('amqplib');

var expect = chai.expect;

describe('Bus', function () {

  before(function(done){
    amqplib.connect('amqp://guest:guest@localhost:5672').then(function(conn){
      conn.createChannel().then(function(ch){
        ch.assertQueue('/queue/sometestpub2', {durable: true, autoDelete: false, messageTtl: 30000, expires: 3600000});
        ch.assertQueue('/queue/sometestget', {durable: true, autoDelete: false, messageTtl: 30000, expires: 3600000});
        log('queues', 'created');
        done();
      });
    });
  });

  it('should open a publish stream', function (done) {

    log('open');
    var bus = new Bus({rabbitmq_url: 'amqp://guest:guest@localhost:5672'});

    bus.publish({exchange: 'sometestpub'}, function (err, stream) {
      log('stream', 'publish');
      expect(stream).to.exist;
      stream.write({message: 'TEST', routingKey: 'TEST'});
      done();
    });

  });

  it('should open a subscribe stream and send 100 messages', function (done) {

    log('open');
    var bus = new Bus({rabbitmq_url: 'amqp://guest:guest@localhost:5672'});

    log('subscribe');
    bus.subscribe({exchange: '/bustestsub', queue: '/queue/sometestpub2'}, function (err, stream) {

      log('stream', 'subscribe');
      expect(err).to.not.exist;
      expect(stream).to.exist;

      var msgs = 0;

      stream.pipe(through(function onData(data) {
        expect(data).to.exist;
        log('message', 'relieved', data);
        msgs++;
        if (msgs == 100) {
          stream.cancelConsumer().then(function(){
            bus.close();
            done();
          });
        }
      }));

      stream.bindRoutingKey('TEST', function (err) {

        expect(err).to.not.exist;

        bus.publish({exchange: '/bustestsub'}, function (err, stream) {
          log('stream', 'publish');
          for (var i = 0; i < 100; i++) {
            stream.write({message: "TEST subscribe", _routingKey: "TEST"});
          }
        });
      });
    });

  });

  it('should open a subscribe stream a second time', function (done) {

    log('open');
    var bus = new Bus({rabbitmq_url: 'amqp://guest:guest@localhost:5672'});

    log('subscribe');
    bus.subscribe({exchange: '/bustestsub', queue: '/queue/sometestpub2'}, function (err, stream) {

      log('stream', 'subscribe');
      expect(err).to.not.exist;
      expect(stream).to.exist;

      stream.pipe(through(function onData(data) {
        expect(data).to.exist;
        log('message', 'relieved', data);
        stream.cancelConsumer().then(function(){
          bus.close();
          done();
        });
      }));

      stream.bindRoutingKey('TEST', function (err) {

        expect(err).to.not.exist;

        bus.publish({exchange: '/bustestsub'}, function (err, stream) {
          log('stream', 'publish');
          stream.write({message: "TEST subscribe", _routingKey: "TEST"});
        });
      });
    });

  });

  it('should open a queue and get two messages', function (done) {

    log('open');
    var bus = new Bus({rabbitmq_url: 'amqp://guest:guest@localhost:5672'});

    bus.get({routingKey: 'TEST', exchange: '/bustestget', queue: '/queue/sometestget', timeout: 2000}, function (err, data) {
      log('get', data);
      expect(err).to.not.exist;
      expect(data).to.exist;

      bus.get({routingKey: 'TEST', exchange: '/bustestget', queue: '/queue/sometestget', timeout: 2000}, function (err, data) {
        log('get', data);
        expect(err).to.not.exist;
        expect(data).to.exist;
        done();
      });
    });

    setTimeout(function(){
      bus.put({exchange: '/bustestget', routingKey: "TEST"}, {message: "TEST get"});
      bus.put({exchange: '/bustestget', routingKey: "TEST"}, {message: "TEST get"});
    }, 100);

  });

  it('should open a queue and get should timeout', function (done) {

    log('open');
    var bus = new Bus({rabbitmq_url: 'amqp://guest:guest@localhost:5672'});

    bus.get({routingKey: 'TEST', exchange: '/bustestget', queue: '/queue/sometestget'}, function (err, data) {
      log('get', data);
      expect(err).to.exist;
      expect(data).to.not.exist;
      done();
    });

  });

  it('should create a bus and cache it', function(){

    var bus = Bus.createBus({rabbitmq_url: 'amqp://guest:guest@localhost:5672'});
    var bus2 = Bus.createBus({rabbitmq_url: 'amqp://guest:guest@localhost:5672'});

    expect(bus).to.eq(bus2);

  });
});
