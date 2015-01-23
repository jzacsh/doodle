(function(angular) {
'use strict';
// TODO(productionize) use some module system
// -- require('doodleTools')
// -- require('doodleSurface')
// -- require('TouchSurface')
// -- require lib to deal with screen orientation standards
// -- require lib to deal with fullscreen mode standards



/**
 * @param {!angular.Scope} $scope
 * @param {!Window} $window
 * @param {!jqLite} $document
 * @constructor
 * @ngInject
 */
var DoodleAppPageCtrl = function($scope, $window, $document) {
  /** @private {boolean} */
  this.fullScreenRequested_ = false;

  /** @type {boolean} */
  this.isLoading = true;
  $scope.$on(
      TouchSurface.Events.LOADED,
      this.handleSurfaceLoaded_.
          bind(this, $window, $document.eq(0)[0].documentElement));

  DoodleAppPageCtrl.preventOrientationChange_($window.screen);
};


/** @const {boolean} */
DoodleAppPageCtrl.FULLSCREEN_MODE = false;


/** @const {boolean} */
// TODO Figure out why forcing a particular orientation is broken!!
DoodleAppPageCtrl.FORCE_PORTRAIT_ORIENTATION = false;



/**
 * Prevent orientation rotations, as this is a fullscreen canvas application, no
 * need to consider orientations at all (aside from how they distractingly can
 * crop our canvas contents).
 *
 * @param {!Screen} scrn
 */
DoodleAppPageCtrl.preventOrientationChange_ = function(scrn) {
  var orientation = DoodleAppPageCtrl.FORCE_PORTRAIT_ORIENTATION ?
      'portrait-primary' :
      (scrn.lockOrientation ||
      scrn.mozLockOrientation ||
      scrn.msLockOrientation ||
      (scrn.orientation && scrn.orientation.type));
  var lockApi = scrn.lockOrientation ||
      scrn.mozLockOrientation ||
      scrn.msLockOrientation ||
      (scrn.orientation && scrn.orientation.lock.bind(scrn.orientation));
  lockApi(orientation);
};


/**
 * @param {!Window} win
 * @param {!Element} docEl
 * @private
 */
DoodleAppPageCtrl.prototype.handleSurfaceLoaded_ = function(win, docEl) {
  this.isLoading = false;
  if (DoodleAppPageCtrl.FULLSCREEN_MODE) {
    var requestFullScreenApi = docEl.requestFullScreen ||
        docEl.webkitRequestFullScreen ||
        docEl.mozRequestFullScreen;
    win.addEventListener('touchstart', function() {
      if (this.fullScreenRequested_) {
        return;  // only ask once
      }
  
      this.fullScreenRequested_ = true;
      requestFullScreenApi.call(docEl);
    }.bind(this));
  }
};


/** @type {!angular.Module} Oliver Play App or "OPA" */
var doodleApp = angular.
    module('doodleApp', []).
    constant('VERSION_SHORT_URL', 'goo.gl/loJaO5').  // Short URL to this app
    controller(
        'DoodleAppPageCtrl',
        ['$scope', '$window', '$document', DoodleAppPageCtrl]).
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


})(window.angular);