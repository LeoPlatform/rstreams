---
title: "Event Handling Semantics"
date: 2022-04-04T11:02:05+06:00
description: "How event handling works in RStreams"
draft: false
weight: 1
---

{{< collapse-light "ToC" >}}
{{< toc  >}}
{{</ collapse-light >}}

RStreams was designed so that a developer can register a bot (lambda function) that the RStreams Bus will
invoke whenever there are new events to be read from a given queue.

It is expected that events could be, and often will be, continuously being produced and flowing into a queue.

So, the desire is for your bot to be invoked and get new events from the a queue and process them, doing
this for as long as it safely can before shutting itself down.  Bots are usually just lambda functions
and so lambda functions must shutdown every 15 minutes in AWS.  If you don't, AWS will forcefully
terminate your lambda - not good.

By default, the source stream that pulls data from a queue for you to process or handle in your lambda
will only do so for 80% of the time that your bot has to live if it's a lambda, expecting that your bot
can finish processing and flush the queue of already received events within the remaining 20% of the time.  Of
course, there's config on the source stream allowing you to fine tune this, though in almost experience has shown
that this default works most of the time.

When your bot stops reading/processing data from a queue and shuts itself down, immediately the RStreams Bus
detects this and if there are any more events that your bot hasn't handled yet, will immediately 
invoke your bot to once again wake up and read/process events from the queue it is registerd as an event
handler for.

If you are creating a stand-alone node application that uses the RStreams Node SDK to read/process events
from a queue that you start by running your app on your dev box or on an EC2 instance, then when your app
shuts down nothing restarts it.  Why?  Well, your app wasn't registered as an event handler for a queue.
It's just an app that can read from a queue.

All the examples in the RStreams Node SDK section are
done as stand-alone runnable apps since the Node SDK doesn't know or care whether it is embedded in
a Node app, a Node lambda function or a Fargate for that matter.  However, every example in that section
is directly applicable to be used as a lambda function event handler.  Again, the only difference is that the
RStreams Bus knows about bots that are registered as event handlers and ensures that there is exactly one instance
of that bot running when there are events waiting to be handled.