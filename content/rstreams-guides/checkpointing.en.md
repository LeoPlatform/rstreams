---
title: "Checkpointing"
date: "2022-05-19T17:55:12.078Z"
weight: 2
draft: false
version:
  version: "1.0"
  current: "1.0"
  all:
    - version: "1.0"
      date: "2022-05-19T17:55:12.078Z"
  render:
    fileName: "checkpointing"
    language: "en"
---
{{< collapse-light "ToC" >}}
{{< toc  >}}
{{</ collapse-light >}}

# Summary
A checkpoint is a saved position in an RStreams queue.  The Node SDK maintains the read checkpoint for all bots that read from a given
queue.  The Node SDK maintains a write checkpoing for all bots that write to a given queue.  When a bot is restarted and
starts reading from a queue, it will by default begin reading from its checkpoint (think position) in the queue.

So, "to checkpoint" or the act of "checkpointing" means using the SDK to write the read or write checkpoint for a bot
for the stream it is reading from or writing to.

{{< notice info >}}Most of the time, the SDK automatically checkpoints for you and you don't need to care.  However,
you need to understand generally what it is so you don't get in trouble.{{</ notice >}}

# Checkpointing and Correlation
**IF YOU HAVE AN EVENT THAT DOESN'T INCLUDE A VALID CORRELATION_ID THEN THE SDK CANNOT CHECKPOINT FOR YOU.**

*If the above sentence is all you remember from this article, then victory is assured :)*

