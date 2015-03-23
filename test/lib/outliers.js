'use strict';

var Outliers = require('../../src/lib/outliers');
var expect = require('expect.js');
var sinon = require('sinon');

describe('Outliers', function() {
  /** @type {!Outliers} */
  var outliers;

  /** @const {!Array.<!Outliers.Value>} */
  var TEST_SET = [7, 15, 36, 39, 40, 41, 90];

  beforeEach(function() {
    outliers = new Outliers(TEST_SET.map(function(num) {
      return new Outliers.Value(num, function(val) {
        return val;
      });
    }));
  });

  it('#getMinorOutliers', function() {
    var minorOutliers = outliers.getMinorOutliers();
    expect(minorOutliers.length).to.be(1);
    expect(minorOutliers[0]).to.be(90);

    expect(outliers.getMajorOutliers().length).to.be(0);
  });

  it('#getMajorOutliers', function() {
    outliers = new Outliers([7, 15, 36, 39, 40, 41, 200]);
    var majorOutliers = outliers.getMajorOutliers();
    expect(majorOutliers.length).to.be(1);
    expect(majorOutliers[0]).to.be(200);

    var minorOutliers = outliers.getMinorOutliers();
    expect(minorOutliers.length).to.be(1);
    expect(minorOutliers[0]).to.be(200);
  });

  it('#reset', function() {
    sinon.spy(outliers, 'calculateQuartileRanges');
    expect(outliers.calculateQuartileRanges.callCount).to.be(0);

    expect(outliers.getMinorOutliers()[0]).to.be(90);
    expect(outliers.calculateQuartileRanges.callCount).to.be(1);

    // Cached
    expect(outliers.getMinorOutliers()[0]).to.be(90);
    expect(outliers.calculateQuartileRanges.callCount).to.be(1);

    // Clear cache
    outliers.reset();
    expect(outliers.getMinorOutliers()[0]).to.be(90);
    expect(outliers.calculateQuartileRanges.callCount).to.be(2);

    // Cached
    expect(outliers.getMinorOutliers()[0]).to.be(90);
    expect(outliers.calculateQuartileRanges.callCount).to.be(2);
  });

  it('works with raw data, rather than Outliers.Value', function() {
    outliers = new Outliers([7, 15, 36, 39, 40, 41, 90]);
    var minorOutliers = outliers.getMinorOutliers();
    expect(minorOutliers.length).to.be(1);
    expect(minorOutliers[0]).to.be(90);
  });

  describe('Outliers.Value', function() {
    /** @type {!Outliers.Value} */
    var value;

    it('#datum', function() {
      value = new Outliers.Value({foo: 5, bar: 7}, function() {});
      expect(value.datum.foo).to.be(5);
      expect(value.datum.bar).to.be(7);
    });

    it('#getValue', function() {
      value = new Outliers.Value({foo: 5, bar: 7}, function(datum) {
        return datum.foo;
      });
      expect(value.getValue()).to.be(5);

      value = new Outliers.Value({foo: 5, bar: 7}, function(datum) {
        return datum.bar;
      });
      expect(value.getValue()).to.be(7);

      value = new Outliers.Value({foo: 5, bar: 7}, function(datum) {
        return datum.bar - datum.foo;
      });
      expect(value.getValue()).to.be(2);
    });
  });
});
