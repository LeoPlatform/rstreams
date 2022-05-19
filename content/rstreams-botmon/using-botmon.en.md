---
title: "Using Botmon"
date: "2022-05-19T16:20:15.764Z"
weight: 2
draft: false
version:
  current: "1.0"
  all:
    - version: "1.0"
      date: "2022-05-19T16:20:15.764Z"
  _render:
    fileName: "using-botmon"
    language: "en"
---

{{< collapse-light "ToC" >}}
{{< toc  >}}
{{</ collapse-light >}}

{{< notice info >}}
This article assumes you have a working [installation of an RStreams Bus](../../rstreams-bus/getting-started) and
[know how to access botmon](../getting-started/#accessing-botmon).
{{</ notice >}}

# Summary
This article explains how to reason about data moving through the RStreams bus while explaining the basics of botmon, queues and events.
If you have one of these questions, read on:

* How do I trace a data event’s path as it moves through the bus?
* How do I debug where my data event went bad?
* How do I find out where I’ve got a bug as data moves through the bus?

# Botmon to the Rescue
The answer to all of the above questions lies with botmon, RStreams’ monitoring and visualization tool.
Botmon allows engineers to visually understand what data is flowing where in the bus and provides excellent tools
to diagnose issues like the following:

* What is the structure of data that flows through the bus?
* How do I find a given event to diagnose something?
* Tracing upstream. My data event is missing an attribute I expected to be there.  Where did it get lost?
* Tracing downstream. My data event never made it to my code.  Why?

Let’s answer these questions one at a time, building on our knowledge of how to use botmon to solve real problems with each new question.

# What is the structure of data that flows through the bus?

Events travel through the queues of the bus.


#### Each event has an [event ID](../../rstreams-guides/core-concepts/event-ids).
#### Each event shares a common structure.
```JSON {linenos=inline,anchorlinenos=true,lineanchors=eventstruct}
{
  "id": "id_of_bot",
  "event": "id_of_the_queue",
  "event_source_timestamp": 1614185828000, // timestamp of the initial event
  "timestamp": 1614185828000, // timestamp of this event
  "correlation_id": { // information to track what created this event
    "source": "previous_queue_id",
    "start": "z/2021/02/24/16/50/1614185855405-0000000", // first event id included
    "end": "", // last event id included (optional)
    "units": 1 // number of records included (optional, defaults to 1)
  },
  "eid": "z/2021/02/24/16/57/1614185855405-0000000",
  "payload": {} // your custom data
}
```
> **2** : id is the ID of the bot that put the event in this queue  
> **3** : event is the ID of the queue this event is in  
> **4** : event_source_timestamp is when the original event far upstream entered the first queue that this and all subsequent events stem from (see the note below)  
> **5** : timestamp is when this data event entered this queue  
> **6-11** - correlation_id is how this event flowed to this queue (more later on this)  
> **12** : eid is the event ID (see above)  
> **13** : payload is the data of the event which can be anything (an order, an item, whatever)

#### Each queue expects the payload of the event to be something specific to that queue

#### Events can be correlated
Read the [Fundamentals Section on Correlation ID](../../rstreams-guides/core-concepts/fundamentals/#correlation-id)

# How do I find a given event to diagnose something?
Something is breaking.  Maybe lag is increasing somewhere.  Maybe you’ve got errors in a bot log in cloud watch.  Maybe a bot is going rogue
 because it is erroring continuously (check out this quick [article on bot states](../bot-states)) 
 and you need to understand why.  Where do you start?  You need these things to begin diagnosing the problem:

- An idea of where in the many streams something is going wrong, the queues that lead up to the bot where something is going wrong for example.
- One or both of these, depending on what you’re trying to diagnose
    - An idea of when, as far as time is concerned, there’s an example of an event that can show us what went wrong
    - An object identifier or other string on an event you can search on to find the exact event you want
- Knowledge of how to search in a queue

The botmon home page shows bots that are having troubles.  If you don’t have specifics of what is happening, start there for bots that
experience increased lag or erroring or have gone rogue.

## Finding an Event
Diagnosing an issue is 90% just finding an example of a bad event to pursue or an event that is causing a problem elsewhere that you need to drill in on.
Go to a queue in botmon, click on the detail (gear icon when hover) and then click on the `Events` tab.  The text field at the top
lets you search.  Here's how.

### Text Search
Just type text you know is in an event and hit enter.

### Attribute Search
Queries that start with `$$.some_attribute_name` begin looking at the root of the JSON object. Queries that start with `$.some_attribute_name` begin
looking in the payload of the data event.  The following looks in the payload attributes status to find any events that indicate it is raining. Both 
do the same thing.

```javascript
$.status == 'raining'
$$.payload.status == 'raining'
```

### Event ID / Date Search

The following are valid searches and will find the first object at the position indicated by the date/time stamp with however much resolution is
provided.

```javascript
// This looks for an exact event with this EVENT ID
z/2022/03/16/20/52/1647463953511-0001195

// This looks for the first event in March 2022
z/2022/03
```

### Combined Search
You can combine event ID, text and attribute searching to do a more complex search.  Here are valid searches:


```javascript
// Searches on the given event ID and the text term and with an attribute search
EVENT_ID <space> TEXT_TERM <space> ATTRIBUTE_SEARCH

// Searches on the given event ID and attribute
EVENT_ID <space> ATTRIBUTE_SEARCH

// Searches on the given event ID and text term
EVENT_ID <space> TEXT_TERM

// Searches on the given text term and attribute
TEXT_TERM <space> ATTRIBUTE_SEARCH
```