An event has an object called correlation_id.  Jump over to the fundamentals doc and read the 
[brief section on Correlation ID](../core-concepts/fundamentals/#correlation-id) if you haven't already.

The SDK will checkpoint for you if your event has a `correlation_id` and without it the SDK can't.  Why?  There is no magic to
how the SDK works.  The correlation information tells the SDK the source queue and exact event that an event came from and
without this it simply can't save your bot's read or write position in a queue.

# Read Checkpoints
When your bot reads an event from an RStreams queue, you are going to do something with that event and then want to read
the next event in the queue.  What if you read event A and before you process the event your bot crashes and shuts down.

When your bot restarts, you want to read event A.  The good news is that all events in RStreams queues are persisted so
no worries, your event is still there.  But, where was event A in the queue?  Each event has an ID that both uniquely
identifies that event and marks it time-based position in that queue.  So, if you know know the time of the last event
in the queue was written to that queue, you could start reading from about that position by crafting an event ID that
maybe gets you close to where you were reading.  Here's an event Id that will start reading the first event in the 
13th minute of April 13 at 5PM UTC.

`z/2022/04/13/17/13`

But, that's not great.  So, the SDK keeps track of this for you.  Here's how?

# Read Checkpointing for Offload and Enrich

When you have an operation that reads from a queue, such as [offload](../rstreams-node-sdk/sdk-apis/standalone-ops/offload) or
[enrich](../rstreams-node-sdk/sdk-apis/standalone-ops/offload), the SDK will checkpoint events read from the source queue
when events flow out of the sink step that is hidden within these operations.  In the case of `offload`, that's when the
offload function returns.  In the cae of `enrich`, it's when an event is written to the destination queue.

Here's exactly what "checkpoint events" means.  It means that periodically, it will send an update back to the `RStreams Bus`
to have it save this bot's read position in the queue the bot is reading data from using the `correlation_id` of events
that have flowed into the `offload` and the function has returned without error and in the case of `enrich` for the events
that have been successfully written to the destination queue.

So, each time your bot starts up it will automatically call out to the `RStreams Bus` and ask for this bot's current read position,
the checkpoint, in the given queue it's reading from and will continue pulling events from that position forward in time through
the queue.

# Read Checkpointing for a Pipe
If your last pipe stream step, your sink, writes to a queue using a `load` stream, then periodically as the SDK writes the
events to the desination queue it will also updatethis bot's checkpoint in the queue that you read from in your source stream.

# Read Checkpoint Examples

## Example 1
Here we are creating a source stream that goes out and gets data not yet in a queue of the `RStreams Bus`and we
write it to the RStreams queue named `my-destination-queue` acting as a bot named `my-cool-bot`.
The SDK will not checkpoint what you are reading from since your source isn't an RStreams queue.
*May sound obvious but just need to do a gut check that folks are getting it.*

{{< collapse-light "Example 1 code" true >}}
```typescript {linenos=inline,anchorlinenos=true,lineanchors=ex1}
import { RStreamsSdk } from "leo-sdk";

async function main() {
  const rsdk: RStreamsSdk  = new RStreamsSdk();

  await rsdk.streams.pipeAsync(
    rsdk.createSource(async () => {
        // Call out to a database to feed data into the pipe
    }, opts, state),
    rsdk.load('my-cool-bot', 'my-destination-queue')
  );
}
```
{{</ collapse-light >}}

## Example 2
Here we are reading events as a bot named `my-cool-bot` and writing them to another system, in this case some database
external to RStreams.  Notice that on line 12 we return true after saving the event to the database.  This tells the
SDK that processing was successful and that we should checkpoint the position of this event for the `my-cool-bot`
in the `my-source-queue` queue.

{{< collapse-light "Example 2 code" true >}}
```typescript {linenos=inline,anchorlinenos=true,lineanchors=ex2}
import { RStreamsSdk } from "leo-sdk";

async function main() {
  const rsdk: RStreamsSdk  = new RStreamsSdk();
  const opts: OffloadOptions<Person>  = {
    id: 'my-cool-bot',
    inQueue: 'my-source-queue',
    start: 'z/2022/04/20',
    limit: 2,
    transform: async (person: Person) => {
        // Save the person to a database
        return true;        
    }
  };

  await rsdk.offloadEvents<Person>(opts);
}
```
{{</ collapse-light >}}

## Example 3
Here we are reading events as a bot named `my-cool-bot` from a queue named `my-source-queue`, translating them from a `PersonRaw` to 
a `Person` object and then writing them a queue named `my-dest-queue`.  You'll notice that on line 15 we are returning the newly
translated person to be sent to the `my-dest-queue` queue.  The SDK will checkpoint the original event from `my-source-queue`
for you after it's sure that the derived event that you returned from the `transform` function was successfully written
to the `my-dest-queue` queue.

Let's say that you wanted to skip one person event and not write it to the dest queue but you still wanted to checkpoint the
source event from the souce queue?  Well, in that case you'd just do this for that one event `return true;` which tells the SDK
not to send an event to the destination but to go ahead and checkpoint in the source queue that the bot handled the event.

{{< collapse-light "Example 3 code" true >}}
```typescript {linenos=inline,anchorlinenos=true,lineanchors=ex3}
import { EnrichOptions,  RStreamsSdk } from "leo-sdk";

async function main() {
  const rsdk: RStreamsSdk  = new RStreamsSdk();
  const opts: EnrichOptions<PersonRaw, Person>  = {
    id: 'my-cool-bot',
    inQueue: 'my-source-queue',
    outQueue: 'my-dest-queue',
    start: 'z/2022/04/20',
    config: {
      limit: 2
    },
    transform: async (person: PersonRaw) => {
      const p: Person = translate(person);
      return p;
    }
  };

  await rsdk.enrichEvents<PersonRaw, Person>(opts);
}
```
{{</ collapse-light >}}

## Example 4
Here we are reading events from queue `my-source-queue` as a bot named `my-cool-bot` and then
transforming the event from a `PersonRaw` to a `Person` object and then sending the new `Person`
object to the queue named `my-dest-queue` doing so as a bot named `my-cool-bot`.

The SDK will checkpoint that we've read and handled the event in `my-source-queue` for us only after it's sure
that the new derived event has been written to `my-dest-queue`.  That's why it is so important that derived
events have the correct [correlation_id](../../rstreams-guides/core-concepts/fundamentals/#correlation-id)
correlation bookkeeping information.  The SDK uses that in derived events to know what source event
correlates to the new event so it can checkpoint for us.

{{< collapse-light "Example 4 code" true >}}
```typescript {linenos=inline,anchorlinenos=true,lineanchors=ex4}
import { BaseEvent, ReadEvent, RStreamsSdk } from "leo-sdk";
import { PersonRaw, Person } from '../lib/types';

async function main() {
  const rsdk: RStreamsSdk  = new RStreamsSdk();
  const botId = 'rstreams-example.people-to-peopleplusandus';

  await rsdk.streams.pipeAsync(
    rsdk.read<PersonRaw>('my-cool-bot', 'my-source-queue'),
    rsdk.throughAsync<ReadEvent<PersonRaw>, BaseEvent<Person>>((event) => {
      const result: BaseEvent<Person> = {
        payload: translate(event.payload),
        event_source_timestamp: event.event_source_timestamp,
        correlation_id: rsdk.streams.createCorrelation(event)
      };

      return result;
    }),
    rsdk.load('my-cool-bot', 'my-dest-queue', {force: true})
  );
}
```
{{</ collapse-light >}}