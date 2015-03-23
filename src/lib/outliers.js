'use strict';

var _ = require('underscore');

/**
 * Interquartile Range analyzer intended to find outliers in {@code values}.
 *
 * For more, see: http://en.wikipedia.org/wiki/Quartile#Outliers
 *
 * @param {!Array.<!Outliers.Value>|!Array.<number>} values
 * @constructor
 */
var Outliers = module.exports = function Outliers(values) {
  /** @private {!Array.<!Outliers.Value>|!Array.<number>} */
  this.data_ = _.isNumber(values[0]) ?
    values.map(Outliers.Value.fromScalar) : values;

  /** @private {?Outliers.Analysis} */
  this.cache_ = null;
};



/**
 * @param {*} datum
 *     Anything from which {@code getter} will be able to fetch a numeric value.
 * @param {function(*) : number} getter
 *     Callback, given {@code datum}, will return its value for outlier analysis.
 * @constructor
 */
Outliers.Value = function(datum, getter) {
  /** @type {*} */
  this.datum = datum;
  /** @return {number} */
  this.getValue = getter.bind(null  /*this*/, datum);
};


/**
 * @param {number} rawScalar
 * @return {!Outliers.Value}
 */
Outliers.Value.fromScalar = function(rawScalar) {
  return new Outliers.Value(rawScalar, function(rawValue) {
    return rawValue;
  });
};


/**
 * @param {!Outliers.Value} value
 * @return {*} original raw datum {@code value} was intended to encapsulate.
 */
Outliers.Value.unwrap = function(value) {
  return value.datum;
};


/**
 * For more, see: http://en.wikipedia.org/wiki/Quartile#Definitions
 *
 * @typedef {{
 *     lower: number,
 *     median: !number,
 *     upper: number,
 *     irqDiff: number
 * }}
 */
Outliers.Quartiles;


/** @typedef {{high: number, low: number}} */
Outliers.Fencing;


/**
 * @typdef {{
 *     isDataOddLength: boolean,
 *     dataLength: number,
 *     quartiles: ?Outliers.Quartiles,
 *     innerFence: ?Outlier.Fencing,
 *     outerFence: ?Outlier.Fencing,
 *     minorOutliers: !Array.<!Outliers.Value>,
 *     majorOutliers: !Array.<!Outliers.Value>
 * }}
 */
Outliers.Analysis;


/**
 * @param {number} value
 * @return {boolean} whether {@code value} is an odd number.
 * @private
 */
Outliers.isOddNumber_ = function(value) {
  return Boolean(value % 2);
};


/**
 * @param {!Outliers.Fencing} fencing
 *     Particular bounds to check {@code datum} against.
 * @param {!Outliers.Value} datum
 * @return {boolean}
 * @private
 */
Outliers.isAnOutlier_ = function(fencing, datum) {
  return datum.getValue() < fencing.low || datum.getValue() > fencing.high;
};


/**
 * @param {!Outliers.Quartiles} quartiles
 * @param {number} irqMultiplier
 * @return {!Outliers.Fencing}
 * @private
 */
Outliers.buildFenceFromQuartiles_ = function(
    quartiles, irqMultiplier) {
  var bound = quartiles.irqDiff * irqMultiplier;
  return {
    high: quartiles.upper + bound,
    low: quartiles.lower - bound
  };
};


/**
 * WARNING: Presence of either {@code opt_startIndex} or {@code opt_length}
 * makes the other parameter non-optional.
 *
 * @param {!Array.<number>} values
 * @param {number=} opt_startIndex
 *     Optionally overrides starting index of {@code values}. Defaults to zero.
 * @param {number=} opt_length
 *     Optionally overrides length read from {@code values}. Defaults to length.
 * @return {number} median of elements in {@code values}.
 * @private
 */
Outliers.findMedianValue_ = function(values, opt_startIndex, opt_length) {
  var isArrayAsIs = arguments.length === 1;

  var valuesLength = isArrayAsIs ? values.length : opt_length;
  var halvedQtys = Math.ceil(valuesLength / 2);

  var arrayBuffer = isArrayAsIs ? 0 : opt_startIndex;
  if (Outliers.isOddNumber_(valuesLength)) {
    var medianIndex = halvedQtys - 1  /*Array 0-based: -1*/;
    return values[medianIndex + arrayBuffer].getValue();
  } else {
    var meanFirstHalfIndex = halvedQtys - 1  /*Array 0-based: -1*/;
    var meanLastHalfIndex = halvedQtys  /*Array 0-based: -1; next index: + 1*/;
    return (
      values[meanFirstHalfIndex + arrayBuffer].getValue() +
          values[meanLastHalfIndex + arrayBuffer].getValue()
    ) / 2;
  }
};


