'use strict';

var ContextHistory = require('../../src/lib/context_history');
var describe = require('mocha').describe;
var it = require('mocha').it;
var expect = require('expect.js');

describe('ContextHistory', function() {
  describe('static', function() {
    it('erase');
  });

  it('#getPrePauseHistory');
  it('#isEmpty');
  it('#isUpdatePrePause');
  it('#isUpdateStampPrePause');
  it('#playBack');
  it('#isRedoPossible');
  it('#countPossibleRedos');
  it('#isUndoPossible');
  it('#getTimeStamp');
  it('#countPossibleUndos');
  it('#getNextUpdateIndex');
  it('#getPreviousUpdateIndex');
  it('#getPresentIndex');
  it('#undoAll');
  it('#recordRelatedUpdates');
  it('#getHistoricalBranches');
  it('#hasHistoricalPauses');
  it('#hasHistoricalBranches');
  it('#isBranchedHistoryAvailable');
});
