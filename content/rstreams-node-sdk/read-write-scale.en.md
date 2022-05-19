---
title: "Read/Write at Scale"
date: "2022-05-19T16:20:15.764Z"
weight: 4
draft: false
version:
  current: "1.0"
  all:
    - version: "1.0"
      date: "2022-05-19T16:20:15.764Z"
  _render:
    fileName: "read-write-scale"
    language: "en"
---

{{< collapse-light "ToC" >}}
{{< toc  >}}
{{</ collapse-light >}}

{{< notice info >}}You need to understand what a [pipe and stream step](../streams-primer) in a pipe are.{{</ notice >}}

# Overview
The RStreams Node SDK includes a simple utility function to create pipes and nearly every kind of stream
you'd need to work with massive amounts of continuously generated data in an instance of the RStreams bus.  It
also includes functions to allow you to skip the complexity of dealing with pipes and streams at all for the
most common use cases: getting data from the bus and sending data to the bus.

# Reading at Scale
You want to read from an RStreams queue.  What do you need to consider to ensure you do that 
efficiently and responsibly at massive scale?

## App Use Cases and Considerations
**What kind of app are you making?**

* **CASE 1:** Are you writing an app that runs once in a while, pulling events from a specific start/end range
in the queue?

  Maybe you are writing an app to recover from a failure somewhere in your enterprise and so your 
  app gets a start/end date of events that needs to be re-processed from the queue and it is manually
  kicked off.  
  
  Or maybe you're writing an app to sample data in a queue as part of monitoring and health checks
  that gets kicked off on a cron every five minutes to read a few events and go back to sleep.

* **CASE 2**: Are you writing an app that runs continously as a daemon, pulling new events from the
queue as fast as they show up?

  You care about each and every event and you want to get each one in order from the queue and 
  process it.  If events are pushed into the queue faster than you can read them and process
  them then you're in trouble because the number of events in the queue that are waiting for you
  to grab and process will grow unbounded.  This means that the data you are processing is forever
  getting older and older and isn't being processed in near real-time, seconds to a few minutes typically.

  Also, what happens if your daemon crashes?  You will need to restart it and keep reading from where
  you left off.

* **CASE 3**: Are you writing a serverless app that has to shut down every 15 minutes as an AWS lambda function
and get restarted and keep going?

  Let's assume that this is just `CASE 2` above but instead of a daemon it's a lambda function.  You can't miss
  an event and you need to process them efficiently.  You need to make sure you leave enough time to
  complete processing the events you have and know for sure where you left off before your lambda gets
  restarted.

**How much processing are you doing and what latency is acceptable?**

The more events that are pushed into a queue per unit time the more efficiently your app needs to be
able to read and process these events.  Reading events from a queue is lightning, but what if you
need to call out to an API to get data to enrich each and every event?  What if you need to hit a
database for each and every event?  That's going to slow everything down and could make you upside
down in that you can't process events as fast as they are being pushed into a queue.

**How big are the data events you are reading?**

Large events can't flow through many of AWS's services.  The RStreams SDK will detect this and push them
to S3 and write an event that flows into the stream that actually points to the events stored in a file
in S3.  The SDK handles all of this transparently and you won't even be aware you are reading from S3.
However, the larger the events the more this is going to happen and the more time it could take
to read events from S3 if those events are striped to hell and back in individual S3 files.

## Config to the Rescue

RStreams includes config in read operations to let you tune reading based upon your specific uses cases.

