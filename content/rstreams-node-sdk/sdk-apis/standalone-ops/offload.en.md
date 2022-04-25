---
title: "Offload"
date: 2018-12-29T11:02:05+06:00
weight: 3
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

API docs: [async version](https://leoplatform.github.io/Nodejs/classes/index.RStreamsSdk.html#offloadEvents) | 
          [sync version](https://leoplatform.github.io/Nodejs/classes/index.RStreamsSdk.html#offload)

A standalone function, meaning one that doesn't use pipes and streams, that reads events from the specified source
 RStreams queue and then calls your transform function allowing you to do anything you want to with the data.

## When would I use this?
* You want to read from a source queue and then write it to a resource or system that isn't another RStreams queue
  
  * Write to a database
  * Send data to an API
* You want to read from a source queue and perform aggregations/analytics on data before sending to another system

## Runnable Examples
{{< notice info >}}This expects you've run the examples in the [enrich Operation](../enrich) to populate
queues with data.{{</ notice >}}
### Example 1

The first example illustrates code running as a bot with ID of `rstreams-example.offload-one-peopleplus` and getting exactly two 
events from queue `rstreams-example.peopleplus`, starting at position `z/2022/04/20`, and then simply saves each event to another 
system by calling that system's API.  The endpoint here is a free, public API that lets you mock out the response
and just throws away your request, but works for our purposes.

Two things to note here.  First is that the transform function is typed for both the callback
and async variety but please only use the async version going forward - all new features
are only being added to the async approach.

Second, there are actually three arguments to the `transform` function, even though in our example we 
are only using the first.  What is stored in an RStreams queue is an instance of a
 [ReadEvent](https://leoplatform.github.io/Nodejs/interfaces/lib_types.ReadEvent.html) where the `payload` attribute is the data the queue exists for. 
The first argument is just the payload pulled out since usually that's all you need.  The second argument
is the full event from the queue with the event ID and other sometimes useful things.  The third argument
is only used in the callback version where you call `done` exactly once to trigger the callback.  It's there
for backwared compat.  Don't use it on new things.

{{< collapse "Returning from an offload async transform function" >}}
* throw Error  
  If you throw an error at anytime the pipe will error out and your upstream queue will not be checkpointed
* `return true`  
  This tells the SDK to checkpoint for me in the upstream queue read from.  If we're not batching, then
  this checkpoints the one event.  If we're batching, this checkpoints up to the final event in the batch
* `return false`  
  This tells the SDK **not** to checkpoint this event in the upstream queue read from
{{</ collapse >}}

{{< collapse-light "Example 1 code" >}}
```typescript {linenos=inline,anchorlinenos=true,lineanchors=enrichex1}
import { OffloadOptions,  RStreamsSdk } from "leo-sdk";
import { Person } from "../lib/types";
import axios, { AxiosResponse } from "axios";

async function main() {
  const rsdk: RStreamsSdk  = new RStreamsSdk();
  const opts: OffloadOptions<Person>  = {
    id: 'rstreams-example.offload-one-peopleplus',
    inQueue: 'rstreams-example.people',
    start: 'z/2022/04/20',
    limit: 2,
    transform: async (person: Person) => {
        await savePerson(person);
        return true;        
    }
  };

  await rsdk.offloadEvents<Person>(opts);
}

interface PostResponse {
    success: boolean;
}

/**
 * @param person Save the person to another system.
 */
async function savePerson(person: Person): Promise<void> {
  const url = `https://run.mocky.io/v3/83997150-ab13-43da-9fb9-66051ba06c10?mocky-delay=500ms`;    
  const {data, status}: AxiosResponse<PostResponse, any> = await axios.post<PostResponse>(url, person);
  if (status !== 200 || !data || data.success !== true) {
    throw new Error('Saving person to external system failed');
  }
}

(async () => {
  await main();
})()
```
{{</ collapse-light >}}

Note: [Person types referenced in the examples](../../#person-types-referenced-in-the-examples)

### Example 2
This example is nearly identical to Example 1 above except that this time we are are going to
use config to tell the SDK to batch up events for us so we can be more efficient.  The calls out 
to a public API to save the event elsewhere are intentionally delayed by 500ms each, a not uncommon
API latency.  So, we're at risk of not being able to read and offload events from the upstream queue fast enough to keep
up if events are slamming into that upstream queue super fast.

So, we're going to ask the SDK to micro-batch up events 10 at a time and then invoke our
`transform` function with all ten at once and if it's waited more than one second for 10 
to show up then our config tells the SDK to just go ahead and invoke `transform` with whatever it's 
got so far. Then in the offload transform function we're going to modify our `savePerson` function to make 
concurrent POST API calls for each person we are saving, parallelizing the work and making it much 
faster so we can keep up.  To make the example more interesting, we set `limit` now to 100 so we
get a lot more events before we stop reading from the upstream queue.  The config that is inherited from the
[ReadOptions](https://leoplatform.github.io/Nodejs/interfaces/index.ReadOptions.html) is
important for specifying how long we're meant to read from the upstream queue before we stop
reading and close down shop.  If you're running in a lambda function, you've only got 15 min
before AWS shuts down your lambda and that may sound like a long time unless you are reading from a queue
that is forever getting new events shoved into it, a pretty common case.  By default, if you don't set any
config to tell the SDK when to stop reading from the upstream queue, the SDK will read for up to 80% of the
total time remaining for your lambda, if you are in fact running as a lambda.  That then saves 20% of the time
for you to finish processing.

You'll notice that because we used the `OffloadBatchOptions` to batch things up that the `transform`
function arguments change.  That's because the SDK isn't invoking `transform` with just one object
but with the batch: an array of objects.

The first argument is just the array of events direct from the upstream queue.  The second arg
is an event wrapper around the whole array of events directly from the upstream queue - not
really needed except in rare use cases.  The third argument is for backward compatability
when using the `offload` as a callback instead of using async.  Please only use async going forward
and so you don't need the third arg.

When we're done offloading the events, we simply return true telling the SDK to checkpoint for us in the
upstream queue.  See 
[Returning from an offload async transform function](#returning-from-an-offload-async-transform-function) above for 
more details.

Note: [Person types referenced in the examples](../../#person-types-referenced-in-the-examples)

{{< collapse-light "Example 2 code" >}}
```typescript {linenos=inline,anchorlinenos=true,lineanchors=enrichex2}
import { OffloadBatchOptions, ReadEvent, RStreamsSdk } from "leo-sdk";
import { Person } from "../lib/types";
import axios, { AxiosResponse } from "axios";

async function main() {
  const rsdk: RStreamsSdk  = new RStreamsSdk();
  const opts: OffloadBatchOptions<Person>  = {
    id: 'rstreams-example.offload-one-peopleplus',
    inQueue: 'rstreams-example.people',
    batch: {
        count: 10,
        time: 1000
    },
    start: 'z/2022/04/20',
    limit: 2,
    transform: async (people: ReadEvent<Person>[]) => {
        await savePeople(people);
        return true;        
    }
  };

  await rsdk.offloadEvents<Person>(opts);
}

interface PostResponse {success: boolean;}
interface PostResponseStatus extends PostResponse {status: number} ;

/**
 * @param person Save the person to another system.
 */
async function savePeople(people: ReadEvent<Person>[]): Promise<void> {
  const url = `https://run.mocky.io/v3/83997150-ab13-43da-9fb9-66051ba06c10?mocky-delay=500ms`;    

  const responses: PostResponseStatus[] = (await Promise.all(
    people.map((person) => axios.post<PostResponse>(url, person.payload)))).map((obj) => {
      return {status: obj.status, success: obj.data ? obj.data.success : false};
    });

  responses.forEach((resp) => {
    if (resp.status !== 200 || resp.success !== true) {
      throw new Error('Saving person to external system failed');
    }
  });
}

(async () => {
  await main();
})()



```
{{</ collapse-light >}}
