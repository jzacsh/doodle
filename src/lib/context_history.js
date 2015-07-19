'use strict';
var underscore = require('underscore');
var Outliers = require('./outliers');


// TODO: Figure out how to differntiate - and if it matters - between the
// following subtly different timestamps to determine which chronology of
// events an API is actually *trying* to expose:
// 1) execution *window* requestAnimationFrame timestamp {DOMHighResTimeStamp}
// 2) user's *touch* time - (Touch)Event.timeStamp
// 3) sequence we ran for #1
//    (ie: multiple {RenderUpdate}s happen per *window* in #1)



/** @constructor */
var ContextHistory = module.exports = function ContextHistory() {
  /**
   * Chronologically stored RenderUpdate records for previous
   * {@link TouchRendition} occurences, sorted by {@link RenderUpdate#timeStamp}
   * of respective original {@link TouchEvent} source.
   *
   * @private {!ContextHistory.Timeline}
   */
   this.history_ = [];

   /** @private {?number} -1 indicates Context is at clean slate */
   this.redoBranchIndex_ = null;

   /**
    * Existing alternative branches to the current timeline in
    * {@link #history_}, keyed by the index of the point in a timeline for
    * which they represent an alterntative.
    *
    * @private {!Object.<number, !Array.<!ContextHistory.Branch>}
    */
   this.branches_ = {};

   /**
    * Stores map of {@link TimestampDiff}s describing {@link RenderUpdate}s -
    * keyed by the updates' respective {@code timeStamp}s - which occurred just
    * before a significant pause in overall historical activity.
    *
    * @see {@link Outliers} for more
    *
    * @private {!Object.<
    *     number,
    *     !Object.<number, !ContextHistory.TimstampDiff>>}
    */
   this.cachedPrePauses_ = {};
};


/** @typedef {Array.<!ContextHistory.Update>} */
ContextHistory.Timeline;


/**
 * - history: the branched version of history
 * - branchedAt: timeStamp when the branch occurred.
 *
 * @typedef {{branchedAt: number, history: !ContextHistory.Timeline}}
 */
ContextHistory.Branch;


/**
 * Sorted {@link RenderUpdate}s, or sets of related updates from drag events
 * (say of a brush stroke).
 *
 * @typedef {RenderUpdate|Array.<!RenderUpdate>}
 */
ContextHistory.Update;


/** @typedef {{previous: number, next: number, delta: number}} */
ContextHistory.TimestampDiff;


/**
 * Whether major chapters in history should be found using
 * {@link Outliers#getMajorOutliers} as opposed to
 * {@link Outliers#getMinorOutliers}.
 *
 * @const {boolean}
 */
ContextHistory.HISTORY_OUTLIERS_MAJOR = true;


/**
 * @param {!ContextHistory.Update} update
 * @return {boolean}
 * @private
 */
ContextHistory.isSingleRender_ = function(update) {
  return !ContextHistory.isStrokedRender_(update);
};


/**
 * @param {!ContextHistory.Update} update
 * @return {!RenderUpdate}
 * @private
 */
ContextHistory.isStrokedRender_ = Array.isArray;


/**
 * @param {!ContextHistory.Update} update
 * @return {!RenderUpdate}
 * @private
 */
ContextHistory.getSingleRender_ = function(update) {
  return ContextHistory.isStrokedRender_(update) ? update[0] : update;
};


/**
 * @param {!ContextHistory.Update} updateA
 * @param {!ContextHistory.Update} updateB
 * @return {number}
 *     -1, 0, or 1; See Array.prototype.sort API.
 * @private
 */
ContextHistory.compareRenderUpdates_ = function(updateA, updateB) {
  var timeStampA = ContextHistory.getSingleRender_(updateA).timeStamp;
  var timeStampB = ContextHistory.getSingleRender_(updateB).timeStamp;


  if (timeStampA === timeStampB) {
    return 0;
  } else {
    return timeStampA < timeStampB ? -1 : 1;
  }
};


/**
 * @param {ContextHistory.TimestampDiff} diff
 * @return {number}
 * @private
 */
ContextHistory.getDeltaFromDiff_ = function(diff) {
  return diff.delta;
};


/**
 * @return {!Object.<number, !ContextHistory.TimstampDiff>} stored results
 * @private
 */
ContextHistory.prototype.getCachedPrePauses_ = function() {
  if (this.history_.length < 10) {
    return {};  // skip processing without some real data
  }

  // Try to fetch results from cache
  if (!underscore.isEmpty(this.cachedPrePauses_)) {
    var largestHistorySize = Object.
        keys(this.cachedPrePauses_).
        map(function(historySize, idx) {
          return parseInt(historySize, 10  /*radix*/);
        }).
        sort().
        pop();

    if (largestHistorySize < this.history_.length * 2) {
      return this.cachedPrePauses_[largestHistorySize];  // use cache
    }
  }

  // Populate and return from cache
  return this.cachedPrePauses_[this.history_.length] = (function() {
    var map = {};
    this.findSignificantDelats_(ContextHistory.HISTORY_OUTLIERS_MAJOR).
        forEach(function(diff) {
          map[diff.previous] = diff;
        }.bind(this));
    return map;
  }.bind(this))();
};


