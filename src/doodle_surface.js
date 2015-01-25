'use strict';
var doodleSurface = module.exports = {directive: {}};

var TouchSurface = require('./lib/touch_surface')


/** @const {string} */
doodleSurface.directive.NAME = 'doodleSurface';


/**
 * @param {!angular.Scope} $rootScope
 * @return {!angular.Directive}
 * @ngInject
 */
doodleSurface.directive.builder = function($rootScope) {
  return {
    restrict: 'A',
    controller: [
      '$attrs',
      '$injector',
      '$scope',
      Controller
    ],
    controllerAs: doodleSurface.directive.NAME + 'Ctrl',
    link: function postLink(scope, elem, attr, ctrl) {
      ctrl.bindToCanvas(elem.eq(0)[0]);
    }
  };
};



/**
 * @param {!angular.Attributes} $attrs
 * @param {!angular.$injector} $injector
 * @param {!angular.Scope} $scope
 * @constructor
 * @ngInject
 */
doodleSurface.directive.Controller = function($attrs, $injector, $scope) {
  /** @private {!TouchSurface} */
  this.surface_ = /** @type {!TouchSurface} */ (
      $injector.instantiate(TouchSurface, {
        options: $attrs,
        startHandler: this.handleTouchStartChanged.bind(this),
        moveHandler: this.handleTouchMoveChanged.bind(this),
        endHandler: this.handleTouchEndChanged.bind(this)
      }));
  $scope.$on('$destroy', this.surface_.destroyHandler.bind(this));

  /** @param {!Element} canvas */
  this.bindToCanvas = this.surface_.bindToCanvas.bind(this.surface_);

  this.surface_.setLineColorSetting(Controller.DefaultSettings.COLOR);
  this.surface_.setLineWidthSetting(Controller.DefaultSettings.WIDTH);
};
var Controller = doodleSurface.directive.Controller;


/**
 * Placeholder to standin for Toolbar implementation.
 *
 * @typedef {{
 *     color: string,
 *     width: number,
 * }}}
 */
Controller.Settings;


/** @const {boolean} */
Controller.SHOULD_CLEANUP_AFTER_PLAY = false;


/** @enum {number|number} Default {@link Controller.Settings} values. */
Controller.DefaultSettings = {
  WIDTH: 2,
  COLOR: '#000000'
};


/** @enum {number} pixels, milliseconds, etc. */
Controller.PlayMetric = {
  START_RADIUS_MIN: 18,
  START_RADIUS_MAX: 80,

  MOVE_WIDTH_MIN: 3,
  MOVE_WIDTH_MAX: 30
};


/** @enum {number} */
Controller.ConnectionStyle = {
  STRAIGHT: 0,
  QUADRATIC: 1
};


/** @enum {string} */
Controller.Options = {
  MAXIMIZED: doodleSurface.directive.NAME + 'Maximized',
  WILD_CONNECTIONS: doodleSurface.directive.NAME + 'WildConnections',
  VARYING_MOVE_WIDTHS: doodleSurface.directive.NAME + 'VaryingMoveWidths',
  NO_CONNECTIONS: doodleSurface.directive.NAME + 'NoConnections',
  PLAYTIME: doodleSurface.directive.NAME + 'Playtime'
};


/**
 * NOTE: COPY PASTED FROM http://stackoverflow.com/a/1527820
 *
 * @param {number} min
 * @param {number} max
 * @return {number}
 * @private
 */
Controller.getRandomInRange_ = function(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};


/** @return {!TouchSurface} */
 Controller.prototype.getSurface = function() {
   return this.surface_;
 };


/**
 * @param {DOMHighResTimeStamp} animationFrame
 * @param {number} timeStamp
 * @param {!Touch} changedTouch
 */
Controller.prototype.handleTouchStartChanged = function(
    animationFrame, timeStamp, changedTouch) {
  var rendition = this.surface_.contextTouch.
      startTouchRendition(changedTouch, animationFrame, timeStamp);
  this.encodeHighlightTouchRendition_(
      rendition,
      this.getStartTouchColor_(),
      this.getStartTouchRadius_());
  this.surface_.contextTouch.playBackTouch(rendition);
};


/**
 * @return {string}
 * @private
 */
Controller.prototype.getStartTouchColor_ = function() {
  return this.surface_.isEnabled(Controller.Options.PLAYTIME) ?
      TouchSurface.buildRandomRgbStyle() :
      this.surface_.getLineColorSetting();
};


/**
 * @return {number}
 * @private
 */
