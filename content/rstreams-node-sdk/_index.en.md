---
title: "RStreams Node SDK"
date: 2022-04-04T11:02:05+06:00
icon: "fas fa-terminal" # fontawesome icon : https://fontawesome.com/icons
description: "The smart SDK for Node/Typescript."
type : "docs"
weight: 4
---

This is the RStreams Node SDK, a client-side library designed to interact with instances of an [RStreams Bus](/rstreams-bus).



{{< notice info >}}This assumes you've got an [RStreams Bus](/rstreams-bus) instance running to connect to.  If you don't, head on over to
the [RStreams Bus](/rstreams-bus) section first.  <br/><br /> Also, the [RStreams Bus](/rstreams-flow) gets your Node/Typescript project setup in a jiffy with the right SDK config, ready to run local, debug and deploy if you haven't already done that.
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

# Do you know how to access Botmon?
{{< collapse "Expand this section if you're not sure" >}}
Botmon is a visualization, monitoring and debugging tool that installs with an instance of the RStreams as a website.  Most
examples will have you use Botmon to visualize what's happening and to help diagnose issues.

TODO: how do they know how to access botmon?


{{</ collapse >}}

The examples in this section are geared toward creating apps that use the RStreams SDK to interact with an RStreams bus instance 
regardless of how those apps are written.  As such, the examples are simply standalone runnables node applications.  The
examples highlight the config that are available to control reading and writing in such apps.

The [RStreams Flow](../rstreams-flow) section focuses on apps written specifically as bots that are deployed as lambda
functions and go into great detail on the specific use cases applicable to serverless applications.