/**
 * @param {boolean} forMajor
 * @return {!Array.<!ContextHistory.TimestampDiff>}
 * @private
 */
ContextHistory.prototype.findSignificantDelats_ = function(forMajor) {
  var outliers = new Outliers(this.buildTimestampOutlierDeltas_());
  return forMajor ? outliers.getMajorOutliers() : outliers.getMinorOutliers();
};


/**
 * @return {!Array.<!Outliers.Value>}
 *     Sorted deltas, one less than number of {@link RenderUpdate}s in history.
 * @private
 */
ContextHistory.prototype.buildTimestampOutlierDeltas_ = function() {
  return this.history_.
      map(function(update, index, history) {
        if (index === 0) {
          return null;  // should be sliced off our results
        }

        var current = ContextHistory.getSingleRender_(update).timeStamp;
        var previous = ContextHistory.
            getSingleRender_(history[index - 1]).timeStamp;
        return new Outliers.Value({
          previous: previous,
          next: current,
          delta: current - previous
        }, ContextHistory.getDeltaFromDiff_);
      }).

      slice(1).  // remove index 0, where we returned null

      sort(function(diffA, diffB) {
        if (diffA.getValue() === diffB.getValue()) {
          return 0;
        }

        return diffA.getValue() < diffB.getValue() ? -1 : 1;
      });
};


/** @return {!ContextHistory.Update} */
ContextHistory.prototype.getPrePauseHistory = function() {
  return this.history_.filter(this.isUpdatePrePause.bind(this));
};


/** @return {boolean} */
ContextHistory.prototype.isEmpty = function() {
  return !Boolean(this.history_.length);
};


/**
 * @param {!RenderUpdate|!Array.<!RenderUpdate>} update
 * @return {boolean}
 */
ContextHistory.prototype.isUpdatePrePause = function(update) {
  return this.isUpdateStampPrePause(
      ContextHistory.getSingleRender_(update).timeStamp);
};


/**
 * @param {number} timeStamp
 * @return {boolean}
 */
ContextHistory.prototype.isUpdateStampPrePause = function(timeStamp) {
  return Boolean(this.getCachedPrePauses_()[timeStamp]);
};



/**
 * @return {number} Array index of the final possible {@link RenderUpdate}.
 * @private
 */
ContextHistory.prototype.getEndingIndex_ = function() {
  return this.history_.length - 1;
};


/**
 * Erases {@code context} without updating {@link ContextHistory}.
 *
 * @param {!CanvasRenderingContext2D} context
 */
ContextHistory.erase = function(context) {
  context.clearRect(
      0,  // pointX
      0,  // pointY
      context.canvas.width,
      context.canvas.height);
};


/**
 * Re-renders all previously rendered touch surface animations through the
 * present to the future, unless {@code opt_endIndex} is present.
 *
 * @param {!CanvasRenderingContext2D} context
 * @param {number=} opt_endIndex
 */
ContextHistory.prototype.playBack = function(context, opt_endIndex) {
  var isPartialPlayback = underscore.
      isNumber(opt_endIndex) && opt_endIndex !== this.getEndingIndex_();

  var isRewind = isPartialPlayback && opt_endIndex < this.getPresentIndex();
  var isRedo = isPartialPlayback && opt_endIndex > this.getPresentIndex();
  if (isRewind) {
    ContextHistory.erase(context);  // we're rewinding, clear the canvas first
  }

  var isPartialPlaybackInProgress = isPartialPlayback;
  this.history_.forEach(function(update, index, history) {
    if (isRedo && index <= this.getPresentIndex()) {
      return;  // ignore: this is old history, already rendered
    }

    if (isPartialPlayback) {
      if (!isPartialPlaybackInProgress) {
        return;  // we've already finished partially rerendering
      } else if (index > opt_endIndex) {
        this.setRedoBranch_(index - 1);
        isPartialPlaybackInProgress = false;
        return;  // last update was the end of partial rendering
      }
    }

    ContextHistory.playBackUpdate_(context, update);
  }.bind(this));

  if (!isPartialPlayback) {
    this.redoBranchIndex_ = null;
  }
};


/**
 * @param {!CanvasRenderingContext2D} context
 * @param {!ContextHistory.Update} update
 * @private
 */
ContextHistory.playBackUpdate_ = function(context, update) {
  (ContextHistory.isStrokedRender_(update) ? update : [update]).
      forEach(function(renderUpdate) {
        renderUpdate.playBack(context);
      });
};


/**
 * @return {boolean}
 *     Whether we're rewound in history, and have more {@link RenderUpdate}s to
 *     potentially playback.
 */
ContextHistory.prototype.isRedoPossible = function() {
  return underscore.isNumber(this.redoBranchIndex_);
};


/** @return {number} */
ContextHistory.prototype.countPossibleRedos = function() {
  return this.isRedoPossible() ?
      this.getEndingIndex_() - this.getPresentIndex() :
      0;
};


