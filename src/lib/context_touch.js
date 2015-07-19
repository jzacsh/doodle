'use strict';
var TouchRendition = require('./touch_rendition');
var underscore = require('underscore');



/**
 * Chronological lists of ongoing {@link Touch} instances representing active
 * points of contact on {@code context}.
 *
 * @param {!CanvasRenderingContext2D} context
 * @constructor
 */
var ContextTouch = module.exports = function ContextTouch(context) {
  /** @private {!CanvasRenderingContext2D} */
  this.context_ = context;

  /**
   * Ongoing {@link Touch} instances on the DOM, keyed by their "identifier"
   * value. Null values indicate they're no longer active.
   *
   * NOTE: Re-used keys do not indicate any relation to previous values, as DOM
   * Touch APIs reuse their identifiers.
   *
   * @private {!Object.<number, !Array.<!TouchRendition>>}
   */
  this.ongoing_ = {};
};


/**
 * Either native DOM {@link Touch} object, or its "identifier" value.
 * @typedef {Touch|number}
 */
ContextTouch.ChangedTouchKey;


/**
 * NOTE: COPY PASTED FROM "setup code" in {@code Array.prototype.each} on:
 * http://jsperf.com/reverse-foreach-vs-reversal-iteration/4
 *
 * @param {!Array} a
 * @param {function(*, number, !Array)} callback
 * @param {number} from
 * @param {number} to
 * @param {!Object*} opt_this
 * @private
 */
 // TODO load a module that provides this and delete it from here
ContextTouch.arrayEach_ = function(a, callback, from, to, opt_this) {
  var length = a.length;

  var runCallback = function() {
    callback.call(
        opt_this || null,  // this
        a[from],  // value
        from,  // key
        a  /*array*/);
  };

  if (from > to) {
    do { runCallback(); } while (from-- !== to);
  } else if (from < to) {
    do { runCallback(); } while (from++ !== to);
  } else {
    runCallback();
  }
};


/**
 * @param {!ContextTouch.ChangedTouchKey} changedTouchKey
 * @return {number}
 *     {@code changedTouchKey}'s "identifier" value.
 * @private
 */
ContextTouch.keyToId_ = function(changedTouchKey) {
  return underscore.isNumber(changedTouchKey) ?
      changedTouchKey :
      changedTouchKey.identifier;
};


/**
 * @param {!ContextTouch.ChangedTouchKey} changedTouchKey
 * @param {function(!TouchRendition, number, ongoingTouches)} handler
 * @private
 */
ContextTouch.prototype.forEachOngoing_ = function(changedTouchKey, handler) {
  this.getOngoingRenditions(changedTouchKey).forEach(handler);
};


/**
 * @param {!Touch} touch
 * @param {DOMHighResTimeStamp} frame
 * @param {number} timeStamp
 * @return {!TouchRendition}
 */
ContextTouch.prototype.startTouchRendition = function(touch, frame, timeStamp) {
  var id = touch.identifier;

  var touchRendition = new TouchRendition(touch, frame, timeStamp);
  this.ongoing_[id] = this.ongoing_[id] || [];
  this.ongoing_[id].push(touchRendition);

  return touchRendition;
};


/**
 * @param {!ContextTouch.ChangedTouchKey} changedTouchKey
 * @return {boolean}
 *     Whether {@link #getOngoingChanges} will return {@link TouchRendition}s.
 */
ContextTouch.prototype.hasOngoingRenditions = function(changedTouchKey) {
  var ongoingTouches = this.getOngoingRenditions.apply(this, arguments);
  return Boolean(ongoingTouches && ongoingTouches.length);
};


/**
 * @param {!ContextTouch.ChangedTouchKey} changedTouchKey
 * @return {Array.<!TouchRendition>}
 */
ContextTouch.prototype.getOngoingRenditions = function(changedTouchKey) {
  return this.ongoing_[ContextTouch.keyToId_(changedTouchKey)] || null;
};


/** @param {!Touch} changedTouch */
ContextTouch.prototype.deleteOngoingRenditions = function(changedTouch) {
  delete this.ongoing_[changedTouch.identifier];
};


