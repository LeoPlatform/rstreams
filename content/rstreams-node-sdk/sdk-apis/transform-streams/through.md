---
title: "Through"
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

{{< notice info >}}Only use the `throughAsync` SDK method and not `through` as it is not needed and is deprecated.{{</ notice >}}

[API Doc](https://leoplatform.github.io/Nodejs/classes/index.RStreamsSdk.html#throughAsync)

This function creates a transform stream, meaning a stream that exists to receive events after the source stream,
do something with them and then send them on to the next pipe step, which must exist.

Note that `through` intentionally doesn't know anything about RStreams events.  All it does it take in what it
is given from the previous pipe step and then send on what you return from the function to the next pipe step.

For example, if your source pipe step produces an object of type `Person` then you are going to get
an object of type `Person` and not `ReadEvent<Person>` as would happen if you use the popular
[event-stream](https://www.npmjs.com/package/event-stream) library exported by the RStreams SDK
to turn an array into a source stream that uses an array to seed the pipe with content as in this example.

```typescript {linenos=inline,anchorlinenos=true,lineanchors=ex1}
const arr: Person[] = [{name: 'jane doe'}];
await rsdk.streams.pipeAsync( 
  rsdk.streams.eventstream.readArray(people.results),
  rsdk.throughAsync<Person>(event) {
    event.name = 'john doe';
    return event;
  },
  rsdk.streams.devnull()
);
```




## When would I use this?
* I want to do something more involved so enrich doesn't work for me
* I want to take data provided and transform them and send them through to the next pipeline step


## Runnable Examples
### Example 1

This example reads 5 events from the `rstreams-example.peopleplus` RStreams queue.  The pipe then creates
a `throughAsync` stream step that just takes the `ReadEvent<Person>` events read from the bus 
and turns it into a `PersonLight` event and sends it on to the `toCSV` stream to make a 
CSV line ready to stick in a CSV file.

Finally, it writes the file using the Node standard filesystem `fs`module to create a sink that writes events that flow into
the sink to a file.  Pretty convenient.

The `toCSV` function's first argument, if true, writes a CSV header as the first row.  If the `toCSV` function's first
argument is an array of strings, it uses that as the CSV header first row.  The second arg is options that
come from the underlying [fast-csv NPM module](https://www.npmjs.com/package/fast-csv) 
that generates the CSV file: [fast-csv options](https://c2fo.github.io/fast-csv/docs/parsing/options/).

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
    rsdk.streams.toCSV(true, {quote: '"'}),
    fs.createWriteStream("./output/people.csv"),
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
firstName,lastName,email
Herman,Morris,herman.morris@example.com
Herman,Morris,herman.morris@example.com
Tomothy,Rogers,tomothy.rogers@example.com
Herman,Morris,herman.morris@example.com
Tomothy,Rogers,tomothy.rogers@example.com
```
{{</ collapse-light >}}

Note: [Person types referenced in the examples](../../#person-types-referenced-in-the-examples)

