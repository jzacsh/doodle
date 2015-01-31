'use strict';
var angular = require('../lib/angular');
var TouchSurface = require('../lib/touch_surface');
// TODO(productionize) use some module system
// -- require lib to deal with screen orientation standards
// -- require lib to deal with fullscreen mode standards


/**
 * @param {!angular.Scope} $scope
 * @param {!Window} $window
 * @param {!jqLite} $document
 * @constructor
 * @ngInject
 */
var DoodlePage = function DoodlePage($scope, $window, $document) {
  /** @private {boolean} */
  this.fullScreenRequested_ = false;

  /** @type {boolean} */
  this.isLoading = true;
  $scope.$on(
      TouchSurface.Events.LOADED,
      this.handleSurfaceLoaded_.
          bind(this, $window, $document.eq(0)[0].documentElement));

  DoodlePage.preventOrientationChange_($window.screen);
};


/** @type {!angular.Module} */
module.exports = angular.
    module('DoodlePageModule', []).
    controller('DoodlePage', [
      '$scope',
      '$window',
      '$document',
      DoodlePage
    ]);


/** @const {boolean} */
DoodlePage.FULLSCREEN_MODE = false;


/** @const {boolean} */
// TODO Figure out why forcing a particular orientation is broken!!
DoodlePage.FORCE_PORTRAIT_ORIENTATION = false;



/**
 * Prevent orientation rotations, as this is a fullscreen canvas application, no
 * need to consider orientations at all (aside from how they distractingly can
 * crop our canvas contents).
 *
 * @param {!Screen} scrn
 */
DoodlePage.preventOrientationChange_ = function(scrn) {
  var orientation = DoodlePage.FORCE_PORTRAIT_ORIENTATION ?
      'portrait-primary' :
      (scrn.lockOrientation ||
      scrn.mozLockOrientation ||
      scrn.msLockOrientation ||
      (scrn.orientation && scrn.orientation.type));
  var lockApi = scrn.lockOrientation ||
      scrn.mozLockOrientation ||
      scrn.msLockOrientation ||
      (scrn.orientation && scrn.orientation.lock.bind(scrn.orientation));
  lockApi(orientation).
      catch(function(error){
        if (error.name == 'NotSupportedError') {
          return;  // was a best-effort, it's okay
        }

        throw new error;  // continue on up
      });
};


/**
 * @param {!Window} win
 * @param {!Element} docEl
 * @private
 */
DoodlePage.prototype.handleSurfaceLoaded_ = function(win, docEl) {
  this.isLoading = false;
  if (DoodlePage.FULLSCREEN_MODE) {
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
