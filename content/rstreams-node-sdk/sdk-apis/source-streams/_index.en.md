---
title: "Source Streams"
date: 2018-12-29T11:02:05+06:00
weight: 2
draft: false
---

{{< collapse-light "ToC" >}}
{{< toc  >}}
{{</ collapse-light >}}

These functions create a source stream for you, acting as the first stream in a pipe.  Each source stream feeds a pipe with data that 
you specify, allowing it to flow through to the next stream step in your pipe.

[Read Function](./read)
: A function that creates a source stream that gets events from the specified queue and feeds them into the pipe.

[Create Source Function](./createsource)
: A function that creates a source stream that gets events from the specified queue and feeds them into the pipe.