/** @return {!Array.<*>} */
Outliers.prototype.getMajorOutliers = function() {
  return this.getAnalysisCached_().
      majorOutliers.
      map(Outliers.Value.unwrap);
};


/** @return {!Array.<*>} */
Outliers.prototype.getMinorOutliers = function() {
  return this.getAnalysisCached_().
      minorOutliers.
      map(Outliers.Value.unwrap);
};


/** Resets internally cached results in case original {@code values} changed */
Outliers.prototype.reset = function() {
  this.cache_ = null;
};


/** @return {!Array.<!Outliers.Value>} */
Outliers.prototype.getAnalysisCached_ = function() {
  return (this.cache_ = this.cache_ || this.calculateQuartileRanges());
};


/** @return {!Outliers.Analysis} */
Outliers.prototype.calculateQuartileRanges = function() {
  this.cache_ = {quartiles: {}, dataLength: this.data_.length};
  this.cache_.isDataOddLength = Outliers.
      isOddNumber_(this.cache_.dataLength);
  this.cache_.quartiles.lower = this.findFirstQuartile_();
  this.cache_.quartiles.median = this.findSecondQuartile_();
  this.cache_.quartiles.upper = this.findThirdQuartile_();
  this.cache_.quartiles.irqDiff = this.findInterquartileRangeDiff_();
  this.cache_.outerFence = Outliers.
      buildFenceFromQuartiles_(this.cache_.quartiles, 1.5);
  this.cache_.innerFence = Outliers.
      buildFenceFromQuartiles_(this.cache_.quartiles, 3);

  this.cache_.minorOutliers = this.findFenceOutliers_(this.cache_.outerFence);
  this.cache_.majorOutliers = this.findFenceOutliers_(this.cache_.innerFence);

  return this.cache_;
};


/**
 * @param {!Outlier.Fencing} fencing
 * @return {!Array.<!Outliers.Value>}
 * @private
 */
Outliers.prototype.findFenceOutliers_ = function(fence) {
  return this.data_.filter(Outliers.isAnOutlier_.bind(null  /*this*/, fence));
};


/**
 * See {@link Outliers.Quartiles}
 *
 * @return {number} lower quartile
 * @private
 */
Outliers.prototype.findFirstQuartile_ = function() {
  var halvedQtys = Math.ceil(this.cache_.dataLength / 2);

  var medianBorderIndex = this.cache_.isDataOddLength ?
      halvedQtys - 1  /* odd qty, exclude median: -1 */ :
      halvedQtys;
  return Outliers.findMedianValue_(
      this.data_,
      0,  // opt_startIndex
      medianBorderIndex  /*opt_length*/);
};


/**
 * See {@link Outliers.Quartiles}
 *
 * @return {number} median
 * @private
 */
Outliers.prototype.findSecondQuartile_ = function() {
  return Outliers.findMedianValue_(this.data_);
};


/**
 * See {@link Outliers.Quartiles}
 *
 * @return {number} upper quartile
 * @private
 */
Outliers.prototype.findThirdQuartile_ = function() {
  var halvedQtys = Math.ceil(this.cache_.dataLength / 2);

  var medianBorderIndex = this.cache_.isDataOddLength ?
      halvedQtys      /*0-based index: -1; odd, exclude median: + 1*/ :
      halvedQtys + 1  /*0-based index: -1; even, go above median: + 2*/;
  return Outliers.findMedianValue_(
      this.data_,
      medianBorderIndex,  // opt_startIndex
      Math.floor(this.cache_.dataLength / 2)  /*opt_endIndex*/);
};


/**
 * See {@link Outliers.Quartiles}
 *
 * @return {number} difference between upper and lower quartiles.
 * @private
 */
Outliers.prototype.findInterquartileRangeDiff_ = function() {
  return this.cache_.quartiles.upper -
         this.cache_.quartiles.lower;
};
