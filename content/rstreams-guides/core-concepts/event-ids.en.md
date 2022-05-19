---
title: "Event IDs & Searching"
date: "2022-05-19T16:20:15.764Z"
description: "Event IDs."
draft: false
weight: 4
version:
  current: "1.0"
  all:
    - version: "1.0"
      date: "2022-05-19T16:20:15.764Z"
  _render:
    fileName: "event-ids"
    language: "en"
---
{{< collapse-light "ToC" >}}
{{< toc  >}}
{{</ collapse-light >}}

### Summary
All RStreams events have a system-generated event ID, also known as eid.  This is set on an event when the event is first 
processed into a queue by RStreams, using the date/time of that ingestion as the basis of the ID.

### Event IDs
An event ID, again also called `eid`, uniquely identifies the position of a data event in a queue and the date/time part of the 
event ID is in UTC.  Here’s an event ID:

`z/2022/03/16/06/10/1647411035490-0003221`

- `z/`  all event IDs start with this to identify them as an event ID
- `z/2022/` year
- `z/2022/03/` month
- `z/2022/03/16/` day
- `z/2022/03/16/06/` hour
- `z/2022/03/16/06/10/` minute
- `z/2022/03/16/06/10/1647411035490/` millisecond
- `z/2022/03/16/06/10/1647411035490-0003221` position in millisecond

### Searching
Events can be searched within a queue based on a complete or partial event ID.  When searching in botmon on a queue’s detail page events
tab search field, every one of the above bullets is a valid event ID including
the first one, `z/`.  Searching with just `z/` will search on any event ID.  It’s not a very interesting search but it’s valid.

Searching on this `z/2022/03/16/06/` will start searching for events at the very beginning of the sixth hour on march 16th 2022 UTC in a given queue.