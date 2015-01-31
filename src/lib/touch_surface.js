'use strict';
// TODO(productionize) use some module system
var ContextHistory = require('./context_history');
var ContextTouch = require('./context_touch');



/**
 * @param {!angular.Scope} $rootScope
 * @param {!Window} $window
 * @param {!Document} $document
 * @param {!angular.Attributes} options
 * @param {!TouchSurface.TouchChangedHandler} startHandler
 * @param {!TouchSurface.TouchChangedHandler} moveHandler
 * @param {!TouchSurface.TouchChangedHandler} endHandler
 * @constructor
 * @ngInject
 */
var TouchSurface = module.exports = function TouchSurface(
    $rootScope,
    $window,
    $document,
    options,
    startHandler,
    moveHandler,
    endHandler) {
  /** @private {!angular.Scope} */
  this.rootScope_ = $rootScope;

  /** @private {!angular.Attributes} */
  this.options_ = options;

  /** @private {!Window} */
  this.window_ = $window;

  /** @private {!TouchSurface.TouchChangedHandler} */
  this.touchStartChangedCallback_ = startHandler;

  /** @private {!TouchSurface.TouchChangedHandler} */
  this.touchMoveChangedCallback_ = moveHandler;

  /** @private {!TouchSurface.TouchChangedHandler} */
  this.touchEndChangedCallback_ = endHandler;

  /**
   * Identifiers need to cancel currently queued callbacks
   * using {@link Window.cancelAnimationFrame}.
   *
   * Sequentially keyed (as Array indices)
   * {@link Window.requestAnimationFrame} queued callbacks, where values are
   * the cancel-identifier requestAnimationFrame returns. Null indicates the
   * request has been cancelled, or already executed.
   *
   * @private {!Object.<number, ?number>}
   */
  this.rafCancelIds_ = {};

  /** @private {?CanvasRenderingContext2D} */
  this.context_ = null;
  
  /** @type {?ContextTouch} */
  this.contextTouch = null;

  /** @type {!ContextHistory} */
  this.contextHistory = new ContextHistory();

  /** @private {!Object.<Controller.Setting, ?string} */
  this.settings_ = {};
  angular.forEach(TouchSurface.DefaultSettings, function(value, key) {
    this.updateSettings_(key, value);
  }.bind(this));

  $document.eq(0)[0].addEventListener(
      'contextmenu',
      this.contextmenuEventHandler_.bind(this),
      false  /*useCapture*/);
};


/**
 * Handler API which will be called for individual {@link Touch} objects in a
 * {@link TouchEvent#changedTouches} list, with the arguments:
 * - animationFrame: the {@link Window.requestAnimationFrame}'s timestamp during
 *   which this handler is being executed.
 * - timeStamp: {@link TouchEvent#timeStamp} of the event that triggered this
 *   handler. 
 * - changedTouch: One of {@link TouchEvent#changedTouches}
 *
 * @typdef {function(DOMHighResTimeStamp, number, !Touch)}
 */
TouchSurface.TouchChangedHandler;


/** @enum {string} */
TouchSurface.Options = {
  MAXIMIZED: 'touchSurfaceMaximized',
};


/** @enum {string} */
TouchSurface.Events = {
  LOADED: 'TouchSurface.Events.LOADED',
  RESIZE: 'TouchSurface.Events.RESIZE'
};

/** @enum {string} */
TouchSurface.Setting = {
  LINE_COLOR: 'LINE_COLOR',
  LINE_WIDTH: 'LINE_WIDTH',
  BACKGROUND_COLOR: 'BACKGROUND_COLOR'
};


/** @enum {TouchSurface.Setting} */
TouchSurface.DefaultSettings = {
  BACKGROUND_COLOR: '#ffffff',
  LINE_COLOR: '#000000'
};


/**
 * @param {string} touchEventId
 * @return {string} RGB hex value
 */
TouchSurface.buildRandomRgbStyle = function() {
  return '#' + (Math.random().toString(16) + '0000000').slice(2, 8);
};


/** @param {!HTMLCanvasElement} canvasEl */
TouchSurface.prototype.bindToCanvas = function(canvasEl) {
  if (!canvasEl.nodeName ||
      !canvasEl.nodeName.toLowerCase ||
      canvasEl.nodeName.toLowerCase() != 'canvas') {
    throw new Error('`el` of `bindToCanvas(el)` MUST be a <canvas> Element');  
  }

  if (this.context_) {
    throw new Error('bindToCanvas should only be called once!');
  }

  this.context_ = canvasEl.getContext('2d');
  this.contextTouch = new ContextTouch(this.context_);

  if (this.isEnabled(TouchSurface.Options.MAXIMIZED)) {
    // Maximize playing surface now
    this.window_.requestAnimationFrame(
        this.resizeSurfaceToContainer_.bind(
            this, this.context_  /*surface*/, this.window_  /*container*/));

    // .. and in the future
    this.queueRefreshTask_(
        this.window_,
        'resize',
        this.resizeSurfaceToTarget_.bind(this, this.context_));
  }  

  // Listen to interactions
  var renderSurfaceOn = this.queueRefreshTask_.bind(this, canvasEl);
  renderSurfaceOn('touchstart', this.handleTouchStart_.bind(this));
  renderSurfaceOn('touchmove', this.handleTouchMove_.bind(this));
  renderSurfaceOn('touchend', this.handleTouchEnd_.bind(this));
  renderSurfaceOn('touchcancel', this.handleTouchEnd_.bind(this));

  this.rootScope_.$broadcast(TouchSurface.Events.LOADED, this);
};


