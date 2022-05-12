---
title: "Project Organization"
date: 2018-12-29T11:02:05+06:00
weight: 3
draft: false
---

{{< collapse-light "ToC" >}}
{{< toc  >}}
{{</ collapse-light >}}

# Summary
This doc explains how projects are organized and what all the files are and what they mean, using the example project from
the [Getting Started Guide](../getting-started).

# Root-level Files and Directories

| Path | Description |
|---------|--------|
| .mock-data/ | Developers put their mock data in this directory.  The SDK, when it generates mock data, will also put it in here   |
| .vscode/     | Config to make working in Visual Studio code easier with RStreams  |
| bots/ | All bots are in this directory  |
| cloudformation/ | Additional CloudFormation templates that will be merged into the final stack go in this directory  |
| lib/ | Standard directory developers will often use to put project-specific files within  |
| node_modules/ | Standard Node JS location for downloaded 3rd party Node libraries  |
| test/ | A directory for the projects unit tests  |
| .env.dev | A [dotenv](https://www.npmjs.com/package/dotenv) property file for local config |
| .gitignore | Ignore certain files |
| .nycrc.json | Generates unit test code coverage using the popular [Instanbul NYC](https://www.npmjs.com/package/nyc) library |
| package.json | The ubiquitous Node file containing NPM run scripts and your project's dependencies |
| project-config-new.def.json | RStreams Flow will soon release a new way of handling your project's configuration, this is a preview of that feature  |
| project-config-new.ts | RStreams Flow will soon release a new way of handling your project's configuration, this is a preview of that feature  |
| serverless.yml | Config used by the [Serverless Framework](https://www.serverless.com/) to build and run with an RStreams-specific plugin |
| tsconfig.json | Standard [tsconfig file](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html) for typescript support |
| types.d.ts | Top-level types used by soon to be released RStreams Flow project config feature |
| webpack.config.js | Standard [webpack file](https://webpack.js.org/) to help in bundling builds |