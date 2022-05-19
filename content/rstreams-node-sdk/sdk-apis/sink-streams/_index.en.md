---
title: "Sink Streams"
date: "2022-05-19T17:55:12.078Z"
weight: 4
draft: false
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

RStreams Node SDK functions that create a sink for you, the last step in a pipe.

[Load Function](./load)
: A function that creates a sink that takes in an upstream event and pushes it to an RStreams queue on the bus

[Devnull Function](./devnull)
: A function that creates a sink stream that takes in un upstream event and does absolutely nothing with it,
except log it if you ask it to