/**
 * @param {TouchSurface.Setting} setting
 * @param {string=} opt_value
 * @private
 */
TouchSurface.prototype.updateSettings_ = function(setting, opt_value) {
  this.settings_[setting] = angular.isDefined(opt_value) ?
      opt_value :
      (TouchSurface.DefaultSettings[setting] || null);
};


/** @param {string=} opt_lineColor to optionally override default value */
TouchSurface.prototype.setLineColorSetting = function(opt_lineColor) {
  this.updateSettings_(TouchSurface.Setting.LINE_COLOR, opt_lineColor);
};


/** @return {?string} */
TouchSurface.prototype.getLineColorSetting = function() {
  return this.settings_[TouchSurface.Setting.LINE_COLOR] || null;
};


/** @param {string=} opt_backgroundColor to otionally override default value */
TouchSurface.prototype.setBackgroundColorSetting = function(opt_backgroundColor) {
  this.updateSettings_(TouchSurface.Setting.BACKGROUND_COLOR, opt_backgroundColor);
};


/** @return {?string} */
TouchSurface.prototype.getBackgroundColorSetting = function() {
  return this.settings_[TouchSurface.Setting.BACKGROUND_COLOR] || null;
};


/** @param {string=} opt_lineWidth to optionally override default value */
TouchSurface.prototype.setLineWidthSetting = function(opt_lineWidth) {
  this.updateSettings_(TouchSurface.Setting.LINE_WIDTH, opt_lineWidth);
};


/** @return {?string} */
TouchSurface.prototype.getLineWidthSetting = function() {
  return this.settings_[TouchSurface.Setting.LINE_WIDTH] || null;
};


/** @return {!Canvas} */
TouchSurface.prototype.getCanvas = function() {
  return this.context_.canvas;
};


/** @return {!Canvas} */
TouchSurface.prototype.getContext = function() {
  return this.context_;
};


/**
 * @param {!Event} event
 * @private
 */
TouchSurface.prototype.attemptPreventDefault_ = function(event) {
  if (event.cancelable) {
    event.preventDefault();
  }
};


/**
 * @param {string} hexColorStyle
 *     CSS style hex value starting with hash symbol, followed by 3 pairs of
 *     alpha-numeric characters in hex range. eg: <code>'#ff12e3'</code>
 * @param {{r: number, g: number, b: number}}
 *     Decimal values for "red", "green", "blue" as scraped
 *     from {@code hexColorStyle}. eg: <code>{r: 'ff', g: '12', b: 'e3'}</code>
 */
