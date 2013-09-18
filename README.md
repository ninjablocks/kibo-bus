# kibo-bus

This component is specifically designed to separate the bus from the
dojo/cloud services.

# Objectives

So the goal of this library is to separate people using the bus from the actual protocol / system / service used to provide it.

Messaging can be quite complicated, especially in the case of AMQP so I would like to reduce the surface area of the API
just to the bits we need while ensuring these smaller bits are FAST and reliable.

# Usage

To connect and open a stream which subscribes or publishes to a topic.

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