The following applies to the [enrich](https://leoplatform.github.io/Nodejs/classes/index.RStreamsSdk.html#enrich),
[offloadEvents](https://leoplatform.github.io/Nodejs/classes/index.RStreamsSdk.html#offloadEvents) and
[read](https://leoplatform.github.io/Nodejs/classes/index.RStreamsSdk.html#read) operations.


**[ReadOptions Interface](https://leoplatform.github.io/Nodejs/interfaces/index.ReadOptions.html)**

Note there are other options not listed below that are less often needed but might be interesting 
in some rare cases to fine tune performance such as `stream_query_limit`, `size` or `loops`.

* **fast_s3_read**
  
  Problem
  : reading events is slow, likely because there's lots of small S3 files the SDK is reading events from

  Solution
  : set this to true and the SDK will read concurrently from multiple S3 files and your reads will be 
    much faster - will default to on in Q3 2022 (you can control how much is ready concurrently if you
    need fine-grained control, which you likely won't, using `fast_s3_read_parallel_fetch_max_bytes`)
    
* **runTime** | **stopTime** 

  Problem
  : your lambda function (bot) is shutting down after 15 minutes instead of ending gracefully because
    it is endlessly reading events from a queue

  Solution
  : tell the RStreams read operation you are using to end after `runTime` number of milliseconds
    and set that to be 75-80% of the amount of time the lambda has left before it runs out of
    time before AWS shuts it down forcefully or calculate the exact `stopTime` that saves
    roughly 20% of the 15 min shutdown window for the pipe to complete processing, flush and checkpoint.

* **start**

  Problem
  : I don't want to read the latest events, I want to start from a specific position in the queue

  Solution
  : use the `start` attribute to specify the event ID of when to start

* **maxOverride**

  Problem
  : I don't want to keep reading events forever, I want to stop at a certain time in the queue

  Solution
  : use the `maxOverride` attribute to specify the event ID of when to stop

**[BatchOptions Interface](https://leoplatform.github.io/Nodejs/interfaces/lib_streams.BatchOptions.html)**

These don't control reading from a queue but allow you to hold on to a group of events and present those
events all at once to the next stream step in the pipe, a concept called micro-batching.

* **bytes** | **count** | **time**

  Problem
  : It's taking me longer and longer to process events and I can't keep up with new events coming 
    into the queue and so reading is getting further and further behind

  Solution
  : Try micro-batching using these attributes to group of events in small batches that are sent to the
    next pipe stream step all at once and then rewrite whatever your code is doing in that pipe stream
    step to do it in paralled: if writing to a DB write the entire batch in one SQL query; if reading 
    from a DB, do one read to get all the data you need for all the events in the batch; if hitting an
    API use Promise.all to run each API request in parallel for the batch. NOTE, if you just can't 
    keep up no matter what, consider implementing [Fanout](/rstreams-guides/fanout)

**[BufferOptions Interface](https://leoplatform.github.io/Nodejs/interfaces/index.BufferOptions.html)**

These serve the same purpose as the BatchOptions Interface above and solve the same problem.  The
difference is that `BatchOptions` are built into an RStreams operation to let you control it while
`BufferOptions` is used with the Buffer pipe stream step operation that may be inserted into the pipe
to choose to micro-batch events before flowing to the next pipe stream step.  The attribute names
 are named slightly differently but are identical in purpose and function.

**[ToCheckpointOptions Interface](https://leoplatform.github.io/Nodejs/interfaces/index.ToCheckpointOptions.html)**

Head over to the [checkpointing](/rstreams-guides/checkpointing) article if you don't know what a checkpoint is or what it's used for.

* **records** | **time**

  Problem
  : I can't ever re-process an event and so I need to checkpoint after I process each and every event

  Problem
  : I'm OK if I re-process some events in the rare case of a failure and so I only want to checkpoint
    after so much time or so many records

  Solution
  : Use these attributes to control checkpointing in a stream (see the [checkpoint](https://leoplatform.github.io/Nodejs/modules/index.StreamUtil.html#checkpoint) operation)

# Writing at Scale
You want to write to an RStreams queue.  What do you need to consider to ensure you do that 
efficiently and responsibly at massive scale?

## Considerations

**What's really happening underneath the covers with a write?**

The SDK is writing to either Kinesis, S3 and Firehose and S3 followed by Kinesis. See the 
[Anatomy of a Bus](/rstreams-bus/anatomy-of-bus) article for more on this.

So, that means Kinesis has limitations on the size of events and how much data you can concurrently
write to kinesis at once without having to jump through hoops.

**Am I getting data to write onesie twosie or all at once in big batches?**

Perhaps you are receiving a file from a customer where each row in the file is an object you want
send into an RStreams queue or are you getting data in an event driven manner and the flow of those
events can't be predicted but is likely either coming one at a time or in a micro-batch.

## Config to the Rescue

RStreams includes config in write operations to let you tune writing based upon your specific uses cases.

The following applies to the [load](https://leoplatform.github.io/Nodejs/classes/index.RStreamsSdk.html#load),
[offloadEvents](https://leoplatform.github.io/Nodejs/classes/index.RStreamsSdk.html#offloadEvents) and
[write](https://leoplatform.github.io/Nodejs/classes/index.RStreamsSdk.html#write) operations.

**[WriteOptions Interface](https://leoplatform.github.io/Nodejs/interfaces/index.WriteOptions.html)**

* **useS3**

  Problem
  : I have lots of events to send to an RStreams queue all at once and it's slow

  Solution
  : Set the `useS3` option to true and the SDK will write a file chock full of events, many thousands
    is normal, and then send one event through kinesis that points back to the S3 file

  Problem
  : It's taking too long to read events

  Solution
  : Wait.  Why is this here in the write section?  The reason is that how you write can affect how you read.
    If you write tons and tons and small S3 files, say with one event each, that's going to affect read
    performance since the SDK will have to make many calls to S3 to read a small number of events.  Yes,
    there's a new [fast_s3_read](https://leoplatform.github.io/Nodejs/interfaces/index.ReadOptions.html#fast_s3_read)
    capability that will read multiple files at once that makes this much better but still it can be
    an issue.  So the solution is to be smart about your use of the `useS3` attribute.  Be sure you
    micro-batch successfully if you use it, meaning that there is enough data available to be
    written all at once using the batch or buffer options listed above.

* **firehose**

  Problem
  : My event handler that writes to an RStreams queue is invoked one at a time by the nature of how it runs
    and the pace at which events come in that I want to write and so I'm writing lots of individual events
    that flow through kinesis and take up concurrent write bandwidth

  Solution
  : Set `firehose` to true.  Firehose will automatically micro-batch events for us in one minute increments,
    writing them to an S3 file which will then get sent to kinesis as one event.  This does mean that
    ingestion will be delayed by up to a minute, so this will only work in use cases where this is acceptable.

* **records** | **size** | **time**

  Problem
  : I don't want to inundate kinesis with events going one at a time but I need control over 
    how group up events and send as a micro-batch to kinesis because ingestion time matters

  Solution
  : Use one of these attributes, and probably all of them, to control how long to wait before the SDK
    micro-batches up events, zips them as a single blob and sends them to kinesis, which performs like
    a champ.  Set number of events, the max size of the events and the max time to wait and the max 
    number of events to wait and whichever is tripped first will cause the micro-batch to be sent as is.



