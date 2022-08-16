---
title: "Smart Config"
date: "2022-08-01T17:55:12.078Z"
weight: 5
draft: false
version:
  version: 1
  current: 1
  all:
    - version: 1
      date: "2022-08-01T17:55:12.078Z"
    - version: 2
      date: "2022-08-12T09:00:00.000Z"
  render:
    fileName: "smart-config"
    language: "en"
---

{{< collapse-light "ToC" >}}
{{< toc  >}}
{{</ collapse-light >}}

# Summary
This guide explains `RStreams Smart Config`, it's typical use case, and various commands to get up and running.

# Prerequisites
* [serverless](https://www.serverless.com/) framework is installed globally.
* This assumes you are using [Visual Studio Code](https://code.visualstudio.com/) as your IDE, however 
everything should be possible in your favorite IDE such as IntelliJ or whatever it may be
* If you want to follow along, you should go through the [Getting Started Guide](../getting-started)


# Things you need to know

#### Your AWS Account Credentials
You'll need to have credentials setup to connect to your AWS account where the service will be deployed / hosted.
In most instance, you'll want to use a credential management tool such as [kerb-sts](https://pypi.org/project/kerb-sts/), but you may
also setup your `.aws/credentials` file with static credentials to connect to AWS.

# Using Smart Config

## Serverless.yml

To use `Smart Config`projects require additional `serverless.yml` properties.  A template below can be pasted into the `custom` section of your `serverless.yml`.

{{< collapse-light "Serverles.yml">}}
```yaml
custom:
  leo:
    rsfVersion: 3,
    rsfTemplateTokens: #These tokens are generated when you `init-template` through serverless; they are not required.
      project-name: "weather-watcher"
      rstreams-bus: "LeoLearn-Bus-CFSO23CHNKQL"
      region: "us-east-1"

    botIdExcludeStage: true #Determines if bots are named ${service}-$[stage}-${function} or simply ${service}-${function}
    configurationPath: project-config-new.def.json #path for the project-config definition that smart config will generate
    
    rsfConfigType: environment #denotes the configuration type for values (environment or secretsmanager)
    rsfConfigStages: #the stages involved in this service (e.g. prod, staging, test)
      - some-stage
      - a-second-stage
      - possibly-production
    rsfConfigReplicationRegions: #if using rsfConfigType: secretsmanager where to replicate secret values too
      us-west-1:
        - us-east-1
```
{{</ collapse-light >}}

Legacy RStreams projects had a tendency to use a file called `leo_config.json` that includes information about the cron bus and its various tables.  Smart Config provides tools to eliminate this file by providing the `rsfConfigType` above in the project root `serverless.yml`.  The `serverless-leo` plugin looks for the corresponding stage in the `custom.stage.leoStack` setting to populate the `leo_config` information as an Environment Variable from either CloudFormation Export Values or an AWS Secrets Manager secret. 

There is no need to use `Smart Config` to import `leo_config` information as a value to be used from `project-config-new.ts`.

## sls edit-config

{{< notice info >}}In all of the following commands, you must have `serverless-leo` listed in your `serverless.yml` and installed as
a plugin `serverless plugin install -n serverless-leo`{{</ notice >}}

To use `Smart Config` simply pass the `edit-config` command to `serverless`.

```bash
  sls edit-config #serverless edit-config
```
You'll be prompted for the region you wish to search within your authenticated account (default is `us-east-1`).

`Smart Config` is pulling and caching AWS resources behind the scenes locally in your project.  You might notice a new file `/.rsf/resource-cache.json` 
become available in your project.  This cache is used to reduce making multiple calls to your AWS account looking for resources; you can safely add it
to your `.gitignore`.

* search  
<br/>
By default entering a term into the prompt for `edit-config` will search AWS for items similar to that term. In the example below, a search for the term `my secret` in the `Smart Config` prompt yields a response from the cache.  Terms do not have to be exact matches.  


![Smart Config Search by Term](../images/smart-config-search-1.png "420px|left") 

  * Where can I pull data from?
  Currently, `Smart Config` can pull from four locations to gather data:
      - [Secrets Manager](https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html?icmpid=docs_asm_console)
      - [Systems Manager -> Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
      - CloudFormation
          - [External Stacks via Stack Outputs](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/outputs-section-structure.html)
          - [Same Stack References](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-ref.html)

{{< collapse-light "Did you know?">}}
{{< notice info >}}
  Did you know, Smart Config will automatically interpret the names of secrets and parameters to see if they include an `{env}` in the name?  
<br/>
![AWS Secret Test Env](../images/smart-config-secret-0.png "840px|left")
<br/>
  The secret above becomes `"my_super_secret_key_pair": "secret::${stage}/my_super_secret_key_pair"`
{{</ notice >}}
{{</ collapse-light >}}

* add  
<br/>
_Adding_ a resource to your `Smart Config` is done by entering the numerical value of the term from your search into the prompt.  In the example above, only one result was returned against the search term.
To add that resource simple supply it's value back to the prompt, as below.  If successful, you sould see that the resource was added to your config.  

![Smart Config Search by Term](../images/smart-config-add-1.png "420px|left") 
<br/>
You can add as many items during a session as you like.  To continue adding more resources, you can continue going through the `Search -> Add` flow, as shown below.

![Smart Config Continued Search & Add](../images/smart-config-add-2.png "420px|left")

* done  
<br/>
When you have added all the resources you want, simply provide `done` to the `Smart Config` prompt.  You should see an output in the console that shows the readout of a file called `project-config-new.def.json`.  This file is used to generate the `project-config-new.ts` file. 

![Smart Config Done](../images/smart-config-done-1.png "420px|lef")
<br>

# Smart Config Output

* `project-config-new.def.json`
`project-config-new.def.json` is used to generate a TypeScript file of the same name.  This file contains all the secrets, parameters, and CloudFormation imports and references pulled in from the `Smart Config` search.  
  * Anatomy of `project-config-new.def.json`
  The `project-config-new.def.json` can be manually built or altered from its generated version.  When editing manual, entries must be formatted as follows. 
    - A typical entry in the map has the following format: `{ "propertyName": "service::name::type::resolution" }`
      - `propertyName` - The name of the property to be accessed.
      - `service`  - The source of the data inside AWS.  Valid values are:
        - `cf` - represents that this data comes from a [CloudFormation Output](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/outputs-section-structure.html) value.
        - `secret` - represents that this data comes from [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html?icmpid=docs_asm_console)
        - `ssm` - represents that the data comes from [AWS Systems Manager -> Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html).
        - `stack` - represents that the data comes from the current projects [CloudFormation Stack, usually as a Ref! item](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-ref.html).
      - `name` - The fully qualified name of object to obtain from the `service`.
      - `type` - The data type of the object.  Currently supported data types:
        - `int`
        - `integer`
        - `string`
        - `number`
        - `dynamic`
        - `unknown` 
            - Fields with unknown types can be changed by appending `::type` to the `project-config-new.def.json`.
            - You can specify custom types by defining interfaces in a `types.d.ts` file in the same directory
            as `project-config-new.def.json`
      - `resolution` - When the value should be resolved.  For most instances this will be at deployment, but it is possible to override to runtime deployment `resolve=runtime`.
  The example snippet below shows some completed entries in the map.


{{< collapse-light "Project Config JSON" true>}}
```json
{
 "item": {
    "endpoint": "cf::${MyStage2}Auth-LeoAuth::string"
  },
  "mysqlPortRegion": "secret::${stage}/${region}/fake_db/connection.port::int::resolve=runtime",
  "mysqlPortRegion2": "secret::${Stage}/${region}/fake_db/connection.port::int",
  "mysqlPort": "secret::${stage}/${region}/fake_db/connection.port::int",
  "mysqlPassword": "secret::${stage}/${region}/fake_db/connection.password::string",
  "mysql": "secret::${Stage}/${region}/fake_db/connection::MySqlData",
  "redshifturl": "ssm::My${Stage}Parameter::string",
  "defaultNumRetries": 23,
  "weather": {
    "inner": {
      "service": "secret",
      "key": "${stage}/fake_db/connection.password",
      "type": "string",
      "options": {
        "resolve": "runtime"
      }
    },
    "inner3": {
      "service": "secret",
      "key": "${stage}/fake_db/connection.password",
      "type": "string",
      "options": {
        "resolve": "deploy"
      }
    }
  },
  "my_super_secret_key_pair": "secret::${stage}/my_super_secret_key_pair",
  "leo_cli_example_param": "ssm::leo-cli-example-param"
}
```
{{</ collapse-light >}}

* `project-config-new.ts` - Smart Config also generates a `.ts` file from the `project-config-new.def.json` file.  This file exposes a class built from values stored in the `RSF_CONFIG` env var.  

{{< collapse-light "Generated TypeScript">}}
```typescript
/* Generated by serverless-leo */
import { ConfigurationBuilder } from "leo-sdk/lib/configuration-builder";
import { MySqlData } from "types";

export interface ProjectConfigNew {
  item: {
    endpoint: string;
  };
  mysqlPortRegion: number;
  mysqlPortRegion2: number;
  mysqlPort: number;
  mysqlPassword: string;
  mysql: MySqlData;
  redshifturl: string;
  defaultNumRetries: number;
  weather: {
    inner: string;
    inner3: string;
  };
  my_super_secret_key_pair: unknown;
  leo_cli_example_param: unknown;
}

export default new ConfigurationBuilder<ProjectConfigNew>(process.env.RSF_CONFIG).build({});
```
{{</ collapse-light >}}

# Using `project-config-new.ts` in a Project

The real magic of decoupling comes from the `project-config-new-.ts`.  This exposes an interface that is popualted with values from an env var `RSF_CONFIG`.  `Smart Config` builds this config to match the structure in `project-config-new.def.json` and automatically popultes it with the values (those not marked `resolve=runtime`) from the associated AWS resources. 

To use this file in your project, you just import `project-config-new.ts` from its relative path. 

{{< collapse-light "Using `project-config-new`" true>}}
```typescript {linenos=inline,anchorlinenos=true,lineanchors=rstreamsconfigjson}
import config from "../../project-config-new";


interface LoaderBotInvocationEvent extends BotInvocationEvent {
	destination: string;
}

export const handler = botWrapper(async function (event: LoaderBotInvocationEvent, context: RStreamsContext) {
	console.log("Invocation Event:", JSON.stringify(event, null, 2));
	console.log(config);
  const mySecretKeyPair = config.my_super_secret_key_pair;
	const exampleParam = config.leo_cli_example_param;
}
```
{{</ collapse-light >}}


# References
- [AWS Secrets Manager]: https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html?icmpid=docs_asm_console
- [AWS SSM Parameter Store]: https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html
- [CloudFormation Outputs]: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/outputs-section-structure.html
- [CloudFormation Refs]: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-ref.html

