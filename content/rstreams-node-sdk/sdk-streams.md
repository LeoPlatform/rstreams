---
title: "SDK Streams"
date: 2018-12-29T11:02:05+06:00
weight: 3
draft: false
---

{{< collapse-light "ToC" >}}
{{< toc  >}}
{{</ collapse-light >}}

{{< notice info >}}You need to understand what a [pipe and stream step in that pipe](../streams-primer) is AND 
nothing comes for free.  The cost of working with large amounts of data in near real-time environments
with RStreams is you have to think about what you are doing and what it means with respect to
reading and writing.  It is strongly recommended you read the [Read/Write at Scale](../read-write-scale) 
article at some point.{{</ notice >}}

# Overview
The RStreams Node SDK includes a simple utility function to create to create pipes and nearly every kind of stream
you'd need to work with massive amounts of continuously generated data in an instance of the RStreams bus.  It
also includes functions to allow you to skip the complexity of dealing with pipes and streams at all for the
most common use cases: getting data from the bus and sending data to the bus.

# Powerful Helper Functions without Pipes
These functions do some heavy lifting for you, hiding all the complexity behind a single function that
doesn't require that you use pipes and streams at all.

## enrichEvent Operation
API docs: [async version](https://leoplatform.github.io/Nodejs/classes/index.RStreamsSdk.html#enrich) |
[callback version](https://leoplatform.github.io/Nodejs/classes/index.RStreamsSdk.html#enrichEvents)

A stand-alone function that asks for the source and destination queues and then reads events from the source queue
and writes to the destination queue, allowing you to insert a function in-between to transform the data
on the way or do other computation.

### When would I use this?
* You want to read from a source queue, enrich or modify the event and send it to another queue
* You want to read from a source queue and aggregate events, perhaps reading one minute worth of events
and then writing one event to another queue that summarizes the 1 minute of source events

### Runnable Examples
#### Example 1

The first example illustrates code running as a bot with ID of `rstreams-example.people-to-peopleplus` and getting exactly two events from queue `rstreams-example.people`, starting at position `z/2022/04/20`, and then transforms each
event's JSON by dropping unwanted attributes and simplifying the JSON structure.  It also calls a totally free, public API that given a country name returns the standard two-char country code which we tack on to the event after
which we return the modified event which tells the SDK to push it to the
`rstreams-example.people-to-peopleplus` queue.

Two things to note here.  First is that the transform function is documented for both the callback
and async variety but please only use the async version going forward - all new features
are only being added to the async approach.

Second, there are actually three arguments to the `transform` function, even though in our example we 
are only using the first.  What is stored in an RStreams queue is an instance of a [ReadEvent](https://leoplatform.github.io/Nodejs/interfaces/lib_types.ReadEvent.html) where the `payload` attribute is the data the queue exists for. 
The first argument is just the payload pulled out since usually that's all you need.  The second argument
is the full event from the queue with the event ID and other sometimes useful things.  The third argument
is only used in the callback version where you call `done` exactly once to trigger the callback.  It's there
for backwared compat.  Don't use it on new things.

{{< collapse "Returning from an aync transform function" >}}
* throw Error  
  If you throw an error at anytime the pipe will error out and your upstream queue will not be checkpointed
* return object  
  Whatever object you return that isn't of type `Error` will be treated as the event to emit
* return `Array<object>`  
  Each object in the array will be individually emitted as if you had called 
  `this.push(<object>, {partial: true}` except the very last one in the array which will act like this
  `this.push(<object>, {partial: false}`.  When you return a list of objects at once, we assume you mean
  for them to all work or none of them worked.  So, the `partial: false` means the SDK will emit this
  events to the downstream queue but not checkpoint.  Since the SDK sends the last one with
  `partial: false` the last one will both be emitted and the checkpoint updated to the event ID of
  that last event.

  If you pass an empty array, that's the same thing as if you called `return true`.
* `return true`  
  This means I don't want to emit an event with my return but I do want the SDK to checkpoint for me
  in the upstream queue
* `return false`  
  This means I don't want to emint an event with my return AND I also don't want the SDK to checkpoint for me
* `this.push`  
  You may emit events by passing them in to `this.push` if you want to.  More on this later in the 
  *Advanced use cases* section* below.
{{</ collapse >}}

{{< collapse "Details on using the callback version if you still need them" >}}
You can only call done once in your `transform` function and here's how:

* `done(new Error('some err'))` means don't checkpoint this event and error out
* `done(null, <object>)` means it worked, checkpoint in the source queue for me and send the object
   on to the next queue
* `done(null, true)` means it worked, please checkpoint for me in the source queue but I don't 
   want to send a corresponding object on to the destination queue, skip this one
{{</ collapse >}}

{{< collapse "Advanced use cases" >}}
Let's say I want to turn one event read from the upstream queue into many events in the downstream
queue.  Well, you can't return multiple times from the `transform` function.  There's another way.

If your transform function uses  `transform: function() {}` and not `transform: () => {}` to 
create your function, then the `this` variable will be of type `ProcessFunctionContext<U>` - [transform function
type](https://leoplatform.github.io/Nodejs/modules/lib_streams.html#ProcessFunction) and 
[ProcessFunctionContext](https://leoplatform.github.io/Nodejs/modules/lib_streams.html#ProcessFunction)
types.  Then you may call `this.push` as many times as you want to push events downstream that the SDK
will pick up and send to the destination queue.  Then, when you're done, simply return true telling the
SDK to checkpoint the upstream event now that you're done.

We need to talk more about checkpointing.  In the `enrich` operation the SDK assumes that for each event you 
consume from an upstream queue you will generate one event to send to the downstream queue.  So, each time
you call `this.push` from the `transform` function the SDK checkpoints the upstream event, marking
that this bot has gone past that event in the upstream queue. Well, if you are turning one upstream
event into multiple downstream events, you are going to call `this.push` multiple times to emit your many
events and you don't want to checkpoint the one upstream event until you've generated all the downstream events.
You do this by calling the push method with the first arg as the event to emit and the [second arg options](https://leoplatform.github.io/Nodejs/interfaces/lib_streams.ProcessFunctionOptions.html) `partial` set to true indicating that
this event is one of many being emitted and it will send the `partial` event to the downstream queue
but it won't checkpoint.  Then, when you're done you simply  `return true;` and
it will checkpoint the event in the upstream queue.

See TypeScript [this param typing](https://www.logicbig.com/tutorials/misc/typescript/function-this-parameter.html).

{{</ collapse >}}

{{< collapse-light "Example 1 Code" >}}
```typescript {linenos=inline,anchorlinenos=true,lineanchors=enrichex1}
import { EnrichOptions, RStreamsSdk } from "leo-sdk";
import { Person, PersonRaw } from "../lib/types";
import axios from "axios";

async function main() {
  const rsdk: RStreamsSdk  = new RStreamsSdk();
  const opts: EnrichOptions<PersonRaw, Person>  = {
    id: 'rstreams-example.people-to-peopleplus',
    inQueue: 'rstreams-example.people',
    outQueue: 'rstreams-example.peopleplus',
    start: 'z/2022/04/20',
    config: {
      limit: 2
    },
    transform: async (person: PersonRaw) => {
      const p: Person = translate(person);
      await addCountryCode(p);
      return p;
    }
  };

  await rsdk.enrichEvents<PersonRaw, Person>(opts);
}

// See next expand section for translate and addCountryCode functions

(async () => {
  await main();
})()
```
{{</ collapse-light >}}

{{< collapse-light "Example 1 addCountryCode and translate functions" >}}
```typescript {linenos=inline,anchorlinenos=true,lineanchors=enrichex1addcountry}
interface CountryCode {cca2: string;}

/**
 * @param person The person to add addr.countryCode to by calling a public API to
 *               turn a country name in a 2 digit country code (iso cca2)
 */
async function addCountryCode(person: Person): Promise<void> {
  const url = `https://restcountries.com/v3.1/name/${person.addr.country}?fullText=true&fields=cca2`;    
  const cc: CountryCode = await axios.get(url);
  person.addr.countryCode = cc.cca2;
}

/**
 * @param p The type from the public API we want to modify
 * @returns The new type that is flatter and gets rid of some attributes don't need
 */
/**
 * @param p The type from the public API we want to modify
 * @returns The new type that is flatter and gets rid of some attributes don't need
 */
function translate(p: PersonRaw): Person {
  return {
    gender: p.gender,
    firstName: p.name.first,
    lastName: p.name.last,
    email: p.email,
    birthDate: p.dob.date,
    nationality: p.nat,
    addr: {
      addr1: p.location.street.number + ' ' + p.location.street.name,
      city: p.location.city, 
      state: p.location.state,
      country: p.location.country,
      postcode: p.location.postcode,
      longitude: p.location.coordinates.longitude,
      latitude: p.location.coordinates.latitude,
      tzOffset: p.location.timezone.offset,
      tzDesc: p.location.timezone.description
    }
  }
}
```
{{</ collapse-light >}}

{{< collapse-light "PersonRaw & PersonRawResults interfaces referenced in the examples" >}}
```typescript {linenos=inline}
export interface PersonRaw {
    gender: string;
    name: {
        title: string;
        first: string;
        last: string;
    }
    location: {
        street: {
            number: number;
            name: string;
        }
        city: string;
        state: string;
        country: string;
        postcode: number;
        coordinates: {
            longitude: string;
            latitude: string;
        }
        timezone: {
            offset: string;
            description: string;
        }
    }
    email: string;
    dob: {
        date: string;
        age: number;
    }
    nat: string;
}

export interface PersonRawResults {
    results: PersonRaw[];
}
```
{{</ collapse-light >}}

After running this for the first time, the SDK created the `restreams-exmaple.peopleplus` queue and
our bot showed up reading an event from the upstream queue and pushing it into the new queue and the
modified event appeared in the new queue.
![Pipe Readable to Writable](../images/botmon-example1-people-to-peopleplus.png "700px|center" )

![Pipe Readable to Writable Events](../images/botmon-example1-people-to-peopleplus-events.png "700px|center" )

#### Example 2
This example is nearly identical to Example 1 above except that this time we are are going to
use config to tell the SDK to batch up events for us so we can be more efficient.  The calls out 
to a public API to enrich each event with the country code based on the country name.  The free
API we are using requires a separate API request for each country.  Sure, we could try to make 
some kind of cache but there's lots of cases where you can't do this.  So, we're at risk
of not being able to read and enrich events from the upstream queue fast enough to keep
up if events are slamming into that upstream queue super fast.

So, we're going to ask the SDK to micro-batch up events 10 at a time and then invoke our
`transform` function with all ten at once and if it's waited more than one second for 10 
to show up then our config tells the SDK to just go ahead and invoke `transform` with whatever it's 
got so far. Then in the enrich function we're going to modify our `addCountryCode` function to make 
concurrent API requests for each person we are transforming, parallelizing the work and making it much 
faster so we can keep up.  To make the example more interesting, we set `config.limit` now to 100 so we
get a lot more events before we stop reading from the upstream queue.  The config in the `config` attribute is
important for specifying how long we're meant to read from the upstream queue before we stop
reading and close down shop.  If you're running in a lambda function, you've only got 15 min
before AWS shuts down your lambda and that may sound like a long time unless you are reading from a queue
that is forever getting new events shoved into it, a pretty common case.  By default, if you don't set any
config to tell the SDK when to stop reading from the upstream queue, the SDK will read for up to 80% of the
total time remaining for your lambda, if you are in fact running as a lambda.  That then saves 20% of the time
for you to finish processing.

You'll notice that because we used the `EnrichBatchOptions` to batch things up that the `transform`
function arguments change.  That's because the SDK isn't invoking `transform` with just one object
but with the batch: an array of objects.

The first argument is just the array of events direct from the upstream queue.  The second arg
is an event wrapper around the whole array of events directly from the upstream queue - not
really needed except in rare use cases.  The third argument is for backward compatability
when using the `enrich` as a callback instead of using async.  Please only use async going forward
and so you don't need the third arg.

When we're done enriching the events, we simply return the array of the new events to send them on their
way to the destination RStreams queue.  See 
[Returning from an async transform function](#returning-from-an-aync-transform-function) above for 
more details.

Note: see the code above for the `Person` and `PersonRaw` types which didn't change.

{{< collapse-light "Example 2 Code" >}}
```typescript {linenos=inline,anchorlinenos=true,lineanchors=enrichex2}
import { EnrichBatchOptions, ReadEvent, RStreamsSdk } from "leo-sdk";
import { Person, PersonRaw } from "../lib/types";
import axios from "axios";

async function main() {
  const rsdk: RStreamsSdk  = new RStreamsSdk();
  const opts: EnrichBatchOptions<PersonRaw, Person>  = {
    id: 'rstreams-example.people-to-peopleplus',
    inQueue: 'rstreams-example.people',
    outQueue: 'rstreams-example.peopleplus',
    batch: {
      count: 10,
      time: 1000
    },
    start: 'z/2022/04/20',
    config: {
      limit: 100,
    },
    transform: async (people: ReadEvent<PersonRaw>[]) => {
      const newPeople: Person[] = people.map((p) => translate(p.payload));
      await addCountryCode(newPeople);
      return newPeople;
      }
  };

  await rsdk.enrichEvents<PersonRaw, Person>(opts);
}

(async () => {
  await main();
})()
```
{{</ collapse-light >}}
{{< collapse-light "Example 2 addCountryCode and translate functions" >}}
```typescript {linenos=inline,anchorlinenos=true,lineanchors=enrichex2addcountrycode}
interface CountryCode {cca2: string;}

/**
 * @param people The people to add addr.countryCode to by calling a public API to
 *               turn a country name in a 2 digit country code (iso cca2)
 */
async function addCountryCode(people: Person[]): Promise<void> {
  const urls: string[] = people.map((el) => {
    return `https://restcountries.com/v3.1/name/${el.addr.country}?fullText=true&fields=cca2`;
  });

  const ccs: CountryCode[] = (await Promise.all(
    urls.map((url) => axios.get(url)))).map((obj) => (obj.data[0]));
    
  people.forEach(function (person, i) {
    person.addr.countryCode = ccs[i].cca2;
  });
}

/**
 * @param p The type from the public API we want to modify
 * @returns The new type that is flatter and gets rid of some attributes don't need
 */
 function translate(p: PersonRaw): Person {
    return {
        gender: p.gender,
        firstName: p.name.first,
        lastName: p.name.last,
        email: p.email,
        birthDate: p.dob.date,
        nationality: p.nat,
        addr: {
            addr1: p.location.street.number + ' ' + p.location.street.name,
            city: p.location.city, 
            state: p.location.state,
            country: p.location.country,
            postcode: p.location.postcode,
            longitude: p.location.coordinates.longitude,
            latitude: p.location.coordinates.latitude,
            tzOffset: p.location.timezone.offset,
            tzDesc: p.location.timezone.description
        }
    }
}
```
{{</ collapse-light >}}
![Pipe Readable to Writable Example 2](../images/botmon-example2-people-to-peopleplus.png "700px|center" )

## offload Operation
https://leoplatform.github.io/Nodejs/classes/index.RStreamsSdk.html#load
https://leoplatform.github.io/Nodejs/classes/index.RStreamsSdk.html#offloadEvents

A function where you specify the source queue and give it a function and your function is called 
with events from the source queue, allowing you to save them elsewhere or do other computation.

## putEvent Operation
https://leoplatform.github.io/Nodejs/classes/index.RStreamsSdk.html#put
https://leoplatform.github.io/Nodejs/classes/index.RStreamsSdk.html#putEvent

A function that asks you to specify the destination queue and then you can write a single event
to a given RStreams queue on the bus.



# Functions to Create SDK Streams
The following lists each SDK function that creates an instance of an SDK stream for you.  If you need to do 
something with a pipe and its streams, there's almost certainly a helper function to create the exact
pipe step you need with the config you need to make it work in your use case.

## checkpoint : WritableStream
TODO
A function that creates a `Writable` stream.
TODO: link to checkpointing
https://leoplatform.github.io/Nodejs/classes/index.RStreamsSdk.html#checkpoint

## read : ReadableStream

https://leoplatform.github.io/Nodejs/classes/index.RStreamsSdk.html#read

A function that lets you create a `source` stream that is backed by events you specify from an RStreams
queue, with additional config to make it flexible, intelligent and performant.

## createSource : ReadableStream
TODO

https://leoplatform.github.io/Nodejs/classes/index.RStreamsSdk.html#createSource

A function that creates a source stream that you can use to generate continuously generated, arbitrary 
content whether from a database, an API, a file or anything.

## write : TransformStream

https://leoplatform.github.io/Nodejs/classes/index.RStreamsSdk.html#write

A function that creates a pipe stream step that can sit somewhere between a `source` and `sink` stream
and write the data that passes through the stream step to an RStreams queue while still allowing the
data to pass through the step stream to the next downstream step in the pipe.  This is useful if you 
want to siphon off some data to go to a given queue mid-pipe while you also want to send it
on to do some other work.

## load : WritableStream
TODO

A function that creates a `sink` step stream that takes the data flowing through the pipe
and sends it to an RStreams queue in an intelligent manner.

https://leoplatform.github.io/Nodejs/classes/index.RStreamsSdk.html#load



# Utility Functions
