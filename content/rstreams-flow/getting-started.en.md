---
title: "Getting Started"
date: 2018-12-29T11:02:05+06:00
weight: 1
draft: false
---

{{< notice info >}}RStreams flow is powered by the popular [Serverless Framework](https://www.serverless.com/).  It has a very large
community and many plugins that provide a scaffold for RStreams Flow to build on.  The Serverless Framework does have some
deficiencies, however, it is believed that it is extensible enough that these can be improved or worked around.
{{</ notice >}}

# Summary
Get up an running to develop with RStreams with the sample app in less than 30 minutes.

# Install Node and NPM
[Install Node and NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).
RStreams Flow supports whatever version of Node JS is deployable to AWS lambda. At the time of this article,
that's Node 14.

# Install the Serverless Framework
Install the [Serverless Framework](https://www.serverless.com/framework/docs/getting-started) as a global package on your development box.

```json 
npm install -g serverless
```

# Get RStreams Bus Config Secret
You must have an RStreams Bus instance to access.  Each bus instance installs a secret in AWS secrets manager named `rstreams-{busName}`.
If you go to AWS secrets manager and search on `rstreams`, you can see if one is installed.  All you need is the name of this
secret that points to a non-production instance of an RStreams bus that you can work with safely.

Many companies will install a bus in their dev or test environments.  If 
you're unsure, reach out to IT/Devops in your company. You can also [standup your own bus instance](../../rstreams-bus/getting-started) but be warned this
creates some AWS resources: Kinesis, S3, a few DynamoDB tables, a secret in Secrets Manager.  It's not much money to just
stand them up and have them turned on but if you push lots of data through your bus, it will become real money.  Be sure
to contact your IT/Devops/Engineering management on their policies around this.

# AWS Access
You are going to need to access from your laptop to the resources listed in the AWS Secrets Manager secret named for the RStreams
bus instance you wish to use.  Those resources are six DynamoDB tables, a Kinesis stream, a Firehose stream and a private S3 bucket.  Please
reach out to your IT/Devops/Eng mgt to follow your company's proscribed policy for gaining access to these resources.  If
IT/Devops/Eng mgt is just you, there are lots of [online resources](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-prereqs.html) 
on creating IAM policies.  Here are the contents of `rstreams-TestBus` that might exist in a secret for say a test environment.

{{< collapse-light "rstreams-TestBus Secret" false>}}
```json {linenos=inline,anchorlinenos=true,lineanchors=rstreamsconfigsecret}
{
  // These are DynamoDB tables
  "LeoStream":"TestBus-LeoStream-1234567",
  "LeoCron":"TestBus-LeoCron-1234567",
  "LeoSettings":"TestBus-LeoSettings-1234567",
  "LeoEvent":"TestBus-LeoEvent-1234567",
  "LeoSystem":"TestBus-LeoSystem-1234567",
  "LeoArchive":"TestBus-LeoArchive-1234567",

  // A Kinesis stream
  "LeoKinesisStream":"TestBus-LeoKinesisStream-1234567",

  // A Kinesis Firehose stream
  "LeoFirehoseStream":"TestBus-LeoFirehoseStream-1234567",

  // An S3 bucket
  "LeoS3":"testbus-leos3-1234567",

  // The region this is installed in
  "Region":"us-east-1"
}
```
{{</ collapse-light >}}

# Checkout the RStreams Flow Example Project
{{< notice info >}}RStreams Flow will provide a command line tool for generating a sample project from a template by June 30, 2022.
For now, let's just checkout the sample project and customize it.{{</ notice >}}
[Here's the git project](https://github.com/LeoPlatform/rstreams-flow-example) or just check it out:
```json
git clone https://github.com/LeoPlatform/rstreams-flow-example.git
```
 # Intro to the Project & Rename Bots/Queues
You are going to be creating two queues in your RStreams Bus instance.  You will also be running a `bot` locally, which is just a 
logical wrapper around code that interacts with an RStreams Bus.  Usually, a `bot` is a lambda function.  However, when running
locally it's just a Node JS function.  Regardless, your `bot` running locally will register its existence with the bus and we
don't want folks stepping on each other when running this sample app in your RStreams Bus instance.  So, let's rename a few things
and learn a bit about the project's organization and the sample project as we go.

First, pick a shortish name (one word, no punctuation just to keep it simple for now) that will likely be unique to you such 
as: janedoe12382 or whatever.  Then, we're going to prepend that name to all the bots and queues we define/use. It will just take a sec.

Queue `rstreams-example.weather` should be renamed `{your-prepended-name}-example.weather`.
Queue `rstreams-example.weather-transformed` should be renamed `{your-prepended-name}-example.weather-transformed`

# Create a .env.dev file
