---
title: "Custom Metrics"
date: "2022-05-20T07:18:18.878Z"
weight: 4
draft: false
newUntil: "2022-08-07T07:18:18.878Z"
---

{{< collapse-light "ToC" >}}
{{< toc  >}}
{{</ collapse-light >}}

{{< notice info >}}Note that the ``rstreams-metrics`` module does not today have any dependencies on a 
particular SDK version and can be used independently.{{</ notice >}}

# Summary
Developers will want to send custom metrics from their code to external systems.  This is accomplished with
a new module named ``rstreams-metrics``.  The goal is to create a library, provided by ``rstreams-metrics``,
that abstracts away an external telemetry system from one's code.  There are many different telemetry
providers including DataDog, New Relic, AWS Cloudwatch, etc.  Since these are prone to change over time, 
it's important to not wed one's code to a particular provider.

Today, the library supports DataDog and new factories can easily be created.

# Installation

Simply add the NPM dependency to your project.

```json
npm install rstreams-metrics
```

# Metric Config
The developer needs to go get the config necessary to authenticate and communicate with a given
provider.  This should be done in such a way that this config can change without requiring the
developer to change her code.  There are many ways to solve this.  

By convention, there should be an AWS Secret named ``GlobalRSFMetricConfig``.  Developers do not need to 
know or care about what is inside this object they just need to know that it exists for them to use.
It will contain the config necessary to work with a specific
metric reporter.  Today, ``rstreams-metrics`` supports DataDog and this object will contain the
config necessary to connect with a given provider(s).  Here is an example ``GlobalRSFMetricConfig``
that connects to DataDog.

{{< collapse-light "GlobalRSFMetricConfig Secret" true >}}
```json
{
    "DataDog": {
        "key": "abcdefghijklmnopqrstuvwxyz",
        "site": "datadoghq.com"
    }
}
```
{{</ collapse-light >}}

Here's some sample code that will retrieve the ``GlobalRSFMetricConfig`` from Secrets Manager.

{{< notice info >}}Note that it is recommended that this metric be replicated across more than one region
 to ensure high availability.  Note that RStreams Flow will be tricked out shortly to retrieve this
secret at build time using config.{{</ notice >}}

{{< collapse-light "Get Metric Config Secret" true >}}
```typescript
import AWS from "aws-sdk";
const secret = await new AWS.SecretsManager({region: process.env.AWS_REGION}).
                   getSecretValue({ SecretId: "GlobalRSFMetricConfig" }).promise();
```
{{</ collapse-light >}}

# Create a DynamicMetricReporter
The ``rstreams-metrics`` library exports a class named ``DynamicMetricReporter`` which is used
to report metrics to an external provider.  You make an instance of this class, passing in config
to allow it to connect to the external provider.

At the beginning of your code, you call the ``start`` method on the instance.  When you want to 
send metrics, you call the ``log`` method for each metric instance you want to send.  When you are done,
 you must be sure to call the ``end`` method.  You do not need to create more than 
one ``DynamicMetricReporter` in your code.  In fact, it's best if you don't.

If you are using this in a lambda or bot, it's a good idea to use a try..finally to ensure 
the end method is invoked.  If you fail to call the end method, some of your metrics might not
get sent to the external provider.

## DynamicMetricReporter Scope

If you are running an app, you should use the same ``DynamicMetricReporter`` instance for the lifetime of
your app.

If you are running a bot, meaning an AWS lambda, you should instantiate your ``DynamicMetricReporter``
instance [outside your handler function](https://docs.aws.amazon.com/lambda/latest/operatorguide/global-scope.html)
so it is created just once within the lambda execution
environment and survives across invocations of your bot/lambda.

## DynamicMetricReporter Session
For bots/lambdas, you should call the ``start`` method at the beginning of your handler and the ``end``
method at the very end of your lambda.

{{< notice info >}} A future RStreams Flow release will further simplify
custom metrics by knowing how to retrieve the configuration necessary by convention so
developers don't have to go get it.  It will also take care to call the ``start`` and 
``end`` methods for you at the beginning and end of bot invocations. {{</ notice >}}

# Metrics

This is the definition of ``Metric`` that can be sent using the ``log`` method.

{{< collapse-light "Metric Interface" true >}}
```typescript
export interface Metric {
	id: string,
	value: number,
	timestamp?: Date,
	tags: Record<string, string>
}
```
{{</ collapse-light >}}

* **id**: the name/identifier for the metric
* **value**: the metric value itself
* **timestamp**: if provided, the date of the metric and if not ``now`` will be used
* **tags**: a map of tags that differentiate this metric instance from another

# Tags

Each organization will create its own taxonomy of tags to differentiate instances
of the same fundamental metric by say environment, or customer or service type or whatever.
Having said that, RStreams Flow, as an opinionated framework, has an opinion on the tags
that an organization might want to use based on lessons learned.  The ``DynamicMetricReporter``
goes looking for values to the following tags not already specified and if it finds them, will include them.

| Tag | Description |
| --- | --- |
| app | The name of the microservice or component. ``DynamicMetricReporter`` will use the serverless.yml service attribute value by default. ![App Name Serverless File](../images/app-name-serverless-file.png "260px") |
| bot | The ID of the bot the metric applies to, if any.  ``DynamicMetricReporter`` will be able to discover this if running as a bot.  ``weather-loader`` is the bot ID in this bot serverless.yml file ![Bot ID Screenshot](../images/bot-id-screenshot.png "360px") |
| bus | The name of the RStreams bus instance the metric applies to.  ``DynamicMetricReporter`` will usually be able to discover this if running as a bot. |
| environment | The environment the metric applies to: test, staging, prod, etc. ``DynamicMetricReporter`` will often be able to discover this if running as a bot. |
| service | This is set to rstreams if this is a bot.  It indicates that this bot is running on the rstreams service. |
| workflow | Optional. Some bots/queues work with specific types of data.  This allows for tagging metrics based on the type of data or operation that the metric applies to. ``DynamicMetricReporter`` will sometimes be able to discover workflow.|
| component | Optional.  This allows for sub-component delineation within a microservice.  It must be provided by the developer. |

# Examples

{{< collapse-light "App Example" true >}}
```typescript
import AWS from "aws-sdk";
import { DynamicMetricReporter, Metric } from "rstreams-metrics";

