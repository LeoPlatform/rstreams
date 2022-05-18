---
title: "Sink Streams"
date: "2022-05-18T18:19:42.651Z"
weight: 4
draft: false
version: "1.0"
---

{{< collapse-light "ToC" >}}
{{< toc  >}}
{{</ collapse-light >}}

RStreams Node SDK functions that create a sink for you, the last step in a pipe.

[Load Function](./load)
: A function that creates a sink that takes in an upstream event and pushes it to an RStreams queue on the bus

[Devnull Function](./devnull)
: A function that creates a sink stream that takes in un upstream event and does absolutely nothing with it,
except log it if you ask it to