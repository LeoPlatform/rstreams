---
title: "Put"
date: 2018-12-29T11:02:05+06:00
weight: 1
draft: false
---

{{< collapse-light "ToC" >}}
{{< toc  >}}
{{</ collapse-light >}}

{{< notice info >}}You need to understand what a [pipe and stream step in that pipe](../../streams-primer) is AND 
nothing comes for free.  The cost of working with large amounts of data in near real-time environments
with RStreams is you have to think about what you are doing and what it means with respect to
reading and writing.  It is strongly recommended you read the [Read/Write at Scale](../../read-write-scale) 
article at some point.{{</ notice >}}

[API Doc](https://leoplatform.github.io/Nodejs/classes/index.RStreamsSdk.html#putEvent)

A stand-alone function, meaning one that doesn't use pipes and streams, that reads events from the specified source RStreams
queue and then calls your transform function allowing you to do anything you want to with the data.

## When would I use this?
* You're in an app and want to send a single event to an RStreams queue on a very infrequent basis
* You've got a pipe that does something and you want to enhance it, as the side effect of a given
  stream step function, to send events to another RStreams queue

## Runnable Examples

### Example 1: Write a Single Object to the Bus

The first example is a naive example that sends data to an RStreams queue one at a time.  The code makes a call out to a free
API that returns random people, gets a single person back and then on line 6 uses `putEvent` to send that person to the 
`rstreams-example.people` queue, doing so as a bot with ID of `rstreams-example.load-people`.

{{< notice info >}}
Note that the transform function is typed for both the callback
and async variety but please only use the async version going forward - all new features
are only being added to the async approach.
{{</ notice >}}

{{< collapse-light "Example 1 code" >}}
```typescript {linenos=inline,anchorlinenos=true,lineanchors=putex1}
import { ConfigurationResources, RStreamsSdk } from "leo-sdk";
import { PersonRaw, PersonRawResults } from "../lib/types";
import axios from "axios";

async function main() {
  const rsdk: RStreamsSdk  = new RStreamsSdk();
  const person = await getRandomPerson();
  await rsdk.putEvent('rstreams-example.load-people', 'rstreams-example.people', person);
}

async function getRandomPerson(): Promise<PersonRaw> {
  const NUM_EVENTS = 1;
  const url = `https://randomuser.me/api/?results=${NUM_EVENTS}&exc=login,registered,phone,cell,picture,id&noinfo`;
  const {data, status} = await axios.get<PersonRawResults>(url);
  
  if (status !== 200) {
    throw new Error('Unable to get randomPeople from https://randomuser.me API: ' + status);
  }
  
  console.log('Person: ' + data.results[0].name.first + ' ' + data.results[0].name.last);

  return data.results[0];
}

(async () => {
  await main();
})()
```
{{</ collapse-light >}}

Note: [Person types referenced in the examples](../../#person-types-referenced-in-the-examples)

#### View results in Botmon
If you go to Botmon, you will see that the `rstreams-example.people` queue now has an event in it.
{{< collapse "Expand for Botmon screenshots" >}}

1. Go to Botmon and search for `rstreams-example.people` in the search field
![Botmon Find Person](../../../images/botmon-find-person-queue.png  "40%" )

1. Botmon now shows a visual representation of the bot and the queue, click on the gear icon after hovering over the queue and then click on Events
![Botmon People Queue](../../../images/rstreams-example-people-queue1.png "30%" )

1. Botmon now shows the events loaded into the queue
![Botmon People Queue Events](../../../images/botmon-example-person-queue1.png "70%" )

{{</ collapse >}}

### Example 2: Write multiple objects to the bus (slow performance)
{{< notice info >}}This is an example of what not to do.  When you want to write many events to an RStreams queue, use
the  [Load Stream](../../sink-streams/load) pipe step.{{</ notice >}}

So, instead of reading one person from the public API we used in the example above, let's say we get 100 people at a time
from the public API and we want to write them to the bus.

The only difference in this example is that we pass in 100 to the public API, getting back 100 objects as
an array.  We then loop through them, making a connection to the RStreams Bus for each and every event.
It's simple and it works but this is **bad**.  The `putEvent` API is really only meant to be called infrequently for one or maybe a
handful of events.  To understand why, consider what the RStreams SDK is doing when you call `putEvent`.

1. It's opening a connection to AWS Kinesis
1. It sending the single event on that connection each time to Kinesis (the Kinesis connection will be closed automatically when no longer needed)
1. The event flows through Kinesis until an RStreams Kinesis processor reads the single event and writes it to
the RStreams Dynamo DB queue table, putting the event in the correct queue

RStreams is designed to handle the continuos generation of data events that flow into a given queue, is read from
that queue and mutated and then sent to other queues.  It is today doing this with very large amounts of 
concurrently received events and has optimizations for sending lots of data.
The [Load Stream](../../sink-streams/load) pipe step is a much better way to send large amounts of data
to the bus, meaning to an RStreams queue.

Note: [Person types referenced in the examples](../../#person-types-referenced-in-the-examples)

{{< collapse-light "Example 2 code" >}}
```typescript {linenos=inline,anchorlinenos=true,lineanchors=enrichex2}
import { ConfigurationResources, RStreamsSdk } from "leo-sdk";
import { PersonRawResults } from "../lib/types";
import axios from "axios";

async function main() {
  const rsdk: RStreamsSdk  = new RStreamsSdk();
  const people = await getRandomPeople();

  //HINT: this will have very bad performance. This is just to illustrate a point.
  //      Don't use putEvent in a loop this way in practice, instead use sdk.load!
  for (const person of people.results) {
    await rsdk.putEvent('rstreams-example.load-people', 'rstreams-example.people', person);
  }
}

async function getRandomPeople(): Promise<PersonRawResults> {
  const NUM_EVENTS = 100;
  const url = `https://randomuser.me/api/?results=${NUM_EVENTS}&` + 
              `exc=login,registered,phone,cell,picture,id&noinfo`;
  const {data, status} = await axios.get<PersonRawResults>(url);
  
  if (status !== 200) {
    throw new Error('Unable to get randomPeople from https://randomuser.me API: ' + status);
  }
  
  console.log('Person: ' + data.results[0].name.first + ' ' + data.results[0].name.last);

  return data;
}

(async () => {
  await main();
})()
```
{{</ collapse-light >}}