// Create an instance of the metric reporter, passing in a function that will
// go get the config it needs
const metricReporter: DynamicMetricReporter = new DynamicMetricReporter((async () => {
    // Get the secret with the config to connect to the external telemetry system
    const secret = await new AWS.SecretsManager({region: process.env.AWS_REGION}).
                     getSecretValue({ SecretId: "GlobalRSFMetricConfig" }).promise();


    // Turn the secret string into an object
	let config = JSON.parse(secret.SecretString);
	
    // If true, don't actually send the metrics to the external provider. Can be helpful in testing.
    config.dontSendMetrics = true;

    // Returnt the config object
	return config;
})());

async function main() {
    try {
        // Call start to connect once to the metric provider
        await metricReporter.start();


        // Log a metric that tracks when work began
        metricReporter.log({
    		id: "work-monitor",
    		value: (new Date()).getTime(),
    		tags: {
    			phase: "beginning"
            }
    	});

        doWork();

        // Log a metric that tracks when work ended
        metricReporter.log({
    		id: "work-monitor",
    		value: (new Date()).getTime(),
    		tags: {
    			phase: "end"
            }
    	});
    } finally {
        // Flush any metrics to the metric provider
        await metricReporter.end();
    }
}

function doWork() {
    // Do work that takes time
}

// When the file is interpreted, run the main method
(async () => {
  await main();
})()
```
{{</ collapse-light >}}

{{< collapse-light "Bot/Lambda Example" true >}}
```typescript
import { Context } from "aws-lambda";
import AWS from "aws-sdk";
import { DynamicMetricReporter } from "rstreams-metrics";

// Create your metric reporter outside the handler so it is scoped to the lambda
// execution context and the secret retrieved only once.  Note that a future
// version of RStreams Flow will do all this for you and retrieve the value
// of the config secret at deploy time instead of run time.
const metricReporter: DynamicMetricReporter = new DynamicMetricReporter((async () => {
        // Get the secret with the config to connect to the external telemetry system
    const secret = await new AWS.SecretsManager({region: process.env.AWS_REGION}).
                     getSecretValue({ SecretId: "GlobalRSFMetricConfig" }).promise();

	return JSON.parse(secret.SecretString);
})());

// The handler function for the bot
exports.handler = require("leo-sdk/wrappers/cron")(async function (_event: any, _context: Context) {
    try {
        // Call start at the beginning of your bot/lambda invocation
        await metricReporter.start();

        // Do something interesting
	    doSomeWork();
    } finally {
        await metricReporter.end();
    }
});

function doSomeWork() {
    // Send a warning metric with a random value
	metricReporter.log({
		id: "rsf-example.numbers",
		value: Math.floor(Math.random() * 100),
		tags: {
			workflow: "rsf-example",
			rsf_type: "warning"
		}
	});

    // Send an error metric with a random value
	metricReporter.log({
		id: "rsf-example.numbers",
		value: Math.floor(Math.random() * 100),
		tags: {
			workflow: "rsf-example",
			rsf_type: "error"
		}
	});
}
```
{{</ collapse-light >}}

![Bot State Nominal](../images/rsf-example-metric-screenshot.png "450px|left")






