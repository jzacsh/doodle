'use strict';
var ContextModification = require('../../src/lib/context_modification');
var RenderUpdate = require('../../src/lib/render_update');
var expect = require('expect.js');
var sinon = require('sinon');
var _ = require('underscore');

describe('RenderUpdate', function() {
  var ModificationType = ContextModification.ModificationType;

  /** @type {!RenderUpdate} */
  var renderUpdate;

  /** @const {number} */
  var TEST_TIMESTAMP = 1234;

  beforeEach(function() {
    renderUpdate = new RenderUpdate(TEST_TIMESTAMP);
    expect(renderUpdate.modifications.length).to.be(0);
    expect(renderUpdate.timeStamp).to.be(TEST_TIMESTAMP);
  });

  it('#recordProperty(key, value)', function() {
    renderUpdate.recordProperty('fillStyle', '#ff0011');
    expect(renderUpdate.modifications.length).to.be(1);

    var modA = _.last(renderUpdate.modifications);
    expect(modA.modificationType).to.be(ModificationType.PROPERTY);
    expect(modA.property.key).to.be('fillStyle');
    expect(modA.property.value).to.be('#ff0011');

    // multiple recorded properties
    renderUpdate.recordProperty('lineWidth', 7);
    expect(renderUpdate.modifications.length).to.be(2);
    expect(_.last(renderUpdate.modifications)).not.to.be(modA);
  });

  it('#recordMethod(methodName, var_args)', function() {
    // without args
    renderUpdate.recordMethod('beginPath');
    expect(renderUpdate.modifications.length).to.be(1);
    var modA = _.last(renderUpdate.modifications);
    expect(modA.modificationType).to.be(ModificationType.METHOD);
    expect(modA.methodCall.name).to.be('beginPath');
    expect(modA.methodCall.args.length).to.be(0);

    // with args
    renderUpdate.recordMethod('arc', 'foo', 'bar', 'baz');
    expect(renderUpdate.modifications.length).to.be(2);
    var modB = _.last(renderUpdate.modifications);
    expect(modB.modificationType).to.be(ModificationType.METHOD);
    expect(modB.methodCall.name).to.be('arc');
    expect(modB.methodCall.args).to.eql([
      'foo', 'bar', 'baz'
    ]);
  });

  it('#playBack(context)', function() {
    renderUpdate.recordMethod('arc', 'foo', 'bar', 'baz');
    var modA = _.last(renderUpdate.modifications);
    sinon.spy(modA, 'playBack');

    var mockContext = {arc: sinon.spy()};
    renderUpdate.playBack(mockContext);
    sinon.assert.calledWith(modA.playBack, mockContext);
    sinon.assert.calledWith(mockContext.arc, 'foo', 'bar', 'baz');
  });

  it('#erase()', function() {
    throw new Error('implement me');
  });
});
