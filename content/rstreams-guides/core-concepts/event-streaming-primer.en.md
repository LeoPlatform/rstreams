---
title: "Event Streaming Primer"
date: 2022-04-04T11:02:05+06:00
description: "In-depth guides and how-to's."
draft: false
weight: 2
---
{{< collapse-light "ToC" >}}
{{< toc  >}}
{{</ collapse-light >}}

***One cannot understand the problems RStreams solves or reason about its implementation/usage without a fundamental understanding of event streaming compared to traditional microservices approaches.***

# Summary
Some systems work with parties that are constantly generating new data.  Client data flowing from these parties tends to flow in a sequential order that we call an event stream. The events in this stream get transformed, enriched, and used to trigger subsequent events. Event stream processing, in concert with general purpose messaging, is a loosely coupled, scalable pattern ideal for designing enterprise systems built to handle continuous data flow. RStreams is just such a system.