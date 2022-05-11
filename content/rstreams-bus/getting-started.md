---
title: "Getting Started"
date: 2018-12-29T11:02:05+06:00
weight: 1
draft: false
---

{{< collapse-light "ToC" >}}
{{< toc  >}}
{{</ collapse-light >}}

{{< notice info >}}
As elsewhere in this documentation, you will find reference to `leo` which is the old brand for RStreams.  These
references are being gradually changed over time.
{{</ notice >}}

# Summary
Learn how to install a new RStreams Bus instance.  

# AWS Cost
**Be aware that following these instructions will result in AWS resources being created that cost between 50 and 100 dollars a month.**

Of course, after creating the bus, you can dial down the capacity of the resources and get that down well below ten dollars a month.
The more data you push into and read out of the bus, the more it costs.  During testing and evaluation, all bus resources plus 
read/write capacity will easily remain in the 50 - 100 dollar a month range.  You should pay close attention to cost as you ramp up use.
The greatest expense is DynamoDB reads/writes which powers queues.  The second greatest expense is DynamoDB storage.  Kinesis and S3 costs are
relatively minor by comparison.

# The Stack of Stacks
As stated by AWS, "A stack is a collection of AWS resources that you manage as a single unit."  Installing RStreams involves creating a new 
stack that itself contains four additional stacks:

* The Bus Stack : the actual RStreams bus instance itself
* The Auth Stack : sets up authentication tables for managing access to bots/queues
* The Cognito Stack : used for access to RStreams resources
* The Botmon Stack : the monitoring, tracing and visual debugging website that accompanies an RStreams Bus instance

From AWS CloudFormation's designer.
![RStreams Stack Designer 1](../images/rstreams-stack-designer-1.png "420px|center" )


# Create the RStreams Stack

Create a new stack using this RStreams Stack CloudFormation Template URL.

```text
https://leo-cli-publishbucket-abb4i613j9y9.s3.amazonaws.com/leo/2.0.0/cloudformation-1652216325999.json
```

{{< collapse "Click here for the long version with all the gory details">}}
{{</ collapse >}}

1. Go to CloudFormation in the [AWS Console](https://console.aws.amazon.com/console/home) and be sure you're in the region
you want to create the RStreams Bus in.
1. Click the `Create stack` button
![Create Stack](../images/create-bus-cf-0.png "500px|center" )
1. Select the `With new resources (standard)` option since we're creating a stack with new resources
1. **Step 1 - Specify Template**  
Populate the `Amazon S3 URL` column with the RStreams CloudFormation Template URL at the top of this section which is a public URL 
containing the definition of the four sub-stacks that together create an instance of an RStreams bus.  Click Next.
![Create Stack Step 1](../images/create-bus-cf-1.png "420px|center" )
1. **Step 2 - Specify Stack Details**
   1. Give the stack a name.  By convention, RStreams bus instances are title cases with two words, the first being the name of the 
bus or its environment and the second being the word bus as in: `ProdBus`, `StagingBus`, `TestBus`, `ProdIntegrationBus`, `PlaygroundBus`, etc.  
   1. Name the environment.  This isn't actually used today but it may be in the future, so go ahead and fill it in and then click the Next button.
![Create Stack Step 2](../images/create-bus-cf-2.png "420px|center" ) 
1. **Step 3 - Configure Stack Options**  
There are no stack options necessary, but it's usually a good idea to add tags in conformance with AWS best practices.  Scroll down to the bottom
of the form and click the Next button.
![Create Stack Step 3](../images/create-bus-cf-3.png "420px|center" ) 
1. **Step 4 - Review**  
Review everything and then scroll to the bottom.  You will have to acknowledge that clicking the Create Stack button will possibly do some the 
things listed by checking the two checkboxes.  If you agree, check them and click Create Stack.  Then wait 10 - 20 minutes, refreshing as you
go to see the proress.
![Create Stack Step 4](../images/create-bus-cf-4.png "420px|center" ) 

# What do you Have?
The next article explains in detail what was created and the [RStreams Flow Getting Started Guide](../../rstreams-flow/getting-started) and [Running Locally](../../rstreams-flow/running-locally) articles will demonstrate using the RStreams Bus, creating RStreams queues on the bus instance and bots that interact with them.


# Scaling

# Cost Management