---
title: "Sink Streams"
date: 2018-12-29T11:02:05+06:00
weight: 4
draft: false
---

{{< collapse-light "ToC" >}}
{{< toc  >}}
{{</ collapse-light >}}

These function create a sink for you, the last step in a pipe.

[Load Function](./load)
: A function that creates a sink that takes in an upstream event and pushes it to an RStreams queue on the bus

[Devnull Function](./devnull)
: A function that creates a sink stream that takes in un upstream event and does absolutely nothing with it,
except log it if you ask it to