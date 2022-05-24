---
title: "Getting Started"
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
    fileName: "getting-started"
    language: "en"
---

{{< collapse-light "ToC" >}}
{{< toc  >}}
{{</ collapse-light >}}

{{< notice info >}}
This primer provides exactly enough knowledge of streaming concepts for a developer to successfully
{{</ notice >}}

{{< notice info >}}
This primer provides exactly enough knowledge of streaming concepts for a developer to successfully 
write streaming applications using the RStreams SDK and bus.  It is not intended as an exhaustive 
treatise on the vagaries of Node streams.  We all have work to do.
{{</ notice >}}

# Are you setup to run the examples?
{{< collapse "Expand this section if you're not sure" >}}

All examples in the SDK documentation assume that when these apps run, the RStreams SDK can discover the configuration 
it needs.  The config it needs is the AWS resource IDs of the RStreams Bus instance deployed in your AWS account.  Things
like the ID of the kinesis stream used by the bus and so on.

Of course, in a production environment the SDK will get the config in an intelligent and safe manner, say from 
AWS Secrets Manager. See the [RStreams Flow Configuring RStreams](/rstreams-flow/configuring-rstreams) doc.

Here's the [typescript type](https://leoplatform.github.io/Nodejs/interfaces/index.ConfigurationResources.html) of the config.

## Get the config
You will first need to get this config.  By default, the RStreams Bus puts a secret in secrets manager that is the JSON config blob.  The secret will be named ``rstreams-<bus name>``.  Go get the JSON config from this secret.

## Save the config
### As a file
Create a file named ``rstreams.config.json`` and put it in the same directory you are running your app in
or in any parent director and the SDK will just find it and use it.

### As an environment variable
Create an environment variable named ``RSTREAMS_CONFIG`` whose value is the config JSON blob.

### As an argument to the SDK itself
Create a variable in the code that is the config and then pass it into the SDK's constructor.

```typescript {linenos=inline}

const RSTREAMS_BUS_CONFIG: ConfigurationResources = {
    "Region": "some-value", 
    "LeoStream": "some-value",
    "LeoCron": "some-value", 
    "LeoSettings": "some-value",
    "LeoEvent": "some-value", 
    "LeoKinesisStream" : "some-value",
    "LeoFirehoseStream": "some-value", 
    "LeoS3": "some-value"
};

const rsdk: RStreamsSdk  = new RStreamsSdk(RSTREAMS_BUS_CONFIG);

```
{{</ collapse >}}

# Principle Operations
**Write**  
You're going to want to write to the bus, meaning send a data event to a specific queue of the bus.  Queues maintain
their order, with the newest at the front of the queue and the oldest data at the back of the queue.

**Read**  
You're going to want to read from the bus, meaning read events from a queue of the bus.  You typically read from
the last place you read from last in a queue.  Or, if this is your bot's first time reading from a queue then 
the oldest event in the queue is the default.  Or, you can read events in a specific range back in time in the queue.

**Transform**  
You're going to want to read from the bus, change the data somehow or cause a side effect like writing to some database,
and then write the changed data to a different queue.

# Write to the bus
You want to write data to an RStreams qeuue.

TODO: include link to git project so can checkout and run

## Write a single object to the bus

Let's say we want to populate an RStreams queue with people we retrieve from an API that generates random people.
The steps to do that are