TouchSurface.buildHexMapFromRgbStyle_ = function(hexColorStyle) {
  var hashRgb = hexColorStyle.
      match(/^#(\w\w)(\w\w)(\w\w)$/);
  var rgb = {hex: {r: hashRgb[1], g: hashRgb[2], b: hashRgb[3]}};
  rgb.dec = {
    r: parseInt(rgb.hex.r, 16),
    g: parseInt(rgb.hex.g, 16),
    b: parseInt(rgb.hex.b, 16)
  };
  return rgb;
};


/**
 * Plays back all rendered history, whether its been erased or not.
 * 
 * @param {number=} opt_endIndex
 */
TouchSurface.prototype.playBack = function(opt_endIndex) {
  this.contextHistory.playBack(this.context_, opt_endIndex);
};


/**
 * Re-renders the current animations on surface as they currently appear.
 *
 * @param {boolean=} opt_retainCurrentSurface
 */
TouchSurface.prototype.redraw = function(opt_retainCurrentSurface) {
  var currentIndex = this.contextHistory.getPresentIndex();
  if (!opt_retainCurrentSurface) {
    this.clear(true  /*opt_offTheRecord*/);
  }
  this.playBack(currentIndex);
};


/**
 * Erases all currently rendered animations on the surface.
 *
 * @param {boolean=} opt_offTheRecord
 */
TouchSurface.prototype.clear = function(opt_offTheRecord) {
  if (opt_offTheRecord) {
    ContextHistory.erase(this.context_);
  } else {
    this.contextHistory.undoAll(this.context_);
  }
};


/** Unrenders the most previously added update */
TouchSurface.prototype.undo = function() {
  if (!this.contextHistory.isUndoPossible()) {
    return;
  }

  this.playBack(this.contextHistory.getPreviousUpdateIndex());
};


/** Re-renders the last update erased with {@link #undo}. */
TouchSurface.prototype.redo = function() {
  if (!this.contextHistory.isRedoPossible()) {
    return;
  }

  this.playBack(this.contextHistory.getNextUpdateIndex());
};


/**
 * @param {TouchSurface.Options} option
 * @return {boolean}
 */
TouchSurface.prototype.isEnabled = function(option) {
  return Boolean(this.options_.$attr[option]);
};


/** @return {boolean} */
TouchSurface.prototype.isDirty = function() {
  return !this.contextHistory.isEmpty() &&
      this.contextHistory.getPresentIndex() >= 0;
};


/**
 * @param {!Event} event
 * @return {boolean}
 * @private
 */
TouchSurface.prototype.contextmenuEventHandler_ = function(event) {
  this.attemptPreventDefault_(event);
  return false;
};


/**
 * Calls {@link EventTarget.addEventListener} with some performant defaults.
 *
 * NOTE: Passes "false" for "useCapture" parameter.
 *
 * @param {!EventTarget} target
 * @param {string} eventName
 * @param {function} handler
 * @private
 */
TouchSurface.prototype.queueRefreshTask_ = function(target, eventName, handler) {
  target.addEventListener(eventName, function(event) {
    var rafIdIdx = Object.keys(this.rafCancelIds_).length;
    var eventArgs = arguments;
    this.rafCancelIds_[rafIdIdx] = this.window_.
        requestAnimationFrame(function() {
          var args = Array.prototype.slice.call(eventArgs).
              concat(Array.prototype.slice.call(arguments));
          var taskReturn = handler.apply(null  /*this*/, args);
          this.rafCancelIds_[rafIdIdx] = null;
          this.rootScope_.$apply();
          return taskReturn;
        }.bind(this));
    return true;  // cancel
  }.bind(this),  false  /*useCapture*/);
};


/** Scope destroy cleanup handler */
TouchSurface.prototype.destroyHandler = function() {
  this.rafCancelIds_.forEach(function(rafId, refreshTaskId) {
    if (rafId === null) {
      return;
    }
    this.window_.cancelAnimationFrame(rafId);
  }.bind(this));
};


/**
 * @param {!CanvasRenderingContext2D} surface
 * @param {!Event} event
 * @private
 */
TouchSurface.prototype.resizeSurfaceToTarget_ = function(surface, event) {
  if (!event.target) {
    // strange: this happens when opening dev console
    // (eg: `event` is: 1987.7080000005662)
    return;
  }

  this.resizeSurfaceToContainer_(surface, event.target);
  this.redraw();  // put everything back where it was
};


/**
 * @param {!CanvasRenderingContext2D} surface
 * @param {!Window} container
 * @private
 */
TouchSurface.prototype.resizeSurfaceToContainer_ = function(surface, container) {
  surface.canvas.width = container.innerWidth;
  surface.canvas.height = container.innerHeight;
  this.rootScope_.$broadcast(TouchSurface.Events.RESIZE);
};


/**
 * @param {!TouchEvent} touchEvent
 * @param {DOMHighResTimeStamp} animationFrame
 * @return {boolean} cancelable
 * @private
 */
TouchSurface.prototype.handleTouchStart_ = function(touchEvent, animationFrame) {
  this.attemptPreventDefault_(touchEvent);

  Array.prototype.forEach.call(touchEvent.changedTouches, function() {
    this.touchStartChangedCallback_ ?
        this.touchStartChangedCallback_.apply(null  /*this*/, arguments) :
        null;
  }.bind(this, animationFrame, touchEvent.timeStamp));

  return true;
};


/**
 * @param {string} baseRgbStyle
 * @return {string} RGB hex value
 */
TouchSurface.prototype.buildRelatedColor = function(baseRgbStyle) {
  var baseColors = TouchSurface.
      buildHexMapFromRgbStyle_(baseRgbStyle);
  var randomColors = TouchSurface.
      buildHexMapFromRgbStyle_(TouchSurface.buildRandomRgbStyle());

  return '#' + ['r', 'g', 'b'].map(function(color) {
    return (
      (baseColors.dec[color] + randomColors.dec[color]) * 0.5
    ).toString(16);
  }).join('');
};


/**
 * @param {!TouchEvent} touchEvent
 * @param {DOMHighResTimeStamp} animationFrame
 * @return {boolean} cancelable
 * @private
 */
TouchSurface.prototype.handleTouchMove_ = function(touchEvent, animationFrame) {
  this.attemptPreventDefault_(touchEvent);

  Array.prototype.forEach.call(touchEvent.changedTouches, function() {
    this.touchMoveChangedCallback_ ?
        this.touchMoveChangedCallback_.apply(null  /*this*/, arguments) :
        null;
  }.bind(this, animationFrame, touchEvent.timeStamp));
  return true;   // cancel
};


/**
 * @param {!TouchEvent} touchEvent
 * @param {DOMHighResTimeStamp} animationFrame
 * @return {boolean} cancelable
 * @private
 */
TouchSurface.prototype.handleTouchEnd_ = function(touchEvent, animationFrame) {
  Array.prototype.forEach.call(touchEvent.changedTouches, function() {
    this.touchEndChangedCallback_ ?
        this.touchEndChangedCallback_.apply(null  /*this*/, arguments) :
        null;
  }.bind(this, animationFrame, touchEvent.timeStamp));
  return true;
};