Controller.prototype.getStartTouchRadius_ = function() {
  return this.surface_.isEnabled(Controller.Options.PLAYTIME) ?
         Controller.getRandomInRange_(
             Controller.PlayMetric.START_RADIUS_MIN,
             Controller.PlayMetric.START_RADIUS_MAX) :
         (this.surface_.getLineWidthSetting() / 2);
};


/**
 * @param {!TouchRendition} rendition
 * @return {string} RGB hex value
 * @private
 */
Controller.prototype.getFirstContextFillStyle_ = function(rendition) {
  return this.surface_.contextTouch.findFirstMatchingContext(
    rendition, function(mod) {
      return Boolean(mod.property) && mod.property.key == 'fillStyle';
    }).property.value;
};


/**
 * @param {!TouchRendition} rendition
 * @return {number}
 *     Third parameter, "radius", to {@link CanvasRenderingContext2D#arc}.
 * @private
 */
Controller.prototype.getFirstContextArcRadius_ = function(rendition) {
  return this.surface_.contextTouch.findFirstMatchingContext(
    rendition, function(mod) {
      return Boolean(
          mod.methodCall &&
          mod.methodCall.name == 'arc' &&
          mod.methodCall.args &&
          mod.methodCall.args.length &&
          mod.methodCall.args[2]);
    }).methodCall.args[2];
};


/**
 * @param {!TouchRendition} rendition
 * @return {?string} rgb hex value
 * @private
 */
Controller.prototype.getLastContextStrokeStyle_ = function(rendition) {
  try {
    return this.surface_.contextTouch.findLastMatchingContext(
        rendition, function(mod) {
          return Boolean(mod && mod.property) &&
                 mod.property.key == 'strokeStyle';
        }).property.value;
  } catch(e) {
    return null;
  }
};


/**
 * @param {!TouchRendition} rendition
 * @return {string} rgb hex value
 * @private
 */
Controller.prototype.getLastContextFillStyle_ = function(rendition) {
  return this.surface_.contextTouch.findLastMatchingContext(
      rendition, function(mod) {
        return Boolean(mod && mod.property) && mod.property.key == 'fillStyle';
      }).property.value;
};


/**
 * @param {!TouchRendition} rendition
 * @param {string} rgbColor
 * @param {number=} opt_arcRadius
 * @private
 */
Controller.prototype.encodeHighlightTouchRendition_ = function(
    rendition, rgbColor, opt_arcRadius) {
  rendition.renderUpdate.recordMethod('beginPath');
  rendition.renderUpdate.recordProperty('fillStyle', rgbColor);
  rendition.renderUpdate.recordMethod('arc',
      rendition.touch.pageX,
      rendition.touch.pageY,
      opt_arcRadius || this.getFirstContextArcRadius_(rendition),
      0,  // startAngle
      2 * Math.PI,  // endAngle
      false  /*anticlockwise*/);
  rendition.renderUpdate.recordMethod('fill');
};


/**
 * @param {!TouchRendition} target
 * @param {!Touch} from
 * @param {!Touch} to
 * @private
 */
Controller.prototype.encodeLineFromTo_ = function(target, from, to) {
  target.renderUpdate.recordMethod('beginPath');
  target.renderUpdate.recordMethod('moveTo', from.pageX, from.pageY);
  target.renderUpdate.recordMethod('lineTo', to.pageX, to.pageY);
  target.renderUpdate.recordProperty('lineWidth', this.getMoveWidth_());
  target.renderUpdate.recordProperty('fillStyle', this.surface_.getLineColorSetting());
  target.renderUpdate.recordMethod('stroke');
};


/**
 * @param {DOMHighResTimeStamp} animationFrame
 * @param {number} timeStamp
 * @param {!Touch} changedTouch
 */
Controller.prototype.handleTouchMoveChanged = function(
    animationFrame, timeStamp, changedTouch) {
  if (!this.surface_.contextTouch.
      hasOngoingRenditions(changedTouch.identifier)) {
    this.handleTouchStartChanged_(changedTouch);
    return;
  }

  if (this.surface_.isEnabled(Controller.Options.NO_CONNECTIONS)) {
    return;
  }

  var current = this.surface_.contextTouch.
      startTouchRendition(changedTouch, animationFrame, timeStamp);
  var last = this.surface_.contextTouch.getPreviousTouch_(current);

  current.renderUpdate.recordMethod('beginPath');

  var moveColor = this.maybeGetRelatedMoveColor_(current);

  switch (this.getConnectionStyle_()) {
    case Controller.ConnectionStyle.STRAIGHT:
      moveColor = this.surface_.isEnabled(Controller.Options.PLAYTIME) ?
          (moveColor || this.getLastContextFillStyle_(current)) :
          this.surface_.getLineColorSetting();
      this.encodeLineFromTo_(current, last.touch, current.touch);
      this.encodeHighlightTouchRendition_(current, moveColor);
      break;

    case Controller.ConnectionStyle.QUADRATIC:
      this.encodeQuadtraticStyleTransition_(last, current, moveColor);
      break;
  }

  this.surface_.contextTouch.playBackTouch(current);
};


