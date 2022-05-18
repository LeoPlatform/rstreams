---
title: "Load"
date: "2022-05-18T18:19:42.651Z"
weight: 1
draft: false
version: "1.0"
---

{{< collapse-light "ToC" >}}
{{< toc  >}}
{{</ collapse-light >}}

{{< notice info >}}You need to understand what a [pipe and stream step in that pipe](../../../streams-primer) is AND 
nothing comes for free.  The cost of working with large amounts of data in near real-time environments
with RStreams is you have to think about what you are doing and what it means with respect to
reading and writing.  It is strongly recommended you read the [Read/Write at Scale](../../../read-write-scale) 
article at some point.{{</ notice >}}

[API Doc](https://leoplatform.github.io/Nodejs/classes/index.RStreamsSdk.html#load)

This function creates a sink stream whose purpose is simply to pull events downstream and then write them
to one or more RStreams queues.  The second argument of the `load` function is the queue to send events to
that don't designate themselves, via an attribute named `event`, which queue to push the data to.  Note that
`load` cannot today push to multiple queues with the `useS3` option set to true.

The `load` stream is often used in conjunction with a [through](../../transform-streams/through)
stream that may precede it.

## When would I use this?
* When you want to push events to a single queue at the end of a pipe
* When you want to push events to multiple queues at the end of a pipe

## Runnable Examples
### Example 1

Please see [Through Example 2](../../transform-streams/through/#example-2) which uses a `load` stream.