---
title: "Anatomy of a Bus"
date: 2018-12-29T11:02:05+06:00
weight: 3
draft: false
---

{{< collapse-light "ToC" >}}
{{< toc  >}}
{{</ collapse-light >}}

{{< notice info >}}
The terms defined in the [Fundamentals Article](../../rstreams-guides/core-concepts/fundamentals) may really help before reading this article.
{{</ notice >}}

# Summary
This article explains the mechanics of how an instance of the RStreams Bus works by looking at the operations that cause data to flow through the bus.

# What is the "Bus"?
It's an implementation of an [event streaming](../../rstreams-guides/core-concepts/event-streaming-primer) and general purpose messaging system.

## Event Streaming
The bus is a way for a client application (usually a bot) to...
* Push vast numbers of data events into a named queue quickly, typically using the Node SDK, and keep them in order
* Retrieve vast numbers of data events from a named queue quickly, retrieving them in order so they can be processed in order
* Read from one RStreams queue while simultaneously processing data already retrieved and optionally pushing that data to another queue(s)

## General Purpose Messaging
The following are the messaging models supported by the RStreams Bus:

* **Push events to consumer** : Bot will be invoked when events are pushed into a given queue and to continue pulling events from
 the queue until there are no more events or the Bot shuts down and then restarted and invoked again if/when there are more events
* **Consumer pulls events** : Bot will be invoked on a cron and pull events from a given queue
* **Consumer reduces events** : Bot will read events from a queue and aggregate/reduce them in some manner, turning N events into 1 event and
pushing the new event to another queue
* **Producer pushes to a single queue - 1 to 1** : Bot pushes data events to a single queue
* **Producer pushes to multiple queues - 1 to many** : Bot reads data events from a queue and then pushes data events to multiple queues
* **Multiple producers push to a single queue - many to 1** : Multiple bots read data from various queues and write data events to a single queue 

# How does the "Bus" work?

