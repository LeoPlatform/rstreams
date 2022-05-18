---
title: "SDK APIs"
date: "2022-05-18T18:19:42.651Z"
weight: 3
draft: false
version: "1.0"
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
The RStreams Node SDK includes a simple utility function to create pipes and nearly every kind of stream
you will need to handle the massive amounts of continuously generated data in an instance of the RStreams bus.  The RStreams Node SDK
also includes functions that allow you to send and retrieve data to and from the RStreams Bus without dealing with pipes or streams.

# Standalone Operations
RStreams Node SDK functions that allow you to send and receive events to and from the RStreams bus without the need to
implement pipes and streams.

[put Operation](./standalone-ops/put)
: A function that lets you write a single event to the specified RStreams queue

[enrich Operation](./standalone-ops/enrich)
: A function that reads from the specified source RStreams queue, lets you transform the events and then sends the 
modified events to the specified destination RStreams queue

[offload Operation](./standalone-ops/offload)
: A function that reads from the specified RStreams queue and lets you do something with the events retrieved, perhaps save them in a DB

# Source Stream Functions
These functions create a source stream for you, acting as the first stream in a pipe.  Each source stream feeds a pipe with data that 
you specify, allowing it to flow through to the next stream step in your pipe.

[Read Function](./source-streams/read)
: A function that creates a source stream that gets events from the specified queue and feeds them into the pipe.

[Create Source Function](./source-streams/createsource)
: A function that creates a source stream that gets events from the specified queue and feeds them into the pipe.

# Transform Stream Functions
RStreams Node SDK functions that create a transform stream for you, acting as a pipe step sitting between a source and sink.  Each transform
stream feeds accepts data from the previous pipe stream step, does something with it and then sends the resulting data
on to the next pipe stream step.

[Stringify Function](./transform-streams/stringify)
: A function that creates a transform stream that takes in an upstream event, turns it into a string and tacks on a newline
character to help in creating [JSON lines files](https://jsonlines.org/)

[Through Function](./transform-streams/through)
: A function that creates a transform stream that takes in un upstream event and allows the developer to modiy/enrich/aggregate/reduce
events and then send them on to the next stream step in the pipe

[ToCSV Function](./transform-streams/tocsv)
: A function that creates a transform stream that helps build a csv file by taking each upstream event that comes in and
formatting it as a line to put in a CSV file which it outputs to the next pipe stream step

# Sink Stream Functions
RStreams Node SDK functions that create a sink for you, the last step in a pipe.

[Load Function](./sink-streams/load)
: A function that creates a sink that takes in an upstream event and pushes it to an RStreams queue on the bus

[Devnull Function](./sink-streams/devnull)
: A function that creates a sink stream that takes in un upstream event and does absolutely nothing with it,
except log it if you ask it to