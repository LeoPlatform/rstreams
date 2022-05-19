---
title: "Configuring RStreams"
date: "2022-05-19T16:20:15.764Z"
weight: 4
draft: false
version:
  current: "1.0"
  all:
    - version: "1.0"
      date: "2022-05-19T16:20:15.764Z"
  _render:
    fileName: "configuring-rstreams"
    language: "en"
---
{{< collapse-light "ToC" >}}
{{< toc  >}}
{{</ collapse-light >}}

# Summary 
Understand how to provide the configuration that the RStreams SDK needs in order to communicate with an instance of an RStreams Bus.

# RStreams Config Structure
This is what the config looks like that the RStreams SDKs need to have at run time in order to connect to an RStreams Bus as the SDK
reaches out to Kinesis, DynamoDB, S3, etc.  Note that the actual values are output variables exposed by the Bus stack of the RStreams Bus
stack and that they will differ from installation to installation.

{{< collapse-light "RStreams Config JSON Structure" true >}}
```json
{
    "Region": "us-east-1", 
    "LeoStream": "BusName-LeoStream-1213456",
    "LeoCron": "BusName-LeoCron-1213456", 
    "LeoSettings": "BusName-LeoSettings-1213456",
    "LeoEvent": "BusName-LeoEvent-1213456", 
    "LeoKinesisStream" : "BusName-LeoKinesisStream-1213456",
    "LeoFirehoseStream": "BusName-LeoFirehoseStream-1213456", 
    "LeoS3": "busname-leos3-1213456"
}
```
{{</ collapse-light >}}

# RStreams ConfigProviderChain
RStreams has a 
[default chain of config providers](https://leoplatform.github.io/Nodejs/classes/lib_rstreams_config_provider_chain.ConfigProviderChain.html#defaultProviders)
it uses to search for the config it needs.

## RStreams Config Secrets Manager Secret Approach
This is the preferred approach for production environments.

The reason is it's important that the config isn't bundled into the build artifacts
or then it limits the CI/CD methodology you may want for those who create a single artifact, test that artifact and then push that artifact to a 
production environment.  So, we want it that when we deploy a bot into a specific environment that it only then goes out and discovers the RStreams
config associated with the bus instance in that environment and pulls it in to be used at runtime.  This approach can be used in development
environments also, including when running locally.

### RStreams Flow Projects
If your project is an RStreams Flow project, everything is just handled for you when you deploy to an actual environment.  In your
serverless.yml you will see a stack param that is called `RStreamsBus`.  The AWS Secretes Manager secret name by convention is named
`rstreams-{busStackName}` where busStackName is the name of the actual [RStreams bus stack](../getting-started/#get-bus-stack-name). 
So, all the deployment process needs to know is your environment and the bus stack name for that environment.

There is a way to explicitly set the name of the secret also which is convenient when running locally.  Create a `.env.{stage}` file 
(stage is your environment name) as we are using the [dotenv library](https://www.npmjs.com/package/dotenv) and put these in it

```json
AWS_REGION="{my-aws-region}"
RSTREAMS_CONFIG_SECRET="rstreams-{busStackName}"
```
The default RStreams Flow project template comes pre-installed with a file named `.env.dev` with `AWS_REGION` and `RSTREAMS_CONFIG_SECRET`
in it so a developer can just change those values and run locally with the assumption that the `dev` environment means running
on your local box.

### Any Type of Project: Environment Variables
You can also directly create an environment variable for `AWS_REGION` and `RSTREAMS_CONFIG_SECRET` if you want to and the SDK
will discover them at runtime and pull it in.  This isn't recommended for production deployments but works great in dev/test environments.

# Environment Variables Approach
The SDK will search at runtime if it doesn't yet have the RStreams config it needs in environment variables and it will pull it in if 
one is there.  As described above, `RSTREAMS_CONFIG_SECRET` is meant to be the name of the AWS Secretes Manager secret that has the config.

If you have an enironment variable named `RSTREAMS_CONFIG` whose value is a stringifed version of the [config JSON object](#rstreams-config-json-structure)
the SDK will find it and use it when it runs.

# File Approach
This approach is not recommended in production environments as it guarantees that the RStreams config for an environment is hardcoded
into your build-time artifacts instead of being resolved at deploy time.  However, this is a great approach for hitting a test environment
when running locally.

If the SDK hasn't found the config it needs yet with the methods described above, it will start searching the file system.  It does so
starting in the current directory and will walk up the directory path tree until the root looking for a file named one of those below.

If it doesn't find it then it will also walk down into child directories until it finds a child directory named `config` that contains
one of the file names listed below.

A common pattern used to not have to check into a project the config one wishes to use locally only is to create a correctly named
config file and put it in a parent directory of the project so it doesn't get checked in.

Note that there are both JSON versions and 
Javascript file versions of the following names that are searched for so the config can just be in a JSON file or can be exported from
a Javascript file.

* rstreams.config.json
* rstreams.config.js
* rstreamsconfig.json
* rstreamsconfig.js

For backward compatibility only with the now deprecated LeoConfig approach...
* leo.config.json
* leo.config.js
* leoconfig.json
* leoconfig.js

