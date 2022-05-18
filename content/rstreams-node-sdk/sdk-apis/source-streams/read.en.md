---
title: "Read"
date: "2022-05-18T18:19:42.651Z"
weight: 1
draft: false
version: "1.0"
---

{{< collapse-light "ToC" >}}
{{< toc  >}}
{{</ collapse-light >}}

{{< notice info >}}You need to understand what a [pipe and stream step in that pipe](../../../streams-primer) is AND 
nothing comes for free.  The cost of working with large amounts of data in near real-time environments
with RStreams is you have to think about what you are doing and what it means with respect to
reading and writing.  It is strongly recommended you read the [Read/Write at Scale](../../../read-write-scale) 
article at some point.{{</ notice >}}

[API Doc](https://leoplatform.github.io/Nodejs/classes/index.RStreamsSdk.html#read)

This function creates a source stream, fed by events from the specified RStreams queue, to act as the first step in a pipe.  Just
specify the RStreams queue and config to read efficiently and you're done.

## When would I use this?
* I want to use a pipe to have a little more control over processing
* The data I want to process comes from an RStreams queue

## Runnable Examples
### Example 1

This example reads 100 events from the `rstreams-example.peopleplus` RStreams queue and then shuts down the pipe.
The `read` stream sends the events to the [devnull](../../sink-streams/devnull) stream.
illustrates code running as a bot with ID of `rstreams-example.people-to-peopleplus` and getting exactly two events
from queue `rstreams-example.people`, starting at position `z/2022/04/20`, and then transforms each
event's JSON by dropping unwanted attributes and simplifying the JSON structure.  It also calls a totally free, public API that given
 a country name returns the standard two-char country code which we tack on to the event after
which we return the modified event which tells the SDK to push it to the
`rstreams-example.people-to-peopleplus` queue.

Two things to note here.  First is that the transform function is typed for both the callback
and async variety but please only use the async version going forward - all new features
are only being added to the async approach.

Second, there are actually three arguments to the `transform` function, even though in our example we 
are only using the first.  What is stored in an RStreams queue is an instance of a 
[ReadEvent](https://leoplatform.github.io/Nodejs/interfaces/lib_types.ReadEvent.html) where the `payload` attribute is the data the queue exists for. 
The first argument is just the payload pulled out since usually that's all you need.  The second argument
is the full event from the queue with the event ID and other sometimes useful things.  The third argument
is only used in the callback version where you call `done` exactly once to trigger the callback.  It's there
for backwared compat.  Don't use it on new things.

The `devnull` at the end just acts as a sink and passing in true tells it to log.  That's all it's for, to act as a sink.
See the doc on [Devnull](../devnull) for more details.

{{< collapse-light "Example 1 code" true>}}
```typescript {linenos=inline,anchorlinenos=true,lineanchors=ex1}
import { ReadOptions, RStreamsSdk } from "leo-sdk";
import { Person } from "../lib/types";
import axios from "axios";

async function main() {
  const rsdk: RStreamsSdk  = new RStreamsSdk();

  const opts: ReadOptions = {
    start: 'z/2022/04/20',
    limit: 5
  }

  await rsdk.streams.pipeAsync(
    rsdk.read<Person>('rstreams-example.peopleplus-to-devnull',
                      'rstreams-example.peopleplus', opts),
    rsdk.streams.devnull(true)
  );
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
➜  rstreams-runnable-examples ts-node apps/read-events-simple.ts
Reading event from z/2022/04/20 
devnull {
  "id": "rstreams-example.people-to-peopleplus",
  "event": "rstreams-example.peopleplus",
  "payload": {
    "gender": "male",
    "firstName": "Herman",
    "lastName": "Morris",
    "email": "herman.morris@example.com",
    "birthDate": "1959-04-25T19:28:13.361Z",
    "nationality": "IE",
    "addr": {
      "addr1": "9393 Mill Lane",
      "city": "Killarney",
      "state": "Galway City",
      "country": "Ireland",
      "postcode": 34192,
      "longitude": "-48.3422",
      "latitude": "23.2617",
      "tzOffset": "-12:00",
      "tzDesc": "Eniwetok, Kwajalein",
      "countryCode": "IE"
    }
  },
  "event_source_timestamp": 1650415833983,
  "eid": "z/2022/04/21/20/37/1650573479245-0000000",
  "correlation_id": {
    "source": "rstreams-example.people",
    "start": "z/2022/04/20/00/50/1650415834886-0000000",
    "units": 1
  },
  "timestamp": 1650573479299
}
devnull {
  "id": "rstreams-example.people-to-peopleplus",
  "event": "rstreams-example.peopleplus",
  "payload": {
    "gender": "male",
    "firstName": "Herman",
    "lastName": "Morris",
    "email": "herman.morris@example.com",
    "birthDate": "1959-04-25T19:28:13.361Z",
    "nationality": "IE",
    "addr": {
      "addr1": "9393 Mill Lane",
      "city": "Killarney",
      "state": "Galway City",
      "country": "Ireland",
      "postcode": 34192,
      "longitude": "-48.3422",
      "latitude": "23.2617",
      "tzOffset": "-12:00",
      "tzDesc": "Eniwetok, Kwajalein",
      "countryCode": "IE"
    }
  },
  "event_source_timestamp": 1650415833983,
  "eid": "z/2022/04/22/16/39/1650645572667-0000134",
  "correlation_id": {
    "source": "rstreams-example.people",
    "start": "z/2022/04/20/00/50/1650415834886-0000000",
    "units": 1
  },
  "timestamp": 1650645572513
}
devnull {
  "id": "rstreams-example.people-to-peopleplus",
  "event": "rstreams-example.peopleplus",
  "payload": {
    "gender": "male",
    "firstName": "Tomothy",
    "lastName": "Rogers",
    "email": "tomothy.rogers@example.com",
    "birthDate": "1967-01-22T18:32:59.793Z",
    "nationality": "AU",
    "addr": {
      "addr1": "6582 Adams St",
      "city": "Kalgoorlie",
      "state": "Australian Capital Territory",
      "country": "Australia",
      "postcode": 8157,
      "longitude": "33.3086",
      "latitude": "49.2180",
      "tzOffset": "+5:30",
      "tzDesc": "Bombay, Calcutta, Madras, New Delhi",
      "countryCode": "AU"
    }
  },
  "event_source_timestamp": 1650415833985,
  "eid": "z/2022/04/22/16/39/1650645572667-0000135",
  "correlation_id": {
    "source": "rstreams-example.people",
    "start": "z/2022/04/20/00/50/1650415834886-0000001",
    "units": 1
  },
  "timestamp": 1650645572690
}
devnull {
  "id": "rstreams-example.people-to-peopleplus",
  "event": "rstreams-example.peopleplus",
  "payload": {
    "gender": "male",
    "firstName": "Herman",
    "lastName": "Morris",
    "email": "herman.morris@example.com",
    "birthDate": "1959-04-25T19:28:13.361Z",
    "nationality": "IE",
    "addr": {
      "addr1": "9393 Mill Lane",
      "city": "Killarney",
      "state": "Galway City",
      "country": "Ireland",
      "postcode": 34192,
      "longitude": "-48.3422",
      "latitude": "23.2617",
      "tzOffset": "-12:00",
      "tzDesc": "Eniwetok, Kwajalein",
      "countryCode": "IE"
    }
  },
  "event_source_timestamp": 1650415833983,
  "eid": "z/2022/04/22/16/39/1650645583644-0000111",
  "correlation_id": {
    "source": "rstreams-example.people",
    "start": "z/2022/04/20/00/50/1650415834886-0000009",
    "units": 10
  },
  "timestamp": 1650645583447
}
devnull {
  "id": "rstreams-example.people-to-peopleplus",
  "event": "rstreams-example.peopleplus",
  "payload": {
    "gender": "male",
    "firstName": "Tomothy",
    "lastName": "Rogers",
    "email": "tomothy.rogers@example.com",
    "birthDate": "1967-01-22T18:32:59.793Z",
    "nationality": "AU",
    "addr": {
      "addr1": "6582 Adams St",
      "city": "Kalgoorlie",
      "state": "Australian Capital Territory",
      "country": "Australia",
      "postcode": 8157,
      "longitude": "33.3086",
      "latitude": "49.2180",
      "tzOffset": "+5:30",
      "tzDesc": "Bombay, Calcutta, Madras, New Delhi",
      "countryCode": "AU"
    }
  },
  "event_source_timestamp": 1650415833983,
  "eid": "z/2022/04/22/16/39/1650645583644-0000112",
  "correlation_id": {
    "source": "rstreams-example.people",
    "start": "z/2022/04/20/00/50/1650415834886-0000009",
    "units": 10
  },
  "timestamp": 1650645583448
}

```
{{</ collapse-light >}}

Note: [Person types referenced in the examples](../../#person-types-referenced-in-the-examples)

