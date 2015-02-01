'use strict';
var ContextModification = require('./context_modification');



/**
 * Singular point in time updating the rendition of a some CanvasContext.
 *
 * NOTE: Originally inspired by the more complex algorithm, which saves and
 * continually redraws renderings to make small changes, in
 * {@link CanvasLayers.DamagedRectManager#drawRects} from:
 * https://bitbucket.org/ant512/canvaslayers/src/e42959ebe1ed7e89ed6177c3007c8ef2509db6fa/canvaslayers.js
 *
 * @param {number} timeStamp
 * @param {!Array.<!ContextModification>=} opt_modifications
 *     Defaults to building a new history of modifications.
 * @constructor
 */
var RenderUpdate = module.exports = function RenderUpdate(
    timeStamp,
    opt_modifications) {
  /** @type {number} */
  this.timeStamp = timeStamp;

  /** @type {!Array.<!ContextModification>} */
  this.modifications = opt_modifications || [];
};


/**
 * Renders modifications to current context for this history.
 * @param {!CanvasRenderingContext2D} context
 */
RenderUpdate.prototype.playBack = function(context) {
  this.modifications.forEach(function(modification) {
    modification.playBack(context);
  }.bind(this));
};


/**
 * Renders modifications to current context for this history.
 * @param {!CanvasRenderingContext2D} context
 */
RenderUpdate.prototype.erase = function(context) {
  var disableEraserCallback = RenderUpdate.
      buildResetAfterEraserContext_(context);
  RenderUpdate.setSurfaceContextToEraser_(context);
  this.playBack.apply(this, context);
  disableEraserCallback();
};


/**
 * NOTE: COPY PASTED FROM http://stackoverflow.com/a/3334204
 * @param {!CanvasRenderingContext2D} context
 * @private
 */
RenderUpdate.setSurfaceContextToEraser_ = function(context) {
  context.globalCompositeOperation = 'destination-out';
  context.strokeStyle = 'rgba(0,0,0,1)';
};


/**
 * See {@link #setSurfaceContextToEraser_}.
 * @param {!CanvasRenderingContext2D} context
 * @private
 */
RenderUpdate.buildResetAfterEraserContext_ = function(context) {
  var originalGlobalCompositeOperation = context.globalCompositeOperation;
  var originalStrokeStyle = context.strokeStyle;
  return function(ctx) {
    ctx.globalCompositeOperation = originalGlobalCompositeOperation;
    ctx.strokeStyle = originalStrokeStyle;
  }.bind(null  /*this*/, context);
};


/**
 * Appends a {@link ContextModification.MethodCall} to this history.
 *
 * @param {string} methodName
 * @param {*...} var_args
 * @return {!Ctrl.RenderUpdate}
 */
RenderUpdate.prototype.recordProperty = function(key, value) {
  this.modifications.push(
      new ContextModification(
          ContextModification.ModificationType.PROPERTY,
          {key: key, value: value},
          undefined  /*opt_methodCall*/));
  return this;
};


/**
 * Appends a single {@link ContextModification.MethodCall} to this history.
 *
 * @param {string} methodName
 * @param {*...} var_args
 * @return {!RenderUpdate}
 */
RenderUpdate.prototype.recordMethod = function(methodName, var_args) {
  this.modifications.push(
      new ContextModification(
          ContextModification.ModificationType.METHOD,
          undefined,  // opt_property
          {
            name: methodName,
            args: Array.prototype.slice.call(arguments, 0).slice(1)
          }));
  return this;
};
