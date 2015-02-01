'use strict';
var angular = require('./lib/angular');
var doodlePage = require('./ngmodules/doodle_page');
var doodleSurface = require('./ngmodules/doodle_surface');
var doodleTools = require('./ngmodules/doodle_tools');


/** @type {!angular.Module} */
module.exports = angular.module('doodleApp', [
  doodlePage.name,
  doodleSurface.name,
  doodleTools.name
]);
