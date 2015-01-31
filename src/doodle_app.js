'use strict';
var angular = require('./lib/angular');
var doodlePage = require('./ngmodules/doodle_page');
var doodleSurface = require('./ngmodules/doodle_surface');
var doodleTools = require('./ngmodules/doodle_tools');


/** @type {!angular.Module} */
var doodleApp = module.exports = angular.
    module('doodleApp', [
      doodlePage.name,
      doodleSurface.name,
      doodleTools.name
    ]).
    constant('VERSION_SHORT_URL', 'goo.gl/loJaO5');  // Short URL to this app
