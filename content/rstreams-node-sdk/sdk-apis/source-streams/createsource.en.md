---
title: "Create Source"
date: "2022-05-19T17:55:12.078Z"
weight: 2
draft: false
version:
  version: 1
  current: 1
  all:
    - version: 1
      date: "2022-05-19T17:55:12.078Z"
  render:
    fileName: "createsource"
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

[API Doc](https://leoplatform.github.io/Nodejs/classes/index.RStreamsSdk.html#createSource)

This function creates a source stream, fed by events from the array that you return from your
[CreateSourceFunction](https://leoplatform.github.io/Nodejs/modules/index.html#CreateSourceFunction),
to act as the first step in a pipe.

## When would I use this?
* I want to create a pipe and seed the pipe from data from a database at scale
* I want to create a pipe and seed the pipe with data from an API at scale
* I want to create a pipe and seed the pipe with data from [fill-in-the-blank] at scale

## Runnable Examples
### Example 1

There's a fair bit going on here so stay with me.  We read events from
from a public free API that generates random people, seeding a pipe by creating a source stream
using the `createSource` API and then write them to the bus landing in the `rstreams-example.people`
queue.

* [Line 8](#ex1-8)
  We define a type for the state we want the SDK to pass into each time it calls our function
  to generate more content to feed the stream.  The `createSource` function lets you specify
  that you want state passed in with each invocation of your function and then lets you initialize
  that state for the first time your function is called.  Then, you can change that state in your
  function and it will be passed to each subsequent invocation.
* [Line 10](#ex1-10)
  We are defining the [options](https://leoplatform.github.io/Nodejs/interfaces/index.CreateSourceOptions.html)
  we want to pass into the `createSource` function.  Here we are telling the SDK to close the source stream
  and thus shutdown the pipe after ten seconds.
* [Line 11](#ex1-11)
  We are creating an instance of our state.  We only want to call out to the free public API that generates
  random people for us five times.  So, we initialize our state to 5 and then in our actual function, below,
  we decrement that state.  When it gets to zero, we simply return from the function which tells the SDK
  to close the stream and shut down the pipe.
* [Line 14](#ex1-14)
  We are creating a new source steam and specifying that the source stream will be returning arrays
  of `PersonRaw` objects and also that we are going to be asking the SDK to pass in a state object
  of type `SourceState.`  Then we pass as the first argument to the `createSource` function
  an anonymous function of type [CreateSourceFunction](https://leoplatform.github.io/Nodejs/modules/index.html#CreateSourceFunction)
  that wil be called each time the stream needs more data.  There is an optional argument which is state
  that will be passed in by the SDK on our behalf each time our function is invoked.
* Lines [15](#ex1-15) and [16](#ex1-16)
  We grab the state into a local variable and then decrement that state number itself so that it will
  be changed on subsequent invocations to this function.
* Lines [17](#ex1-17) and [18](#ex1-18)
  If our counter is at 0, we don't want to continue and so we return nothing which tells the SDK we're don.
  It will close our stream which will cause the pipe to flush and then close down.
* Lines [20](#ex1-20) and [21](#ex1-21)
  We're not done so lets get more data.  Line 20 is a call to a function below that just makes a call out
  to get 100 random people objects from a public free API.  Line 21 just returns the array of `PersonRaw`
  objects we got from the API.
* [Line 23](#ex1-23)
  The second argument and the third argument to the `createSource` function: the optional options and optional
  initial state respectively.
* [Line 24](#ex1-24)
  We create a write stream sink to write all events that make it to the sink to the 
  `rstreams-example.people` queue doing so as the bot `rstreams-example.load-people-faster`.


{{< collapse-light "Example 1 code" true >}}
```typescript {linenos=inline,anchorlinenos=true,lineanchors=ex1}
import { CreateSourceOptions, RStreamsSdk } from "leo-sdk";
import { PersonRawResults, PersonRaw } from '../lib/types';
import axios from "axios";

async function main() {
  const rsdk: RStreamsSdk  = new RStreamsSdk();

  interface SourceState {numApiCalls: number;}

  const opts: CreateSourceOptions = {milliseconds: 10000};
  const state: SourceState = {numApiCalls: 5};

  await rsdk.streams.pipeAsync(
    rsdk.createSource<PersonRaw, SourceState>(async (state) => {
        const numApiCalls = state.numApiCalls;
        state.numApiCalls--;
        if (numApiCalls === 0) {
            return;
        } else {
            const prr: PersonRawResults = await getRandomPeople();
            return prr.results;
        }
    }, opts, state),
    rsdk.load('rstreams-example.load-people-faster', 'rstreams-example.people', 
              {records: 25, time: 5000, useS3: true})
  );
}

async function getRandomPeople(): Promise<PersonRawResults> {
  const NUM_EVENTS = 100;
  const url = `https://randomuser.me/api/?results=${NUM_EVENTS}&exc=login,registered,phone,cell,picture,id&noinfo`;
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
{{</ collapse-light >}}


Note: [Person types referenced in the examples](../../#person-types-referenced-in-the-examples)

