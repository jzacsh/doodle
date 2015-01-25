'use strict';
var angular = require('angular');
var doodleTools = require('./doodle_tools');
var doodleSurface = require('./doodle_surface');
var DoodlePage = require('./doodle_page');


/** @type {!angular.Module} */
var doodleApp = module.exports = angular.
    module('doodleApp', []).
    constant('VERSION_SHORT_URL', 'goo.gl/loJaO5').  // Short URL to this app
    controller(
        'DoodlePage',
        ['$scope', '$window', '$document', DoodlePage]).
    directive(
        doodleTools.directive.NAME,
        [doodleTools.directive.builder]).
    directive(
        doodleSurface.directive.NAME,
        ['$rootScope', doodleSurface.directive.builder]);


Object.keys(doodleTools.directive.children).forEach(function(childKey) {
  var childDefinition = doodleTools.directive.children[childKey];
  doodleApp.directive(childDefinition.NAME, childDefinition.builder);
});
