'use strict';

var Outliers = require('../../src/lib/outliers');
var expect = require('expect.js');

describe('Outliers', function() {
  /** @type {!Outliers} */
  var outliers;

  it('#getMajorOutliers', function() {
    outliers = new Outliers();
    throw new Error('test!');
  });

  it('#getMinorOutliers', function() {
    throw new Error('test!');
  });

  it('#reset', function() {
    throw new Error('test!');
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
