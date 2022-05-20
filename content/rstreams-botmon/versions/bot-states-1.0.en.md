---
title: "Bot States"
date: "2022-05-19T17:55:12.078Z"
weight: 3
draft: false
version:
  version: "1.0"
  current: "1.1"
  all:
    - version: "1.0"
      date: "2022-05-19T17:55:12.078Z"
    - version: "1.1"
      date: "2022-05-20T07:18:18.878Z"
  render:
    fileName: "bot-states"
    language: "en"
_build:
  render: "always"
  list: "never"
---

{{< collapse-light "ToC" >}}
{{< toc  >}}
{{</ collapse-light >}}


# Summary
A bot is a logical representation of code that will run, usually a serverless lambda function.

# States

**Nominal State**  
All is well and the bot is functioning normally.
![Bot State Nominal](../images/bot-state-nominal.png "60px|left")

**Warning State**  
The bot is experiencing either a delay (lag) in either reading upstream events or writing downstream events.
![Bot State Warning](../images/bot-state-warning.png "60px|left")

**Error State**  
The bot is returning uncaught errors to the logs and something is wrong.
![Bot State Error](../images/bot-state-error.png "60px|left")

**Rogue State**  
The bot has gone “rogue” and been stopped by RStreams because ten successive invocations returned uncaught errors.
![Bot State Rogue](../images/bot-state-rogue.png "60px|left")

{{< notice info >}}
Note the pause icon on the Error State image above<del class="tooltip">.<span class="top">Removed</span></del> <del class="tooltip"> T<span class="top">Removed</span></del><ins class="tooltip">w<span class="top">Added</span></ins>h<del class="tooltip">at<span class="top">Removed</span></del><ins class="tooltip">ich<span class="top">Added</span></ins> indicates that the bot was manually paused and is no longer executing.
Bots may be paused in whatever state they currently occupy.  Rogue bots are by definition paused.
{{</ notice >}}