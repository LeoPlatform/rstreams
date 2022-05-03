---
title: "Fundamentals"
date: 2022-04-04T11:02:05+06:00
description: "Fundamental concepts."
draft: false
weight: 2
---

### Events

#### Event ID
TODO

#### Pipe
TODO

#### Pipe Stream Step
TODO

#### Stream
Pipe Step or Bots/Queues.
TODO

#### Checkpoint
Writing last read event ID back to queue.
TODO

#### Event source timestamp
Every [event](https://leoplatform.github.io/Nodejs/interfaces/lib_types.BaseEvent.html)
that hits a queue came from somewhere originally.  Initially, perhaps it was loaded into a queue
from a database.  Then, a bot read from the queue and let's say transformed the event and put 
it in another queue.  We want all derived events to reference when the source event that led to the derived
events was put into and RStreams queue so we can track overall transit times for that source event.  It's a simple
idea but very important.  It requires that when engineers manually craft their own events that flow
through the bus that they simply take the effort to copy the parent event's `event_source_timestamp` 
onto their new derived event and put it in the new event's `event_source_timestamp` so the value propagates
through.

#### Started timestamp (bot)
TODO

#### Ended timestamp (bot)
TODO

#### Correlation ID
Every [event](https://leoplatform.github.io/Nodejs/interfaces/lib_types.BaseEvent.html)
that hits a queue came from somewhere originally and we want to be able to trace the movement
of an event through the various queues of the bus, knowing the parent queue and the exact event in the parent
queue that a given event was derived from.  We accomplish this by keeping track of what parent
queue/event ID an event was derived from in a bookkeeping object on the event named the `correlation_id`.

This is so important that when developers need to craft an
 [event](https://leoplatform.github.io/Nodejs/interfaces/lib_types.BaseEvent.html) by hand that they should simply use the 
[rsdk.streams.createCorrelation](https://leoplatform.github.io/Nodejs/modules/index.StreamUtil.html#createCorrelation)
helper API from the SDK to create this object for them by passing in the parent event to the `createCorrelation`
API as they are building a new derived event.

The helper API is useful because in the case where a bot turns N upstream events into 1 downstream event, 
perhaps aggregating or reducing data, there isn't one parent event a single event was derived from but there are
N events.  Let's say that we have a [through](../../../rstreams-node-sdk/sdk-apis/transform-streams/through) pipe step
that aggregates every 10 parent queue events into 1 new event.  Well, then in that case the `correlation_id` object
will need to include the parent queue's event ID of the first event of the ten and the last event ID of the ten that this
one new event derived from.  

Here's an example object that might represent those ten.

```typescript {linenos=inline,anchorlinenos=true,lineanchors=evtsourcetm}
{
  source: 'rstreams-example.people',
  start: 'z/2022/04/20/00/50/1650415834886-0000002',
  end: 'z/2022/04/20/00/50/1650415834886-00000012',
  units: 10
}
```

* **source**: the upstream queue this event derived from
* **start**: the event ID of the starting event that this event derived from
* **end**: if present and if different than `start` then this it's the event ID of the last event that this event
derived from in the upstream queue and if different than `start` it means that this one event was derived from 
the number of events between `start` and `end`
* **units**: the number of parent queue events this one event was derived from

 Note that when an event was derived from an external system, say a database, that has been setup as a [System](#system)
 in RStreams that this bookkeeping may point to the database table as the source as the start/end may be where in the
 database it came from.

#### Units (bot)
TODO

#### Checkpoint
TODO

#### System
TODO

