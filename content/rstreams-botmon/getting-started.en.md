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
This article assumes you have a working [installation of an RStreams Bus](../../rstreams-bus/getting-started).
{{</ notice >}}

{{< notice info >}}
The URL for accessing Botmon and the security around it may well have been changed at your company.  This is more for a brand new installation
of an RStreams bus. The next article goes deep into what Botmon is, the problems it solves and how to use it.
{{</ notice >}}
# Summary
This article explains how to access Botmon, a webapp that provides queue and bot data visualization, data tracing, monitoring
and debugging.

# Accessing Botmon
After having installed your new RStreams Bus you need to figure out how to access it.

First, be aware that the Botmon website is deployed wide open.  TODO: Follow these instructions on securing Botmon.

1. Go to CloudFormation
1. Search on the name of your RStreams bus instance - I searched on PlaygroundBus, the bus I created in the
[RStreams Bus getting started guide](../../rstreams-bus/getting-started)
1. You should see a stack named `{busName}-Botmon`.  Go into its details.
1. This is the stack that installed the Botmon web app just FYI
1. Go to ApiGateway and search on the name of your bus
1. You should see an API for `{busName}-botmon`, go into its detail and see something like this
![Botmon API GW](../images/botmon-api-gw.png "420px|center")
1. Click on Settings on the left nav
1. Scroll down to Default Endpoint and copy the URL embedded in the paragraph
1. This is your default endpoint to Botmon, feel free to search on how to use your own domain name if you'd prefer for an API Gateway API