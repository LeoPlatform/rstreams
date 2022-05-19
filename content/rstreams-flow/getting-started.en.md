---
title: "Getting Started"
date: "2022-05-19T17:55:12.078Z"
weight: 1
draft: false
version:
  version: "1.0"
  current: "1.0"
  all:
    - version: "1.0"
      date: "2022-05-19T17:55:12.078Z"
  render:
    fileName: "getting-started"
    language: "en"
---

{{< collapse-light "ToC" >}}
{{< toc  >}}
{{</ collapse-light >}}

{{< notice info >}}RStreams flow is powered by the popular [Serverless Framework](https://www.serverless.com/).  It has a very large
community and many plugins that provide a scaffold for RStreams Flow to build on.  The Serverless Framework does have some
deficiencies, however, it is believed that it is extensible enough that these can be improved or worked around.
{{</ notice >}}

{{< notice info >}}RStreams Flow has been tested in the latest Visual Studio Code version and the examples demonstrate using VSCode.
It is known to work with other IDEs such as IntelliJ and there's nothing specific to VSCode except documentation geared toward
using VSCode.
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

# Get bus stack name
You must have an RStreams Bus instance to access.  Each bus instance installs a secret in AWS secrets manager named `rstreams-{busName}`.
The bus name is something very specific.  The RStreams Bus stack itself installs four child stacks.  One of those child
stacks is the actual bus.  So, if I have a bus installation named `PlaygroundBus` then there will be a stack named
`PlaygroundBus-Bus-<random-characters-AWS-puts-on>`.  You need this name.  Go to AWS CloudFormation and click on Stacks and
then in the search field search on the name of your bus.  In my case, I searched on the word `playground` and the five stacks
showed up the main stack and the five child stacks.  I found the exact name of the bus stack which was 
`PlaygroundBus-Bus-1JX7JSIIUQRAO`.

Be sure you are using a test bus instance.  Many companies will install a bus in their dev or test environments/accounts.  If 
you're unsure, reach out to IT/Devops in your company. You can also [standup your own bus instance](../../rstreams-bus/getting-started) but be warned this
creates some AWS resources: Kinesis, S3, a few DynamoDB tables, a secret in Secrets Manager.  It's not much money, around 50
to 100 bucks a month, to just stand one up and use it lightly for testing but if you push lots of data through your bus, 
it will become real money.  Be sure to contact your IT/Devops/Engineering management on their policies around this.

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

# Create a new project from an RStreams Flow Template

## Step 1 - Create the project from the template
1. Drop to the command line and CD to where you will want your new project to be
1. Think of a name for your project: lowercase and separate words with dashes, no spaces and no other punctuation.  If this is just a test 
project for you, name it something like `test-123131`.  If this will be the basis of a real project, name it for the 
microservice you are creating. What matters is that the name is unique at your company.  The reason for this is that by 
convention, this sample project will name bots and queues prepended with your project name, which is used as your service
name.  Of course, you can change this later as you understand how things work more. 
1. Run this command to create a new project, replace `{your-project-name}` with the name you thought of in the previous step.
```bash
serverless create --template-url https://github.com/LeoPlatform/rstreams-flow-example/tree/master -p {your-project-name}
```

## Step 2 - Initialize everything
1. CD to the root of your project
1. run `npm install`
1. run this to initialize everything using your project's name as the service name for bots/queues
   ```bash
   serverless init-template
   ```
1. You will be prompted for both the region your RStreams Bus is installed within and the
[rstreams bus](#get-bus-stack-name) stack name, provide them - here's what the output looked like
![serverless init-template output](../images/serverless-init-template-output.png)

## Step 3 - Compile and Run
1. Run `tsc` from the command line to compile TS to JS (execute npm run watch to have a watcher compile TS to JS when files change)
1. Run the weather-loader bot locally hitting an actual RStreams queue
```bash
npm test weather-loader
```

YOU ARE UP AND RUNNING!

# Project Commands using NPM
{{< collapse "Expand me to view all NPM commands included in the project">}}
#### Check code coverage on all files in the project
Run code coverage for all files.  More info [here](https://github.com/istanbuljs/nyc#selecting-files-for-coverage).
```bash
npm run coverage-all
```

#### Check code coverage on only source files visited during a test
Run code coverage for only select files.  More info [here](https://github.com/istanbuljs/nyc#selecting-files-for-coverage).
```bash
npm run coverage
```

#### Run project unit tests using Mocha
More info [here](https://mochajs.org/).
```bash
npm run utest
```
#### Package your bots into artifacts ready to be pushed to CI/CD or directly released
More info [here](https://www.serverless.com/framework/docs/providers/aws/guide/packaging).
```bash
npm run package
```

#### Deploy directly to your dev environment using serverless deploy
More info [here](https://www.serverless.com/framework/docs/providers/aws/guide/deploying).
```bash
npm run deploy-dev
```

#### Use the Serverless RSF plugin to run locally
You will need to provide the name of your bot to run - see [Running Locally](../running-locally) for a lot more detail.
```bash
npm run test-sls
npm run test
```

#### Automatically re-compile typescript to javascript as source files change
More info [here](https://www.typescriptlang.org/docs/handbook/compiler-options.html).
```bash
npm run watch
```

#### Automatically re-compile project config JSON into typescript interface when it changes
This is being released as a preview.  The feature will be released officially soon.
```bash
npm run watch-config
```

#### Bundle the project with webpack
More info [here](https://webpack.js.org/).
```bash
npm run webpack
```

#### Lint the project
More info [here](https://eslint.org/).
```bash
npm run lint
```
{{</ collapse >}}