/** @param {!TouchRendition} rendition */
ContextTouch.prototype.playBackTouch = function(rendition) {
  rendition.renderUpdate.playBack(this.context_);
};


/** @param {!ContextTouch.ChangedTouchKey} changedTouchKey */
ContextTouch.prototype.playBackOngoingRenditions = function(changedTouchKey) {
  this.forEachOngoing_(changedTouchKey, this.playBackTouch.bind(this));
};


/** @param {!TouchRendition} rendition */
ContextTouch.prototype.eraseTouch = function(rendition) {
  rendition.renderUpdate.erase(this.context_);
};


/** @param {!ContextTouch.ChangedTouchKey} changedTouchKey */
ContextTouch.prototype.eraseOngoingRenditions = function(changedTouchKey) {
  this.forEachOngoing_(changedTouchKey, this.eraseTouch.bind(this));
};


/**
 * @param {!ContextTouch.ChangedTouchKey} changedTouchKey
 * @return {!Array.<!RenderUpdate>}
 *     Chronologically keyed RenderUpdate records for previous
 *     {@link TouchRendition} occurences related to {@code changedTouchKey}.
 *     Keys are the respective historys' triggering timestamps.
 */
ContextTouch.prototype.listOngoingRenderUpdates = function(changedTouchKey) {
  var renderUpdates = [];
  this.forEachOngoing_(changedTouchKey, function(rendition) {
    renderUpdates.push(rendition.renderUpdate);
  }.bind(this));
  return renderUpdates;
};


/**
 * @param {!TouchRendition} rendition
 * @return {!TouchRendition}
 * @private
 */
ContextTouch.prototype.getFirstTouch_ = function(rendition) {
  return this.getOngoingRenditions(rendition.touch.identifier)[0];
};


/**
 * @param {!TouchRendition} rendition
 * @return {!TouchRendition}
 * @private
 */
ContextTouch.prototype.getPreviousTouch_ = function(rendition) {
  var touches = this.getOngoingRenditions(rendition.touch.identifier);
  return touches[touches.length - 2];
};


/**
 * @param {!TouchRendition} touch
 * @param {function(!ContextTouch.ContextModification) : boolean} matcher
 * @return {!ContextTouch.ContextModification}
 *     Last chronological occurance of a Modification, passing {@code matcher}.
 */
ContextTouch.prototype.findLastMatchingContext = function(touch, matcher) {
  return this.findMatchingContext_(
      touch, matcher, false  /*filterChronologically*/);
};


/**
 * @param {!TouchRendition} touch
 * @param {function(!ContextTouch.ContextModification) : boolean} matcher
 * @return {!ContextTouch.ContextModification}
 *     First chronological occurance of a Modification, passing {@code matcher}.
 */
ContextTouch.prototype.findFirstMatchingContext = function(touch, matcher) {
  return this.findMatchingContext_(
      touch, matcher, true  /*filterChronologically*/);
};


/**
 * NOTE: Throws if {@code matcher} never returns true.
 *
 * @param {!TouchRendition} rendition
 * @param {function(!ContextTouch.ContextModification) : boolean} matcher
 * @param {boolean} filterChronologically
 * @return {!ContextTouch.ContextModification}
 *     First - or last, if {@code filterChronologically} - chronological
 *     occurance of a Modification to {@code rendition}, passing
 *     {@code matcher}.
 * @private
 */
// TODO Profile performance here, consider caching these lookups
ContextTouch.prototype.findMatchingContext_ = function(
    rendition, matcher, filterChronologically) {
  var matchingMod = null;

  var touches = this.getOngoingRenditions(rendition.touch.identifier);

  var start = filterChronologically ? 0 : touches.length - 1;
  var end = filterChronologically ? touches.length - 1 : 0;

  ContextTouch.arrayEach_(touches, function(touch) {
    touch.renderUpdate.modifications.forEach(function(mod) {
      if (matchingMod) {
        return;
      }

      matchingMod = matcher(mod) ? mod : null;
    });

    if (matchingMod) {
      return;
    }
  }, start, end);

  if (!matchingMod) {
    throw new Error('Failed to find previous matching modification');
  }

  return matchingMod;
};
