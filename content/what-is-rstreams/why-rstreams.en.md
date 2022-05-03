---
title: "Why RStreams?"
date: 2018-12-29T11:02:05+06:00
weight: 1
draft: false
---
{{< collapse-light "ToC" >}}
{{< toc  >}}
{{</ collapse-light >}}
# Why RStreams?  Why not just AWS services?
RStreams provides a near real-time messaging and streaming platform that knits together underlying AWS services 
to do the heavy lifting.  Why bother with this?  Why not just use the AWS services themselves?

AWS is hard.  It’s not just that there’s a lot to learn on a given service, it’s that each service has its own sweet spot
for the use cases it solves and none provide a one stop shop for event streaming and general messaging.  When you step
outside that sweet spot of given service, you run smack into one or more serious limitations: latency, message size, 
write throughput, concurrent read limits, lack of durability, read and write performance coupling, no persistence after
event handling, lack of backpressure, etc.  AWS expects developers to tie the different services together to get
around the natural limitations of a given service: SNS tied to SQS queues, Kinesis tied into EventBridge tied into SQS.

Bridging across AWS’ services to create a comprehensive solution that works in all circumstances is the right thing to do.
The problem is that it means that every team or project has to learn these non-obvious pitfalls/limitations and how to
overcome them by connecting many AWS services together at scale.  This will often make a conceptually very simple task 
quite hard to implement at scale with good debugging/monitoring/visibility across the entire thing.

This is the problem RStreams solves.  It makes conceptually simple things remain simple for developers by connecting the 
AWS services together with a very thin veneer using a simple, consistent abstraction.  The fundamental premise is that it
should be easier to learn RStreams than to have to learn how and when to tie all these AWS services together for the 
features a project needs.  However, when problems occur, it should not get in the way of the underlying AWS services
with their large community support.

# Design Priorities
With more than one right way to solve problems, design priorities make clear why tech decisions on RStreams were made.
RStreams chose event streaming based on queues as the foundational pattern that drives everything else and much of what follows
won’t make sense without context on event streaming.  Read the [event streaming](../rstreams-guides/core-concepts/event-streaming-primer) article  for a lot more on this.

## Data is the Feature
Big data has changed the world.  RStreams is a tech stack and patterns that best supports the movement, transformation, persistence
and ability to react to data when creating solutions and not necessarily the actual features that product management asks for.
The features product management asks for should naturally and easily fall out as a side effect of the data architecture of a project.
If the features don’t fall out naturally and easily from the data architecture, new features will be very hard, suffer 
performance/scale issues, add immense complexity and result in the creation of vast silos of data/functionality to do what 
would otherwise be easy.

## Favor AWS Services over Proprietary Solutions
Those who built RStreams believed strongly that if an engineering team leverages cloud services, and software that natively
takes advantage of these services, that this will allow the engineering teams to get an outsized outcome for their efforts.
This is one reason that Kafka, a leading event streaming platform, wasn’t chosen at the time - it wasn’t built on AWS'
most scaleable services.

## Use the Right Tool/Database/Service for the Job
Data storage is far cheaper than the opportunity cost of not using the right tool/database/service for the job. So, don’t fear replicating data from the source-of-truth database to purpose-built tools/databases/AWS services that excel at a specific job.

## Time Matters
The time ordering of events in systems that are continuously receiving and propagating events matters and if ignored will push complexity to individual engineers and teams, resulting in an entire class of bugs for CommerceHub developers and its customers that would otherwise just go away.