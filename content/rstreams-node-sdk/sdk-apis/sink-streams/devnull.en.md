---
title: "Devnull"
date: "2022-05-19T16:20:15.764Z"
weight: 4
draft: false
version:
  current: "1.0"
  all:
    - version: "1.0"
      date: "2022-05-19T16:20:15.764Z"
  _render:
    fileName: "devnull"
    language: "en"
---

{{< collapse-light "ToC" >}}
{{< toc  >}}
{{</ collapse-light >}}

{{< notice info >}}You need to understand what a [pipe and stream step in that pipe](../../../streams-primer) is AND 
nothing comes for free.  The cost of working with large amounts of data in near real-time environments
with RStreams is you have to think about what you are doing and what it means with respect to
reading and writing.  It is strongly recommended you read the [Read/Write at Scale](../../../read-write-scale) 
article at some point.{{</ notice >}}

[API Doc](https://leoplatform.github.io/Nodejs/modules/index.StreamUtil.html#devnull)

This function creates a sink stream whose purpose is simply to pull events downstream and do nothing with them.
All pipes have to have a sink or nothing flows in the pipe since the sink pulls data along from the upstream
step before it and then that step pulls from its antecedent and so on.  So, no sink means nothing moves
in the pipe.  However, you don't always want your sink to actually do work like write to a file or to a
database or another queue and so `devnull` is your answer.

## When would I use this?
* When you have a pipe where all you want to do is log data moving through the pipe
* When you have a pipe that does processing in one of the stream steps before the sink

## Runnable Examples
### Example 1

This example uses the very popular [event-stream Node library](https://www.npmjs.com/package/event-stream), which is exported
via the SDK it's used so much, to turn a hard-coded array into a source stream to feed the pipe.

Then, `devnull` is used since we don't really want to do anything more than log the events moving through the stream.

The argument to `devnull`, if true, will log events that come to the sink.  You can also pass a string in which tells
the SDK to log events and starts each event in the console output with the string you provided and not the 
word "devnull" which is the default behavior.


{{< collapse-light "Example 1 code" true>}}
```typescript {linenos=inline,anchorlinenos=true,lineanchors=ex1}
import { RStreamsSdk } from "leo-sdk";

async function main() {
  const rsdk: RStreamsSdk  = new RStreamsSdk();

  const DATA: SoftDrink[] = [
    {name: 'Pepsi', yearInvented: 1893},
    {name: 'Coca-Cola', yearInvented: 1886},
    {name: 'Dr Pepper', yearInvented: 1885},
    {name: 'Hires Root Beer', yearInvented: 1876},
    {name: 'Vernors Ginger Ale', yearInvented: 1866},
    {name: 'Schweppes', yearInvented: 1783}
  ]

  await rsdk.streams.pipeAsync(
    rsdk.streams.eventstream.readArray(DATA),
    rsdk.streams.devnull(true)
  );
}

interface SoftDrink {
    name: string;
    yearInvented: number;
}

(async () => {
  try {
    await main();
  } catch(err) {
    console.log(err);
  }
})()
```
{{</ collapse-light >}}

{{< collapse-light "Example 1 console output" true>}}
```bash {linenos=inline,anchorlinenos=true,lineanchors=ex1results}
➜  rstreams-runnable-examples ts-node apps/devnull-stream.ts 
devnull {
  "name": "Pepsi",
  "yearInvented": 1893
}
devnull {
  "name": "Coca-Cola",
  "yearInvented": 1886
}
devnull {
  "name": "Dr Pepper",
  "yearInvented": 1885
}
devnull {
  "name": "Hires Root Beer",
  "yearInvented": 1876
}
devnull {
  "name": "Vernors Ginger Ale",
  "yearInvented": 1866
}
devnull {
  "name": "Schweppes",
  "yearInvented": 1783
}
```
{{</ collapse-light >}}
