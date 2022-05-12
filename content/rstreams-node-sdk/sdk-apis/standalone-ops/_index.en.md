---
title: "Standalone Ops"
date: 2018-12-29T11:02:05+06:00
weight: 1
draft: false
---

{{< collapse-light "ToC" >}}
{{< toc  >}}
{{</ collapse-light >}}

RStreams Node SDK functions that allow you to send and receive events to and from the RStreams bus without the need to
implement pipes and streams.

[put Operation](./put)
: A function that lets you write a single event to the specified RStreams queue

[enrich Operation](./enrich)
: A function that reads from the specified source RStreams queue, lets you transform the events and then sends the 
modified events to the specified destination RStreams queue

[offload Operation](./offload)
: A function that reads from the specified RStreams queue and lets you do something with the events retrieved, perhaps save them in a DB