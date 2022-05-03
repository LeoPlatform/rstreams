---
title: "SDK APIs"
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

{{< notice info >}}A note on typescript types in pipe stream steps.  Great effort was made so that pipe steps
can infer types based on what's been defined in previous pipe steps.  Follow the examples closely
to understand the minimum types necessary to keep `unknown` types from cropping up.{{</ notice >}}

{{< collapse-light "Person types referenced in the examples" >}}
```typescript {linenos=inline}
export interface Person {
    gender: string;
    firstName: string;
    lastName: string;
    email: string;
    birthDate: string;
    nationality: string;
    addr: {
        addr1: string;
        city: string;
        state: string;
        country: string;
        countryCode?: string;
        postcode: number;
        longitude: string;
        latitude: string;
        tzOffset: string;
        tzDesc: string;
    }
}

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

# Overview
The RStreams Node SDK includes a simple utility function to create to create pipes and nearly every kind of stream
you'd need to work with massive amounts of continuously generated data in an instance of the RStreams bus.  It
also includes functions to allow you to skip the complexity of dealing with pipes and streams at all for the
most common use cases: getting data from the bus and sending data to the bus.

# Standalone Operations
These powerful standalone operations, meaning without needing to use pipes and streams, do some heavy lifting for you to 
hide all the complexity of sending events to and getting events from the RStreams bus.

[put Operation](./standalone-ops/put)
: A function that lets you write a single event to the specified RStreams queue

[enrich Operation](./standalone-ops/enrich)
: A function that reads from the specified source RStreams queue, lets you transform the events and then sends the 
modified events to the specified destination RStreams queue

[offload Operation](./standalone-ops/offload)
: A function that reads from the specified RStreams queue and lets you do something with the events retrieved, perhaps save them in a DB

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
