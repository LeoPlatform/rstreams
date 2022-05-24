---
title: "Streams Primer"
date: "2022-05-19T17:55:12.078Z"
weight: 2
draft: false
version:
  version: 1
  current: 1
  all:
    - version: 1
      date: "2022-05-19T17:55:12.078Z"
  render:
    fileName: "streams-primer"
    language: "en"
---

{{< collapse-light "ToC" >}}
{{< toc  >}}
{{</ collapse-light >}}

{{< notice info >}}
This primer provides exactly enough knowledge of streaming concepts for a developer to successfully 
write streaming applications using the RStreams SDK and bus.  It is not intended as an exhaustive 
treatise on the vagaries of Node streams.  We all have work to do.
{{</ notice >}}

# Overview
There truly is nothing new under the sun.  Streaming is really nothing more than Unix pipes, albeit in a more distributed manner, 
invented more than 50 years ago. The RStreams Node SDK relies on streaming data in and out just exactly as Unix pipes stream 
together commands in POSIX-based systems.   

Streaming involves creating a series of steps in a pipe where the first step, the `Source`, generates the data 
to move through the pipe.  The last step is the `Sink`, whose job it is to do something with the data moving through the pipe. 
The `Sink` is responsible for pulling data from the previous step, which causes data to flow in the pipe: no `Sink` step in the pipe means
no data flows.  In between the source step and the sink step may optionally be any number of `Transform` steps that can modify
data that flows through the pipe on its way to the sink.
![Source Tranform Sink Stream](../images/source-transform-sink.png "420px|center" )

{{< collapse-light "Care to hear why some think streams are too hard?" >}}

Streams get a bad rap.  There are some who claim learning to stream data is too hard for developers.  Most who dis on streams were
quoted some years ago, though you can still find some articles today.  The negativity was a reaction to Java and Node and C# releasing streams and their
functional programming approach, which was uber complex and often used when it shouldn't have been.

This is in large measure because streams became synonymous with functional programming in Java and C# and elsewhere.
Java’s streaming solution, which is how many got their first experience with streaming, is complicated, ill suited to streaming 
because of Java’s verbosity and feel to many developers like regular expressions: going back to one requires painstakingly decomposing
what it is doing, having to understand code that is hard to read and understand.

Node’s original streaming API was hard to understand and use and has been significantly improved over the years.  Don't worry, the RStreams 
Node SDK dramatically simplifies it for you.
![Botmon Find Person](../images/mark-struberg-tweet.png "400px|center" )


{{</ collapse-light >}}

{{< collapse-light "Care to read why streams might be worth it for you?" >}}
Why code in a series of chained steps?  Sounds complicated.  You turn to streaming when you are working with systems 
that need to process data as soon as it is received because so much data needs to flow in that you can't wait to start sending it out.

Streaming is also applicable when you need to minimize the delay in processing lots of data.  It's a great way to create a 
[reactive system](https://www.reactivemanifesto.org/), where the data that flows are events that cause distributed event
handlers to wake up and process them, movingand transforming them from one place to another.
{{</ collapse-light >}}

# Pipes and Streams
{{< notice info >}}
99% of the time, all you need to know is which RStreams SDK pipe step interface to use.
This section helps you develop the mental model of a pipe so you can do that. Actually using 
a pipe step is brain dead simple.  Don't get overwhelmed as you don't need to understand the actual functions of a 
Node `Readable` or Node `Writable` or the intracies of pipes as the SDK abstracts all that complexity for you.
Here's a [good article](https://www.freecodecamp.org/news/node-js-streams-everything-you-need-to-know-c9141306be93/#:~:text=A%20transform%20stream%20is%20basically,of%20that%20is%20the%20zlib.) if you want just a bit more detail but
you you'll be fine without it if you read the section below.
{{</ notice >}}

As mentioned, a pipe is a set of steps that data flows through in sequence.  Each step in the pipe is itself called a stream because
they are meant to read/write data sequentially one after the other.  Steps near the beginning of the pipe are upstream and the
`Sink` downstream: data flows is the furthest step downstream. The pipe exists to daisy chain the stream steps together.

Everything in a pipe must be linked together.  A pipe starts with a `Readable`(the source) ad infinitum, eventually ending with
a Writable we call the `Sink`.  Pipe step streams between the `Source`
and the `Sink` must be both a `Writable` and a `Readable` to allow the data to flow through the step: these in between steps
are often called `Through` or `Transform` stream steps.
![Pipe Readable to Writable](../images/pipe-readable-to-writable.png "700px|center" )

## Readable
In node, a pipe is a function and each argument is a step, thus a stream, in the pipe.  The first step, the `Source`, must
get or create data somehow.  It might do this by continuosly querying a database and making the data available for the next
step to grab it.  Remember that each downstream step pulls data from the step before it. In other words, the `Source` step
must be readable by the next step so it can pull data from it.  So, `Source` steps will always be of the Node type `Readable`.
For example, the `fs.createReadStream()` Node file function will create a `source` stream that reads data from a file.

***A `Readable` stream is an abstraction for a source from which data can be consumed.***

The RStreams SDK provides extremely simple `Readable` interfaces to make getting data from an RStreams bus queue a breeze.
These simplified RStreams SDK pipe steps are of the RStreams SDK type [ReadableStream](https://leoplatform.github.io/Nodejs/interfaces/lib_types.ReadableStream.html) which inherits from the Node `Readable`.

## Writeable
The last step in a pipe, the `Sink`, needs to be able to do something with the data.  In other words, it needs to
be a step we can write to such as `fs.createWriteStream()` that creates a `Sink` stream that will write the data flowing
through the pipe to a file.

***A `Writable` stream is an abstraction for a destination to which data can be written.***

The RStreams SDK provides extremely simple `Writable` interfaces to make sending data to other resources, such as a
database or Elastic Search, etc., a snap. These simplified RStreams SDK pipe steps are of the RStreams SDK type [WritableStream](https://leoplatform.github.io/Nodejs/interfaces/lib_types.WritableStream.html) which inherits from the Node `Writable`.  That's all you need to know.

## Duplex
A stream step that sits between the `Source` and the `Sink` is a `Duplex` stream.  A `Duplex` stream
is a single step that contains both a Writable and Readable stream. The input to the `Duplex` stream is a `Writable` so it can consume the data from the
`Readable`  in the step before it.  The output from the `Duplex` stream is a `Readable` so the next step downstream can pull
data from it.

***A `Duplex` stream is one that is both `Readable` and `Writeable` at the same time, e.g. a TCP socket.***

![Pipe Duplex](../images/pipe-general.png "600px|center" )

## Transform or Through

A `Transform` stream is a `Duplex` stream with a function that modifies the data or perhaps causes some other side effect 
and then sends the data downstream such as a stream that takes in a JSON object and outputs a JSON lines ready-version of that object.
A `Transform` stream is often called a `Through` stream.
 
***A `Transform` stream is a duplex stream that allows you to transform the data in between when it is written to the stream and later read from the stream.***

The RStreams SDK provides extremely simple `Transform` interfaces to make moving data through a pipe easy. These simplified RStreams SDK pipe steps are of the RStreams SDK type [TransformStream](https://leoplatform.github.io/Nodejs/interfaces/lib_types.TransformStream.html) which inherits from the Node `Duplex`.

![Pipe Transform](../images/pipe-transform.png "600px|center" )
