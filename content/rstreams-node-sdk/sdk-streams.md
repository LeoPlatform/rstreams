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

## enrichEvent
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
**Example 1**

The first example illustrates code running as a bot with ID of `xxx` and getting exactly two events
from queue `rstreams-example.people`, starting at position `z/2022/04/20`, and then transforms each
event's JSON by dropping unwanted attributes and simplifying the JSON structure.  It also calls a totally free, public API that given a country name returns the standard two-char code which we tack on to the event after
which we call the `done` function for each event which tells the SDK to push them to the
`rstreams-example.people-to-peopleplus` queue.

Note that what is stored in an RStreams queue is an instance of a [ReadEvent](https://leoplatform.github.io/Nodejs/interfaces/lib_types.ReadEvent.html) where the `payload` attribute is the data the queue exists for. Thus the
`transform`'s second argument is the complete event from the RStreams queue and that the
first argument is the payload attribute extracted from the queue event for convenience.

* `done(new Error('some err))` means don't checkpoint this event and error out
* `done(null, <object>)` means it worked, checkpoint in the source queue for me and send the object
   on to the next queue
* `done(null, true)` means it worked, please checkpoint for me in the source queue but I don't 
   want to send a corresponding object on to the destination queue, skip this one

{{< collapse-light "Example 1 Code" >}}
```typescript {linenos=inline,anchorlinenos=true,lineanchors=randompeopleloop}
import { EnrichOptions, ReadEvent, RStreamsSdk } from "leo-sdk";
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
    transform: async (person: PersonRaw, event: ReadEvent<PersonRaw>, done) => {
        const p: Person = translate(person);
        await addCountryCode([p]);
        done(null, p);
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

{{< collapse-light "Example 1 translate and addCountryCode functions" >}}
```typescript {linenos=inline,anchorlinenos=true,lineanchors=randompeopleloop}
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

/**
 * @param people The people to add addr.countryCode to by calling a public API to
 *               turn a country name in a 2 digit country code (iso cca2)
 */
async function addCountryCode(people: Person[]): Promise<void> {
  const urls: string[] = people.map((el) => {
    return ``https://restcountries.com/v3.1/name/${el.addr.country}?fullText=true&fields=cca2``;
  });

  const ccs: CountryCode[] = (await Promise.all(
    urls.map((url) => axios.get(url)))).map((obj) => (obj.data[0]));
    
  people.forEach(function (person, i) {
    person.addr.countryCode = ccs[i].cca2;
  });
}

interface CountryCode {cca2: string;}
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


## offload
https://leoplatform.github.io/Nodejs/classes/index.RStreamsSdk.html#load
https://leoplatform.github.io/Nodejs/classes/index.RStreamsSdk.html#offloadEvents

A function where you specify the source queue and give it a function and your function is called 
with events from the source queue, allowing you to save them elsewhere or do other computation.

## putEvent
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
