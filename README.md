# [Doodle App](https://study.j.zac.sh/doodle) [![Build Status](https://travis-ci.org/jzacsh/doodle.svg)](https://travis-ci.org/jzacsh/doodle)
This is a simple canvas doodling app I built, [originaly to entertain a
toddler](http://goo.gl/bPihNp). Like most vacation hacking, this app exploded
over my two week break into a full fledged app with undo/redo, history-jumping,
etc.

## Feature Set
**In Progress**: Beware, some buttons just do: `throw new Error('implement me!');` :)

Basically, this is super simple, history-recording canvas JavaScript. The intention is to have a useable, basic sketchboad, hopefully make other features easier to implement. Currently implemented:
- app **loads offline** via [appcache manifest](https://github.com/jzacsh/doodle/blob/a826f24401aa6db13ed47c3187cfc2abfebfbb68/doodle-cache.manifest)
- **download PNG**s of drawings
- basic history management: undo/redo

### Known Issues
I'm making heavy use of Github issues for this repo. The highlights:
- *issue 4*: a lot of **unit tests** still unwritten, e2e tests not even thought about
- *issue 3*: **branched history** is calculated, but not utilized: UI isn't written yet
- ~~*issue 6*: a lot of **mobile only** code, no attempts to make the app useable on desktop~~
- *issue 7*: pollyfills needed for all the **experimental browser features**

## Hacking
On first clone, quick `npm install`:
```bash
  git clone git@github.com:jzacsh/doodle.git &&
    cd doodle &&
    npm install
```

This is basically a tiny angularjs app, but could be built with anything. The real meat of this repo is in the vanilla JavaScript classes prefixed `Doodle...` and similarly vanilla JavaScript in lib/ directory to manage history and `CanvasRenderingContext2D`.

### Testing
Run unit tests and watch for file updates, as you modify tests:
```bash
# one one terminal
$EDITOR test/*.js

# in another terminal
npm run testing  # or `npm run test` to just run once
```

### Local Development
Of course, now that you have dilligently added failing tests, **implement your features**

Compile & serve locally, via [npm `watch`](https://www.npmjs.com/package/watch) automatic calls to `npm run restart` _(or `restartdev`)_:
```bash
npm run watch # or `npm run watchdev` for uncompiled
```

### Deploy to Your CDN
This is a static web app, meaning its plain text files that only a browser
interprets. Just serve them from anywhere. The target files are produced in
`./tmp/` by executing:
```bash
npm run build
```
