var chai = require('chai');
var log = require('debug')('test:bus');
var through = require('through');
var Bus = require('../index.js');

var expect = chai.expect;

describe('Bus', function () {

  it('should open a publish stream', function (done) {

    log('open')
    var bus = new Bus({rabbit_url: 'amqp://guest:guest@localhost:5672'});
    bus.on('ready', function () {
      bus.publish('sometestpub', function (err, stream) {
        log('stream', 'publish');
        expect(stream).to.exist;
        stream.write({message: 'TEST', routingKey: 'TEST'});
        done();
      });
    });
  });

  it('should open a subscribe stream', function (done) {
    log('open')
    var bus = new Bus({rabbit_url: 'amqp://guest:guest@localhost:5672'});
    bus.on('ready', function () {
      log('subscribe')
      bus.subscribe('sometestpub2', '/queue/sometestpub2', function (err, stream) {

        log('stream', 'subscribe');
        expect(err).to.not.exist;
        expect(stream).to.exist;

        stream.pipe(through(function onData(data){
          expect(data).to.exist;
          log('message', 'recieved', data)
          done()
        }));

        stream.bindRoutingKey('TEST', function(err){

          expect(err).to.not.exist;

          bus.publish('sometestpub2', function (err, stream) {
            log('stream', 'publish');
            stream.write({message: "TEST", routingKey: "TEST"});
          });
        })
      });
    });
  });

});
