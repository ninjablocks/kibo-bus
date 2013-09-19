# kibo-bus

This component is specifically designed to separate the bus from the
dojo/cloud services.

# Objectives

So the goal of this library is to separate people using the bus from the actual protocol / system / service used to provide it.

Messaging can be quite complicated, especially in the case of AMQP so I would like to reduce the surface area of the API
just to the bits we need while ensuring these smaller bits are FAST and reliable.

# Usage

Connect to an AMQP server and publish to a topic via a stream.

```javascript

var bus = require('kibo-bus');

var bus = new Bus({rabbit_url: 'amqp://guest:guest@localhost:5672'});

// exchange is a "route" for want of a better term, it controls what routing for queues
bus.publish({exchange: 'sometestpub'}, function (err, stream) {

  if(err) throw err;
  // the _routingKey provides a tag for routing.
  stream.write({message: 'TEST', _routingKey: 'TEST'});

});

```

Connect to an AMQP server and subscribe to a queue via a stream.

```javascript

var bus = require('kibo-bus');

var bus = new Bus({rabbit_url: 'amqp://guest:guest@localhost:5672'});

// exchange is a "route" for want of a better term, it controls what routing for queues
bus.publish({exchange: 'sometestpub'}, function (err, stream) {

  if(err) throw err;
  // the _routingKey provides a tag for routing.
  stream.write({message: 'TEST', _routingKey: 'TEST'});

});

// exchange is a "route" for want of a better term, it controls what routing for queues
bus.subscribe({exchange: '/bustestsub', queue: '/queue/sometestpub2'}, function (err, stream) {
  // bind the wild card # to subscribe to all messages coming into the exchange
  stream.bindRoutingKey('#');
  // send the data to stdout
  stream.pipe(process.stdout);
});

```

Connect to an AMQP server and put a message into an exchange.

```javascript

var bus = require('kibo-bus');

var bus = new Bus({rabbit_url: 'amqp://guest:guest@localhost:5672'});

// exchange is a "route" for want of a better term, it controls what routing for queues
bus.put({exchange: '/bustestget', routingKey: "TEST"}, {message: "TEST get"});
```

Connect to an AMQP server and get a message from a queue.

```javascript

var bus = require('kibo-bus');

var bus = new Bus({rabbit_url: 'amqp://guest:guest@localhost:5672'});

// exchange is a "route" for want of a better term, it controls what routing for queues
// the get will timeout after the value specified and return an async error.
bus.get({routingKey: 'TEST', exchange: '/bustestget', queue: '/queue/sometestget', timeout: 2000}, function (err, data) {
   console.log('err', err, 'data', data);
});
```
