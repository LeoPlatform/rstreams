---
title: "Fundamentals"
date: "2022-05-19T16:20:15.764Z"
description: "Fundamental concepts."
draft: false
weight: 2
version:
  current: "1.0"
  all:
    - version: "1.0"
      date: "2022-05-19T16:20:15.764Z"
  _render:
    fileName: "fundamentals"
    language: "en"
---
{{< collapse-light "ToC" >}}
{{< toc  >}}
{{</ collapse-light >}}

### Event
All data that is sent to an RStreams queue is an [event](https://leoplatform.github.io/Nodejs/interfaces/lib_types.BaseEvent.html).
Each event exists to wrap the data contained in the `payload` attribute.  Queues hold events of a consistent type, such as 
all Employee objects or all Change Order request objects for example.

### Queue
RStreams is factored around queues.  A queue is a named set of events in time sequence order, ordered by their event ID.
An event in a queue is persisted by virtue of being in a queue.  Bots register themselves to be invoked when events arrive in a queue.
Bots read data from queues and send new data to other queues.

### The Bus
A term used to mean a single instance of RStreams with its associated queues and the bots that react to and populate them.

### Bot
A bot as a logical wrapper around a unit of work that will read data from an RStreams queue or write data to an RStreams
queue or both.  Bots may be registered to be invoked when new events show up in a given queue.  Bots may be scheduled
to run periodically using standard cron syntax.

### Event ID
Every event in a queue has an event ID, which uniquely identifies it in the queue.  The event ID is also its position
in the queue because event IDs are actually a form of date/time (UTC) value.
Here's one: `z/2021/06/14/17/19/1623691151425-0000013`

* **z/** : all event IDs start with this to identify them as event IDs
* **2021** : the year of the event
* **06** : the month of the event
* **14** : the day of the event
* **17** : the hour of the event
* **19** : the minute of the event
* **1623691151425** : the millisecond of the event
* **0000013** : the sequence number in that millisecond, so this is the 13 event in this one millisecond that came into the queue

### Pipe
A function that takes as its arguments a set of stream steps where the pipe begins with a source stream that produces data to
seed the pipe with, an optional set of transform streams that take in data, do something with it and send it to the next stream
in the pipe and the sink stream that ends the pipe.

### Pipe Stream Step
A single stream in a pipe.  It's called a step because each stream in a pipe receives data from the previous step in the pipe and
sends data to the next step in the pipe.

### Stream
A set of RStreams queues and bots that chain together to create a directed graph of moving data with upstream queues 
visualized as the sources that initially receive events, think leftmost if visualizing, and downstream queues getting
data from the previous stream step, think rightmost if visualizing.

### Checkpoint
A checkpoint is a saved position in a stream.  The Node SDK maintains the read checkpoint for all bots that read from a given
queue.  The Node SDK maintains a write checkpoing for all bots that write to a given queue.  When a bot is restarted and
starts reading from a queue, it will by default begin reading from its checkpoint (think position) in the queue.

### Event source timestamp
Every [event](https://leoplatform.github.io/Nodejs/interfaces/lib_types.BaseEvent.html)
that hits a queue came from somewhere originally.  Initially, perhaps it was loaded into a queue
from a database.  Then, a bot read from the queue and let's say transformed the event and put 
it in another queue.  We want all derived events to reference when the source event that led to the derived
events was put into and RStreams queue so we can track overall transit times for that source event.  It's a simple
idea but very important.  It requires that when engineers manually craft their own events that flow
through the bus that they simply take the effort to copy the parent event's `event_source_timestamp` 
onto their new derived event and put it in the new event's `event_source_timestamp` so the value propagates
through.

### Correlation ID
Every [event](https://leoplatform.github.io/Nodejs/interfaces/lib_types.BaseEvent.html)
that hits a queue came from somewhere originally and we want to be able to trace the movement
of an event through the various queues of the bus, knowing the parent queue and the exact event in the parent
queue that a given event was derived from.  We accomplish this by keeping track of what parent
queue/event ID an event was derived from in a bookkeeping object on the event named the `correlation_id`.  Also,
the SDK cannot checkpoint for you if your events don't have a valid `correldation_id`.

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

### Stage
One of the set of independent environments supported for deployment, e.g. production, staging, development, etc.

### System
A resource external to RStreams, such as a database, that has been registered in RStreams so it may be visualized as
botmon as a queue of data and optionally used to designate correlation information specific to that external system.