/** @return {boolean} Whether we've any history older than our current state. */
ContextHistory.prototype.isUndoPossible = function() {
  return Boolean(this.countPossibleUndos());
};


/**
 * @param {number=} opt_historyIndex
 *     Optionally specify a historical index for which to get a timeStamp.
 *     Defaults to {@link #getPresentIndex}.
 * @return {number} timeStamp
 */
ContextHistory.prototype.getTimeStamp = function(opt_historyIndex) {
  var historyIndex = underscore.isUndefined(opt_historyIndex) ?
                     this.getPresentIndex() :
                     opt_historyIndex;
  return ContextHistory.getSingleRender_(this.history_[historyIndex]).timeStamp;
};


/** @return {number} */
ContextHistory.prototype.countPossibleUndos = function() {
  return this.getPresentIndex() + 1  /* we can always undo [0] */;
};


/** @return {?RenderUpdate} created after the current  */
ContextHistory.prototype.getNextUpdateIndex = function() {
  return this.isRedoPossible() ? this.getPresentIndex() + 1 : null;
};


/** @return {?number} index occurring just before the current */
ContextHistory.prototype.getPreviousUpdateIndex = function() {
  return this.isUndoPossible() ? this.getPresentIndex() - 1 : null;
};


/** @return {number} index of the most recently rendered update in history.*/
ContextHistory.prototype.getPresentIndex = function() {
  return this.isRedoPossible() ? this.redoBranchIndex_ : this.getEndingIndex_();
};


/**
 * Throws if {@code index} is invalid or the current {@link #history_}.
 *
 * @param {number} index
 * @private
 */
ContextHistory.prototype.assertValidHistoryIndex_ = function(index) {
  if (index >= 0 && index <= this.getEndingIndex_()) {
    return;
  }

  throw new Error(
      'Invalid history(length: ' + this.history_.length + ') index, ' +
      '"' + index + '"; expected value ' +
      '[0-' + this.getEndingIndex_() + ']');
};


/**
 * Mark history as totally rewound to before its first {@link RenderUpdate}
 *
 * @param {!CanvasRenderingContext2D} context
 */
ContextHistory.prototype.undoAll = function(context) {
  ContextHistory.erase(context);
  this.redoBranchIndex_ = -1;
};


/**
 * @param {number} historyIndex
 * @private
 */
ContextHistory.prototype.setRedoBranch_ = function(historyIndex) {
  if (historyIndex !== -1) {
    this.assertValidHistoryIndex_(historyIndex);
  }

  this.redoBranchIndex_ = historyIndex === this.getEndingIndex_() ?
      null :  // We're at the forefront of history
      historyIndex;
};


/**
 * Records {@code relatedUpdates} for reference among wider history of updates.
 *
 * NOTE: Multiple {@link RenderUpdate} events may have the same trigger time,
 * but have been rendered in a particular order. This means, for example, that
 * if {@code renderUpdates} first element draws the first half of a line and the
 * second element draws the second half of a line, that significance is lost
 * here (the same is true for two simultaneously rendered items: eg, with
 * multi-touch events).
 *
 * @param {number} recordingTimeStamp
 *     {@code relatedUpdates}'s last newest timeStamp causing this recording.
 * @param {!Array.<!RenderUpdate>} relatedUpdates
 */
ContextHistory.prototype.recordRelatedUpdates = function(
    recordingTimeStamp, relatedUpdates) {
  this.maybeBranchForUpdatesAt_(recordingTimeStamp);

  var isStrokedRender = relatedUpdates.length > 1;
  var updates = isStrokedRender ? relatedUpdates : relatedUpdates[0];

  this.history_.push(updates);

  if (!isStrokedRender) {
    this.history_ = this.history_.sort(ContextHistory.compareRenderUpdates_);
  }
};


/**
 * @param {number} branchTimeStamp
 * @private
 */
ContextHistory.prototype.maybeBranchForUpdatesAt_ = function(branchTimeStamp) {
  if (!this.isRedoPossible()) {
    return;  // nothing to branch
  }

  var presentIndex = this.getPresentIndex();
  this.branches_[presentIndex] = this.branches_[presentIndex] || [];
  this.branches_[presentIndex].push({
    branchedAt: branchTimeStamp,
    history: this.history_.splice(presentIndex + 1, this.history_.length)
  });
  this.redoBranchIndex_ = null;
};


/** @return {Array.<!ContextHistory.Branch>} for the current point in history */
ContextHistory.prototype.getHistoricalBranches = function() {
  return this.branches_[this.getPresentIndex()] || null;
};


/** @return {boolean} */
ContextHistory.prototype.hasHistoricalPauses = function() {
  return underscore.some(this.cachedPrePauses_, function(update) {
    return Boolean(update && update.length);
  });
};


/** @return {boolean} */
ContextHistory.prototype.hasHistoricalBranches = function() {
  return !underscore.isEmpty(this.branches_);
};


/** @return {boolean} whether current point in history has alternatives. */
ContextHistory.prototype.isBranchedHistoryAvailable = function() {
  return Boolean(this.getHistoricalBranches());
};