1. [Line 6](#randomperson-6) : Create an instance of the SDK
1. [Line 7](#randomperson-7) : Go get a single random person from a public API using the [Axios library](https://www.npmjs.com/package/axios)
1. [Line 8](#randomperson-8) : Call the [putEvent](https://leoplatform.github.io/Nodejs/classes/index.RStreamsSdk.html#putEvent) SDK API to send an event up to the RStreams Bus
   1. The first argument is the ID of the bot this code is running as
   1. The second argument is the ID of the RStreams queue to send the event to
   1. The third argument is the JSON object to send

```typescript {linenos=inline,anchorlinenos=true,lineanchors=randomperson}
import { ConfigurationResources, RStreamsSdk } from "leo-sdk";
import { PersonRaw, PersonRawResults } from "../lib/types";
import axios from "axios";

async function main() {
  const rsdk: RStreamsSdk  = new RStreamsSdk();
  const person = await getRandomPerson();
  await rsdk.putEvent('rstreams-example.load-people', 'rstreams-example.people', person);
}

async function getRandomPerson(): Promise<PersonRaw> {
  const NUM_EVENTS = 1;
  const url = `https://randomuser.me/api/?results=${NUM_EVENTS}&` + 
              `exc=login,registered,phone,cell,picture,id&noinfo`;
  const {data, status} = await axios.get<PersonRawResults>(url);
  
  if (status !== 200) {
    throw new Error('Unable to get randomPeople from https://randomuser.me API: ' + status);
  }
  
  console.log('Person: ' + data.results[0].name.first + ' ' + data.results[0].name.last);

  return data.results[0];
}

(async () => {
  await main();
})()
```

{{< collapse-light "PersonRaw & PersonRawResults interfaces" >}}
```typescript {linenos=inline}
export interface PersonRaw {
    gender: string;
    name: {
        title: string;
        first: string;
        last: string;
    }
    location: {
        street: {
            number: number;
            name: string;
        }
        city: string;
        state: string;
        country: string;
        postcode: number;
        coordinates: {
            longitude: string;
            latitude: string;
        }
        timezone: {
            offset: string;
            description: string;
        }
    }
    email: string;
    dob: {
        date: string;
        age: number;
    }
    nat: string;
}

export interface PersonRawResults {
    results: PersonRaw[];
}
```
{{</ collapse-light >}}


**View results in Botmon**  
If you go to Botmon, you will see that the `rstreams-example.people` queue now has an event in it.
{{< collapse "Expand for Botmon screenshots" >}}

1. Go to Botmon and search for `rstreams-example.people` in the search field
![Botmon Find Person](../images/botmon-find-person-queue.png  "40%" )

1. Botmon now shows a visual representation of the bot and the queue, click on the gear icon after hovering over the queue and then click on Events
![Botmon People Queue](../images/rstreams-example-people-queue1.png "30%" )

1. Botmon now shows the events loaded into the queue
![Botmon People Queue Events](../images/botmon-example-person-queue1.png "70%" )

{{</ collapse >}}
## Write multiple objects to the bus
So, instead of reading one person from the public API we used in the example above, let's say we get 100 people at a time
from the public API and we want to write them to the bus.  Here's what that looks like.

```typescript {linenos=inline,anchorlinenos=true,lineanchors=randompeopleloop}
import { ConfigurationResources, RStreamsSdk } from "leo-sdk";
import { PersonRawResults } from "../lib/types";
import axios from "axios";

async function main() {
  const rsdk: RStreamsSdk  = new RStreamsSdk();
  const people = await getRandomPeople();

  //HINT: this will have very bad performance. This is just to illustrate a point.
  //      Don't use putEvent in a loop this way in practice!
  for (const person of people.results) {
    await rsdk.putEvent('rstreams-example.load-people', 'rstreams-example.people', person);
  }
}

async function getRandomPeople(): Promise<PersonRawResults> {
  const NUM_EVENTS = 100;
  const url = `https://randomuser.me/api/?results=${NUM_EVENTS}&` + 
              `exc=login,registered,phone,cell,picture,id&noinfo`;
  const {data, status} = await axios.get<PersonRawResults>(url);
  
  if (status !== 200) {
    throw new Error('Unable to get randomPeople from https://randomuser.me API: ' + status);
  }
  
  console.log('Person: ' + data.results[0].name.first + ' ' + data.results[0].name.last);

  return data;
}

(async () => {
  await main();
})()
```

The only difference in this example is that we pass in 100 to the public API, getting back 100 objects as
an array.  We then loop through them, making a connection to the RStreams Bus for each and every event.
It's simple and it works but this is bad.  The `putEvent` API is really only meant for one or maybe a
handful of events.  To understand why, consider what the RStreams SDK is doing when you call `putEvent`.

1. It's opening a connection to AWS Kinesis
1. It sending the single event on that connection each time to Kinesis
1. The event flows through Kinesis until an RStreams Kinesis processor reads the single event and writes it to
the RStreams Dynamo DB queue table, putting the event in the correct queue

RStreams is designed to handle the continuos generation of data events that flow into a given queue, is read from
that queue and mutated and then sent to other queues.  It is today doing this with very large amounts of 
concurrently received events.  The RStreams SDK has a better way to work with sending larger amounts of data
to the bus, meaning to an RStreams queue.

## Stream multiple objects to the bus fast

It's time to tackle the idea of streams.  If you aren't well versed on streams, jump over and read the [Streams Primer](xx).  It's 
short and sweet and may well convert you to streams if you aren't already.

```typescript {linenos=inline,anchorlinenos=true,lineanchors=randompeopleloop}
import { RStreamsSdk } from "leo-sdk";
import { PersonRawResults } from "../lib/types";
import axios from "axios";

async function main() {
  const rsdk: RStreamsSdk  = new RStreamsSdk();
  const es = rsdk.streams.eventstream;
  const people = await getRandomPeople();

  await rsdk.streams.pipeAsync(
    es.readArray(people.results),
    rsdk.load('rstreams-example.load-people', 'rstreams-example.people', 
              {records: 25, time: 5000, useS3: true})
  );
}

async function getRandomPeople(): Promise<PersonRawResults> {
  const NUM_EVENTS = 100;
  const url = `https://randomuser.me/api/?results=${NUM_EVENTS}&` + 
              `exc=login,registered,phone,cell,picture,id&noinfo`;
  const {data, status} = await axios.get<PersonRawResults>(url);
  
  if (status !== 200) {
    throw new Error('Unable to get randomPeople from https://randomuser.me API: ' + status);
  }

  return data;
}

(async () => {
  await main();
})()
```