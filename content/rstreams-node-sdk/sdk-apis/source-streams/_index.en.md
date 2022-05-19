---
title: "Source Streams"
date: "2022-05-19T16:20:15.764Z"
weight: 2
draft: false
version:
  current: "1.0"
  all:
    - version: "1.0"
      date: "2022-05-19T16:20:15.764Z"
  _render:
    fileName: "_index"
    language: "en"
---

{{< collapse-light "ToC" >}}
{{< toc  >}}
{{</ collapse-light >}}

RStreams Node SDK functions that create a source stream for you, acting as the first stream in a pipe.  Each source stream feeds a pipe with data that 
you specify, allowing it to flow through to the next stream step in your pipe.

[Read Function](./read)
: A function that creates a source stream that gets events from the specified queue and feeds them into the pipe.

[Create Source Function](./createsource)
: A function that creates a source stream that gets events from the specified queue and feeds them into the pipe.