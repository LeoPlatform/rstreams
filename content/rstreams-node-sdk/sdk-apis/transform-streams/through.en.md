---
title: "Through"
date: "2022-05-19T17:55:12.078Z"
weight: 1
draft: false
version:
  version: 1
  current: 1
  all:
    - version: 1
      date: "2022-05-19T17:55:12.078Z"
  render:
    fileName: "through"
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

{{< notice info >}}Only use the `throughAsync` SDK method and not `through` as it is not needed and is deprecated.{{</ notice >}}

[API Doc](https://leoplatform.github.io/Nodejs/classes/index.RStreamsSdk.html#throughAsync)

This function creates a transform stream, meaning a stream that exists to receive events after the source stream,
do something with them and then send them on to the next pipe step, which must exist.

Note that `through` intentionally doesn't know anything about RStreams events.  All it does it take in what it
is given from the previous pipe step and then send on what you return from the function to the next pipe step.

For example, if your source pipe step produces an object of type `Person` then you are going to get
an object of type `Person` and not `ReadEvent<Person>`.  The small example below uses the popular
[event-stream](https://www.npmjs.com/package/event-stream) library exported by the RStreams SDK
to turn an array into a source stream to seed the pipe with content from the array.

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
* I want to take data events provided and transform them and send them through to the next pipe step

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
    rsdk.throughAsync<ReadEvent<Person>, PersonLight>(async (p: ReadEvent<Person>) => {
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

{{< collapse-light "Generated people json lines file" >}}
``` {linenos=inline,anchorlinenos=true,lineanchors=ex1results}
firstName,lastName,email
Herman,Morris,herman.morris@example.com
Herman,Morris,herman.morris@example.com
Tomothy,Rogers,tomothy.rogers@example.com
Herman,Morris,herman.morris@example.com
Tomothy,Rogers,tomothy.rogers@example.com
```
{{</ collapse-light >}}

Note: [Person types referenced in the examples](../../#person-types-referenced-in-the-examples)

### Example 2

Here we see the real power of a `through`.  We are reading data from a stream populated with
people that are of type `PersonRaw`.  We want to read them, translate them from `PersonRaw` to a 
simpler type named `Person` and then look at the country on each object and push those
that live in the US to a queue named `rstreams-example.peopleplus-us` and the others to
a queue named `rstreams-example.peopleplus`.  

Things to learn from this example:

#### Reading Data
We are only reading up to 5 objects and then closing the source stream which closes down the pipe

We don't have a [batch stream step](https://leoplatform.github.io/Nodejs/modules/index.StreamUtil.html#batch)
between the `read` and the `throughAsync` since we don't need it because the logic we have in the
`throughAsync` doesn't do anything that takes time.  If we reached out to say an API or database here
to further enrich the person with external data, then we would absolutely want to use the `batch` stream step
to micro-batch and get arrays of data sent to the `throughAsync` with a type of `Array<ReadEvent<PersonRaw>>`.
This would then let you hit the database once per group of events, perhaps, building a single SQL statement
to get all the data so your `through` doesn't slow down. 

#### Creating a BaseEvent

Note that `throughAsync` doesn't wrap your return value in a
[BaseEvent](https://leoplatform.github.io/Nodejs/interfaces/lib_types.BaseEvent.html) which is what the `load` needs so
we make one ourself and return it.  Normally, there are only three attributes you need to care about:

* **payload**: the data this event exists to wrap
* **event_source_timestamp**: this is when the very first event hit any queue of the bus that eventually led
to this event, no matter how many queues it flowed through to get here and how the event was transformed
along the way.  So, copying the source event's (`PersonRaw`) `event_source_timestamp` is almost always the
right thing to do so we can carry forward this date.  It is used to understand how long it has taken for 
an object to propagate through the system and is very important.
* **correlation_id**: The short answer is that you need to have this so be sure to just use the helper API
[rsdk.streams.createCorrelation](https://leoplatform.github.io/Nodejs/modules/index.StreamUtil.html#createCorrelation)
to make one for you.  [What is correlation_id?](../../../../rstreams-guides/core-concepts/fundamentals/#correlation-id)

Normally, we let the SDK set the other things on the `BaseEvent` for us.  If we don't include the `event` 
attribute, which is what queue to send the event to, then the downstream `load` stream's default
queue value will be put on the event and used to send the event to that queue.  The second argument
to the `load` on [Line 28](#ex2-28) is the default queue to send events to that don't have the `event` attribute to tell
the SDK which queue to send things to.

rstreams-example.peopleplus

{{< collapse-light "Example 2 code" true>}}
```typescript {linenos=inline,anchorlinenos=true,lineanchors=ex2}
import { BaseEvent, ReadEvent, ReadOptions, RStreamsSdk } from "leo-sdk";
import { PersonRaw, Person } from '../lib/types';

async function main() {
  const rsdk: RStreamsSdk  = new RStreamsSdk();
  const es = rsdk.streams.eventstream;
  const botId = 'rstreams-example.people-to-peopleplusandus';

  const readOpts: ReadOptions = {
    start: 'z/2022/04/20',
    limit: 5
  }

  await rsdk.streams.pipeAsync(
    rsdk.read<PersonRaw>(botId, 'rstreams-example.people', readOpts),
    rsdk.throughAsync<ReadEvent<PersonRaw>, BaseEvent<Person>>((event) => {
      const queue = event.payload.location.country === 'United States' ? 
                                                       'rstreams-example.peopleplus' : 
                                                       'rstreams-example.peopleplus-us'
      const result: BaseEvent<Person> = {
        event: queue,
        payload: translate(event.payload),
        event_source_timestamp: event.event_source_timestamp,
        correlation_id: rsdk.streams.createCorrelation(event)
      };
      return result;
    }),
    rsdk.load(botId, 'rstreams-example.peopleplus', {force: true})
  );
}

/**
 * @param p The type from the public API we want to modify
 * @returns The new type that is flatter and gets rid of some attributes don't need
 */
 function translate(p: PersonRaw): Person {
    return {
      gender: p.gender,
      firstName: p.name.first,
      lastName: p.name.last,
      email: p.email,
      birthDate: p.dob.date,
      nationality: p.nat,
      addr: {
        addr1: p.location.street.number + ' ' + p.location.street.name,
        city: p.location.city, 
        state: p.location.state,
        country: p.location.country,
        postcode: p.location.postcode,
        longitude: p.location.coordinates.longitude,
        latitude: p.location.coordinates.latitude,
        tzOffset: p.location.timezone.offset,
        tzDesc: p.location.timezone.description
      }
    }
  }

(async () => {
  await main();
})()

```
{{</ collapse-light >}}

Note: [Person types referenced in the examples](../../#person-types-referenced-in-the-examples)