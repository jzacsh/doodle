'use strict';
// TODO(productionize) use some module system
// -- provide: 'TouchRendition'
// -- require('RenderUpdate')
// -- require('...some lib...') for `angular.*` utils, and delete `angular` refs



/**
 * Description of related {@link Touch} DOM events and their animations.
 *
 * @param {!Touch} touch
 * @param {DOMHighResTimeStamp} frame
 * @param {number} triggerTimestamp
 * @constructor
 */
var TouchRendition = function(touch, frame, triggerTimestamp) {
  /**
   * Purpose here is to enable generic features such as "undo" checkpoints or
   * even manipulation of visual 2D-"layers".
   *
   * @type {!RenderUpdate}
   */
  this.renderUpdate = new RenderUpdate(triggerTimestamp);

  /** @type {DOMHighResTimeStamp} */
  this.animationFrame = frame;

  /** @type {!Touch} */
  this.touch = TouchRendition.copyTouch_(touch);
};
var TouchRendition = TouchRendition;


/** @const {number} milliseconds */
TouchRendition.SIGNIFICANT_MOVE_DELTA_MS = 900;


/**
 * {@link Touch} API's properties.
 * @const {!Array.<string>} 
 */
TouchRendition.TOUCH_INTERFACE_PROPERTIES = [
  'identifier',
  'screenX',
  'screenY',
  'clientX',
  'clientY',
  'pageX',
  'pageY',
  'radiusX',
  'radiusY',
  'rotationAngle',
  'force',
  'target'
];


/**
 * NOTE: (mostly) COPY PASTED DIRECTLY FROM MOZILLA TOUCH ARTICLE:
 * http://developer.mozilla.org/docs/Web/Guide/Events/Touch_events#Selecting_a_color_for_each_touch
 *
 * @return {string} RGB hex value
 * @private
 */
TouchRendition.prototype.getMozillaExampleColorForTouchId_ = function() {
  var red = this.touch.identifier % 16;
  var green = Math.floor(this.touch.identifier / 2) % 16;
  var blue = Math.floor(this.touch.identifier / 6) % 16;
  return [
    '#',
    (red).toString(16),
    (green).toString(16),
    (blue).toString(16)
  ].join('');
};


/**
 * @param {!Touch} touch
 * @return {!Touch} pseudo Touch object.
 */
TouchRendition.copyTouch_ = function(touch) {
  var copy = {};
  TouchRendition.TOUCH_INTERFACE_PROPERTIES.forEach(function(property) {
    copy[property] = touch[property];
  });
  return copy;
};


/**
 * @param {number} animationFrame
 * @return {boolean}
 */
TouchRendition.prototype.isDistantFromFrame = function(animationFrame) {
  return Math.abs(this.animationFrame - animationFrame) >
      TouchRendition.SIGNIFICANT_MOVE_DELTA_MS;
};