---
title: "What is RStreams?"
date: "2022-05-19T17:55:12.078Z"
icon: "fas fa-question"
description: "What is RStreams and why should I use it?"
type: "docs"
weight: 1
version:
  version: "1.0"
  current: "1.0"
  all:
    - version: "1.0"
      date: "2022-05-19T17:55:12.078Z"
  render:
    fileName: "_index"
    language: "en"
---
{{< collapse-light "ToC" >}}
{{< toc  >}}
{{</ collapse-light >}}

# RStreams Defined
* **RStreams Bus**: a server-side framework that is a thin veneer using AWS Kinesis, Firehose, S3, Lambda and DynamoDB to 
create a general-puropose streaming and messaging platform
* **RStreams Node SDK**:  a node/typescript SDK that developers use in their apps and lambda functions to get data from
and send data to queues of an instance of an RStreams Bus in a streaming fashion with massive concurrent scale
* **RStreams Flow**: a project template that generates an opinionated way to craft one or more related bots, lambda queue
event handlers, to develop a reactive app using RStreams locally as a developer, running it, debugging it, deploying it,
and monitoring it
* **RStreams Monitoring**: a webapp, Botmon, that provides a visual graph of all queues and bots (queue lambda event handlers),
provides statistics on the time it takes to process and move data from queue to queue and enables the extraction of these
metrics to one's own monitoring solution for reporting and alerting

# Use Cases
If these use cases sound useful, RStreams might make sense for you.

Queues and Event Handlers
: I want to put data events into many different queues and have a single event handler lambda wake up when events come in and process them

1 to Many Event Handling
: I want to have N different event handlers listening for change off the same queue without stepping on each other

Many to 1 Event Reducing
: I want to aggregate events and emit a single event for a group while keeping track of where the one event came from as I send it to another queue

Automatic Persistence
: I want all events to persist, even after I've handled the events, without risk of re-processing data

Stateful Queues
: I want queues to remember where I last read events from when my program restarts and let me safely keep reading in the queue

Ordered Queues and Ordered Processing
: I want events in my queues to enter in time-sequence order and I want event handlers to be able to read events exactly once in either
total order or partial order; partial order to ensure I can read from a queue in parallel but not get events that matter out of order

Event Playback
: I want to be able to replay events or rewind back to a moment in time and play from there for failure recovery scenarios

Parallelization with Fanout
: I want N copies of the same event handler intelligently reading from a single queue so I can process events super fast
and keep up with a vast amount of data events coming in

Event Push
: I want my lambda queue event handler to be invoked when there are new events to be handled in the queue

Event Pull
: I want my lambad to be invoked on a cron and then to be able to pull data from whatever queue I want

Event Transformation
: I want a super easy way to read data events from one queue, transform them and push them to another queue at massive scale

Zero-infrastructure Scale-out
: I don't want to have to deploy new AWS infrastructure and create new resources just to create new queues

Data-flow Visualization
: I want to visualize the queues and event handlers that put data in and take data out of queues to understand the system
and to monitor/diagnose issues visually

Develop Locally
: I want to develop and debug locally despite the complexity of a streaming system



