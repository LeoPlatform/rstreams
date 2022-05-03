---
title: "Stringify"
date: 2018-12-29T11:02:05+06:00
weight: 1
draft: false
---

{{< collapse-light "ToC" >}}
{{< toc  >}}
{{</ collapse-light >}}

{{< notice info >}}You need to understand what a [pipe and stream step in that pipe](../../../streams-primer) is AND 
nothing comes for free.  The cost of working with large amounts of data in near real-time environments
with RStreams is you have to think about what you are doing and what it means with respect to
reading and writing.  It is strongly recommended you read the [Read/Write at Scale](../../../read-write-scale) 
article at some point.{{</ notice >}}

[API Doc](https://leoplatform.github.io/Nodejs/modules/index.StreamUtil.html#stringify)

This function creates a transform stream, meaning a stream that exists to receive events after the source stream,
do something with them and then send them on to the next pipe step, which must exist.

It takes each event, stringifies it and tacks on a newline character at the end and sends that string, with the newline,
on to the next step in the pipe.  It is used to create [json lines](https://jsonlines.org/) content to either feed to an s3 file or just a file
one the local file system.

## When would I use this?
* I want to make a JSON lines file from the events flowing through the stream

## Runnable Examples
### Example 1

This example reads 5 events from the `rstreams-example.peopleplus` RStreams queue.  The pipe then creates
a `throughAsync` stream step that just takes the `ReadEvent<Person>` events read from the bus 
and turns it into a `PersonLight` event and sends it on to the `stringify` stream to make a 
json line ready to stick in a [json lines](https://jsonlines.org/) file.

Finally, it writes the file using the Node standard filesystem `fs`module to create a sink that writes events that flow into
the sink to a file.  Pretty convenient.

{{< collapse-light "Example 1 code" true>}}
```typescript {linenos=inline,anchorlinenos=true,lineanchors=ex1}
import { ReadEvent, ReadOptions, RStreamsSdk } from "leo-sdk";
import { Person } from "../lib/types";
import fs from "fs";

async function main() {
  const rsdk: RStreamsSdk  = new RStreamsSdk();

  const opts: ReadOptions = {
    start: 'z/2022/04/20',
    limit: 5
  }

  await rsdk.streams.pipeAsync(
    rsdk.read<Person>('rstreams-example.peopleplus-to-jsonlines',
                      'rstreams-example.peopleplus', opts),
    rsdk.streams.throughAsync<ReadEvent<Person>, PersonLight>(async (p: ReadEvent<Person>) => {
      return {
        firstName: p.payload.firstName,
        lastName: p.payload.lastName,
        email: p.payload.email
      }
    }),
    rsdk.streams.stringify(),
    fs.createWriteStream("./output/people.jsonl"),
  );
}

interface PersonLight {
    firstName: string;
    lastName: string;
    email: string;
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

{{< collapse-light "Generated people.jsonl file" >}}
```bash {linenos=inline,anchorlinenos=true,lineanchors=ex1results}
{"firstName":"Herman","lastName":"Morris","email":"herman.morris@example.com"}
{"firstName":"Herman","lastName":"Morris","email":"herman.morris@example.com"}
{"firstName":"Tomothy","lastName":"Rogers","email":"tomothy.rogers@example.com"}
{"firstName":"Herman","lastName":"Morris","email":"herman.morris@example.com"}
{"firstName":"Tomothy","lastName":"Rogers","email":"tomothy.rogers@example.com"}
```
{{</ collapse-light >}}

Note: [Person types referenced in the examples](../../#person-types-referenced-in-the-examples)

