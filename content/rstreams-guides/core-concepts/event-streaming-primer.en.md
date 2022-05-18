---
title: "Event Streaming Primer"
date: "2022-05-18T18:19:42.651Z"
description: "In-depth guides and how-to's."
draft: false
weight: 1
version: "1.0"
---
{{< collapse-light "ToC" >}}
{{< toc  >}}
{{</ collapse-light >}}

***One cannot understand the problems RStreams solves or reason about its implementation/usage without a fundamental understanding of event streaming compared to traditional microservices approaches.***

# Summary
Some systems work with parties that are constantly generating new data.  Client data flowing from these parties tends to flow in
a sequential order that we call an event stream. The events in this stream get transformed, enriched, and used to trigger
 subsequent events. Event stream processing, in concert with general purpose messaging, is a loosely coupled, scalable pattern
 ideal for designing enterprise systems built to handle continuous data flow. RStreams is just such a system.

# What's a Stream
The traditional definition of a stream is a sequence of data elements that move from a source to a sink.
![Source Tranform Sink Stream](../../images/source-transform-sink.png "420px|center" )

Sources generate the data that feeds the start of the stream.  A source may get the data to feed into the stream from a file, from an
HTTP request, from a database or by reading from another stream.

The transform step(s) of a stream processes and possibly modifies the data that moves through a stream.  Transform steps may parse data,
filter data, zip/unzip content, enrich data form other sources or aggregate data.

The sink is the final step in a stream, which collects and stores the final transformed data.  A sink can write a new file, update a
database, collect data into an array or write to another stream.

Streams may be implemented with a push or pull model.  The main difference between the two models is which end of the stream is in
control of data moving through the stream.  In a push model the source will push data to the next transform step until it reaches
the sink.  In a pull model the sink will pull/request data from the previous steps until it reaches the source.  Node and Rust
streams APIs use the pull model.

# Continuous data systems before event streaming
Before the cloud and before products were designed to work well with big data problems, batch processing was the preferred method to
create solutions for continuous data in/out.  The producer of the data would batch up and send a file to the System.  The Core
microservice of that system, often running on a periodic timer, would look for and find the newly deposited file and batch up the
ingestion of the file into the source-of-truth database it encapsulates.

Some other microservice, say the data warehouse microservice, running on a periodic timer of its own, would hit the Core microservice
interface and query for change.  It would suck the data over in batch and plant a file of its own somewhere for the data warehouse
microservice to act on.

Perhaps there would also be another microservice to generate analytics for interactive dashboards.  That analytics microservice would
likewise call the Core’s API to pull change from the core database, perhaps on a daily basis, and batch that into the analytics
microservice’s database.

Challenges with this approach:

* Batching and time  
Batching in this manner introduces big latencies in processing time at every level of the system and across all microservices since
each is responsible to reach out and ask for the data it needs and does so with some large batch interval.

* Batching, load and visibility  
A continuous stream of large batches of data, processed one at a time as a thing, introduces large operational challenges because of
the complexity and the amount of time it takes to replay a batch when things go wrong with the batch system or with a customer’s own
system.  It is difficult to get visibility into what is happening and debug issues with large batches.

* Microservices and cross-cutting change  
In a microservices world where each service encapsulates its data and requires that others ask for it,  it makes cross-cutting change
across the microservices of the system very challenging, say adding a new fundamental attribute to a core data type used in many of
the system’s services.

* Microservices coupling  
A recognized drawback with conventional microservice architectures is the coupling that occurs between microservices. Each service
reaches out and asks another microservice for the data or state it needs, creating a network of dependencies.  When a given
microservice is down or overloaded, retries and queuing must be implemented at each point in the graph of calls made to another service.

Still, this is far better than monolithic, pre-microservice architectures to be certain, but there is a better way to organize
services for a system designed to receive and generate a near continuous stream of data events.

# Event streaming compared to APIs
The non-event streaming way has microservices reach out and pull data in that they need using microservice APIs, creating a directed
graph of dependent API calls between microservices.  This approach tightly couples various microservice API interfaces with the API
data inputs/outputs.  It puts code in the driver’s seat of the architecture.
![Source Tranform Sink Stream](../../images/api-graph-of-calls.png "550px|center" )

Event streaming turns the microservices approach on its head.  With event streaming, the structure of the flow of data causes data
to be pushed to the microservices that need them via queues of data, creating a directed graph of data streams, not API calls.

![Source Tranform Sink Stream](../../images/stream-graph.png "550px|center" )

The structure of the directed graph of streams is the application.  This structure causes data to be pushed from where it is to where
a microservice needs it, without tight coupling.  Nothing is free in life and event streaming has its own drawbacks.  Change doesn’t
revolve around modifying APIs as in the traditional microservices approach, instead it revolves around changing data contracts, say
adding an attribute to an object that flows everywhere.  

This cost is easier to bear, however, because it more closely aligns behavior where the focus should be in today' world - on the data.
It means that data is the feature and the crux of where architecture and thought goes, not code.  A large part of making an
interesting change, such as adding a new major capability to a system, is just supporting receiving and streaming the new data
attributes of system objects. for the new capabilities.  The code to do something interesting with the data is often trivial by
comparison to getting the data changes and contracts right and propagated.