/**
 * Long moves can get boring, change the color if appropriate.
 *
 * @param {!TouchRendition} rendition
 * @return {?string}
 *     Related RGB hex style, if appropriate, null otherwise.
 * @private
 */
Controller.prototype.maybeGetRelatedMoveColor_ = function(rendition) {
  if (!this.surface_.isEnabled(Controller.Options.PLAYTIME)) {
    return null;
  }

  return rendition.isDistantFromFrame(
      this.surface_.contextTouch.getFirstTouch_(rendition).animationFrame) ?

      this.surface_.buildRelatedColor(
          this.getFirstContextFillStyle_(rendition)) :

      null;
};


/**
 * @param {!TouchRendition} previous
 * @param {!TouchRendition} incoming
 * @param {string=} opt_rgbMoveStyle
 * @private
 */
Controller.prototype.encodeQuadtraticStyleTransition_ = function(
    previous, incoming, opt_rgbMoveStyle) {
  incoming.renderUpdate.recordMethod('moveTo',
      previous.touch.pageX,
      previous.touch.pageY);

  var controlXMultiplier = Controller.getRandomInRange_(0, 1) ? -2 : 2;
  var controlY = incoming.touch.pageY;
  var controlX = Controller.getRandomInRange_(
      controlY, controlY * controlXMultiplier);

  var pointX = incoming.touch.pageX;
  var pointY = Controller.getRandomInRange_(
      incoming.touch.pageY, incoming.touch.pageY * -0.2);

  incoming.renderUpdate.recordMethod('quadraticCurveTo',
      controlX,
      controlY,
      pointX,
      pointY);

  var rgbMoveStyle = opt_rgbMoveStyle ?
      opt_rgbMoveStyle :
      this.getLastContextStrokeStyle_(incoming) ||
          this.surface_.buildRelatedColor(
              this.getFirstContextFillStyle_(incoming));

  incoming.renderUpdate.recordProperty('lineWidth', this.getMoveWidth_());
  incoming.renderUpdate.recordProperty('strokeStyle', rgbMoveStyle);
  incoming.renderUpdate.recordMethod('stroke');
};


/**
 * @return {number}
 * @private
 */
Controller.prototype.getMoveWidth_ = function() {
  return this.surface_.isEnabled(Controller.Options.PLAYTIME) &&
         this.surface_.isEnabled(Controller.Options.VARYING_MOVE_WIDTHS) ?
      Controller.getRandomInRange_(
          Controller.PlayMetric.MOVE_WIDTH_MIN,
          Controller.PlayMetric.MOVE_WIDTH_MAX) :
      this.surface_.getLineWidthSetting();
};


/**
 * @return {Controller.ConnectionStyle}
 * @private
 */
Controller.prototype.getConnectionStyle_ = function() {
  if(this.surface_.isEnabled(Controller.Options.PLAYTIME) &&
     this.surface_.isEnabled(Controller.Options.WILD_CONNECTIONS)) {
    var keys = Object.keys(Controller.ConnectionStyle);
    var styleKey = keys[Controller.getRandomInRange_(0, keys.length - 1)];
    return Controller.ConnectionStyle[styleKey];
  } else {
    return Controller.ConnectionStyle.STRAIGHT;
  }
};


/**
 * @param {DOMHighResTimeStamp} animationFrame
 * @param {number} timeStamp
 * @param {!Touch} changedTouch
 */
Controller.prototype.handleTouchEndChanged = function(
    animationFrame, timeStamp, changedTouch) {
  if (!this.surface_.contextTouch.hasOngoingRenditions(changedTouch)) {
    return;
  }

  this.surface_.contextHistory.recordRelatedUpdates(
      timeStamp,
      this.surface_.contextTouch.listOngoingRenderUpdates(changedTouch));

  if (Controller.SHOULD_CLEANUP_AFTER_PLAY) {
    this.surface_.contextTouch.eraseOngoingRenditions(changedTouch);
  }

  this.surface_.contextTouch.deleteOngoingRenditions(changedTouch);
};
