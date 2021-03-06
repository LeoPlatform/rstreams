---
title: "Transform Streams"
date: "2022-05-19T17:55:12.078Z"
weight: 3
draft: false
version:
  version: 1
  current: 1
  all:
    - version: 1
      date: "2022-05-19T17:55:12.078Z"
  render:
    fileName: "_index"
    language: "en"
---

{{< collapse-light "ToC" >}}
{{< toc  >}}
{{</ collapse-light >}}

RStreams Node SDK functions that create a transform stream for you, acting as a pipe step sitting between a source and sink.  Each transform
stream feeds accepts data from the previous pipe stream step, does something with it and then sends the resulting data
on to the next pipe stream step.

[Stringify Function](./stringify)
: A function that creates a transform stream that takes in an upstream event, turns it into a string and tacks on a newline
character to help in creating [JSON lines files](https://jsonlines.org/)

[Through Function](./through)
: A function that creates a transform stream that takes in un upstream event and allows the developer to modiy/enrich/aggregate/reduce
events and then send them on to the next stream step in the pipe

[ToCSV Function](./tocsv)
: A function that creates a transform stream that helps build a csv file by taking each upstream event that comes in and
formatting it as a line to put in a CSV file which it outputs to the next pipe stream step