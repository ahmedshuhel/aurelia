# Aurelia vNext

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lernajs.io/)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![CircleCI](https://circleci.com/gh/aurelia/aurelia.svg?style=shield)](https://circleci.com/gh/aurelia/aurelia)
[![Test Coverage](https://api.codeclimate.com/v1/badges/5ac0e13689735698073a/test_coverage)](https://codeclimate.com/github/aurelia/aurelia/test_coverage)

This is the Aurelia vNext monorepo, containing core and plugin packages, examples, and documentation for the next major version of [Aurelia](http://www.aurelia.io/).

> To keep up to date on [Aurelia](http://www.aurelia.io/), please visit and subscribe to [the official blog](http://blog.aurelia.io/) and [our email list](http://eepurl.com/ces50j). We also invite you to [follow us on twitter](https://twitter.com/aureliaeffect). If you have questions, look around our [Discourse forums](https://discourse.aurelia.io/), chat in our [community on Gitter](https://gitter.im/aurelia/discuss), or use [stack overflow](http://stackoverflow.com/search?q=aurelia).

## vNext Progress

### Kernel

* [x] PAL
* [x] Reporting
* [x] Dependency Injection

### Runtime

#### Core

* [x] Task Queue
* [x] Resources
* [x] DOM

#### Application Model

* [x] Plugin Registration
* [x] SPA Startup

#### Binding

* [x] One Way
* [x] Two Way
* [x] One Time
* [x] From View
* [x] Trigger
* [x] Delegate
* [x] Capture
* [x] Call
* [x] Ref
* [x] Style
* [x] Text
* [x] Value Converters
* [x] Binding Behaviors
* [x] Computed

#### Custom Elements

* [x] Properties
* [x] Binding
* [x] Bind Lifecycle
* [x] Attach Lifecycle
* [x] Fixed Views
* [x] Per-instance Views
* [x] No View
* [x] Containerless
* [x] ShadowDOM Integration
* [x] HTML-Only Custom Elements
* [x] Template Part Replacement
* [x] `$children` and `$childrenChanged`
* [ ] Basic CSS
* [ ] CSS Modules

#### Custom Attributes

* [x] Binding
* [x] Bind Lifecycle
* [x] Attach Lifecycle

#### Template Controllers

* [x] Binding
* [x] Bind Lifecycle
* [x] Attach Lifecycle
* [x] View Factories
* [x] View Slots
* [x] Plain Views
* [x] Linking
  * e.g. if/else and switch/case scenarios

#### Resources

* Value Converters
  * [x] `sanitize`
* Binding Behaviors
  * [x] `attr`
  * [x] `oneTime`
  * [x] `oneWay`
  * [x] `twoWay`
  * [x] `debounce`
  * [x] `throttle`
  * [x] `updateTrigger`
  * [x] `signal`
  * [x] `self`
* Template Controllers
  * [x] `if`
  * [x] `else`
  * [x] `replaceable`
  * [x] `with`
  * [x] `repeat`
* Custom Elements
  * [x] `compose`

### JIT

#### Binding

* [x] Expression Parser

#### Rendering

* [ ] Template Compiler

#### Application Model

* [ ] Progressive Enhancement

### AOT

#### Core

* Conventions
  * [ ] AOT
* Resource Descriptions
  * [x] JIT
  * [ ] AOT
* Single File Components
  * [ ] Parser

#### Compiler Plugins

* [ ] TypeScript
* [ ] Babel

#### Loader Plugins

* Require.js
  * [x] JIT
  * [ ] AOT
* [ ] System.js
  * [ ] JIT
  * [ ] AOT
* [ ] Parcel
* [ ] Webpack

### Debug

#### Core

* [x] Error Messages

#### Binding

* [x] Expression Unparsing

#### Task Queue

* [x] Long Stack Traces

### Plugins

#### SVG

* [x] Binding to SVG Elements

## Build and Test

To get everything ready, run the following commands:

- `npm ci` (npm 6+ is required for this)
- `npm run bootstrap`
- `npm run build`

To run all the tests, execute this command:

- `npm run test`

To run individual tests, switch to the desired package folder and run the test command:

- `cd packages/runtime`
- `npm run test`
