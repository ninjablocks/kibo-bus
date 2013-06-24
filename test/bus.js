var should = require('should');
var log = require('debug')('test:bus');

var bus = require('../index.js');

describe('Bus', function () {

  it('should open a publish stream', function (done) {

    log('open')
    bus.rabbitContext.on('ready', function () {
      bus.publish('sometestpub', function (err, stream) {
        log('stream', 'publish');
        stream.should.exist;
        stream.write("TEST TEST", 'utf8');
        done();
      });
    });
  });

  it('should open a subscribe stream', function (done) {

    log('open')
    bus.subscribe('sometestpub', function (err, stream) {
      log('stream', 'subscribe');
      stream.should.exist;
      stream.pipe(process.stdout);
      done()
    });
  });

});
