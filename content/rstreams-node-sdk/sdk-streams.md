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

A function that asks for the source and destination queues and then reads events from the source queue
and writes to the destination queue, allowing you to insert a function in-between to transform the data
on the way or do other computation.

**When would I use this?**
* You want to read from a source queue, enrich or modify the event and send it to another queue
* You want to read from a source queue and aggregate events, perhaps reading one minute worth of event
and then writing one event to another queue that summarizes the 1 minute of source events 

**What do I need to consider when using this?**






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
