'use strict';
// TODO(productionize) use some module system
// -- provide: ContextModification



/**
 * Singular visual change to CanvasRenderingContext2D.
 * 
 * NOTE: Only a single optional property can be passed, according to its
 * respective {@link ContextModification.ModificationType}.
 *
 * @param {ContextModification.ModificationType} type
 *     The type of modification at hand.
 * @param {!ContextModification.Property=} opt_property
 *     Descriptor if {@code type} is {@code PROPERTY}.
 * @param {!ContextModification.MethodCall=} opt_methodCall
 *     Descriptor if {@code type} is {@code METHOD}.
 * @constructor
 */
var ContextModification = function(type, opt_property, opt_methodCall) {
  ContextModification.
      assertDescriptorsMatchType_.apply(null  /*this*/, arguments);

  /** @type {ContextModification.ModificationType} */
  this.modificationType = type;

  /** @type {?ContextModification.Property} */
  this.property = opt_property || null;

  /** @type {?ContextModification.MethodCall} */
  this.methodCall = opt_methodCall || null;
};


/** @typedef {{key: string, value: string|number}} */
ContextModification.Property;


/** @typedef {{name: string, args: !Array.<*>}} */
ContextModification.MethodCall;


/** @enum {string} */
ContextModification.ModificationType = {
  PROPERTY: 'PROPERTY',
  METHOD: 'METHOD'
};


/**
 * Throws if {@link ContextModification} is constructed incorrectly.
 *
 * @param {ContextModification.ModificationType} type
 * @param {string=} opt_property
 * @param {!ContextModification.MethodCall=} opt_methodCall
 */
ContextModification.assertDescriptorsMatchType_ = function(
    type, opt_property, opt_methodCall) {
  var errorReason;
  switch (type) {
    case ContextModification.ModificationType.PROPERTY:
      if (opt_methodCall) {
        errorReason = '`MethodCall` cannot be used with';
      } else if (!opt_property) {
        errorReason = '`Property` required for';
      }
      break;
    case ContextModification.ModificationType.METHOD:
      if (opt_property) {
        errorReason = '`Property` cannot be used with';
      } else if (!opt_methodCall) {
        errorReason = '`MethodCall` required for';
      }
      break;
    default:
      errorReason = 'Unknown';
      break;
  }

  if (errorReason) {
    throw new Error(errorReason + ' ModificationType "' + type + '".');
  }
};


/**
 * Renders modifications to {@code context} as described by this instance.
 *
 * @param {!CanvasRenderingContext2D} context
 */
ContextModification.prototype.playBack = function(context) {
  switch (this.modificationType) {
    case ContextModification.ModificationType.PROPERTY:
      context[this.property.key] = this.property.value;
      break;
    case ContextModification.ModificationType.METHOD:
      context[this.methodCall.name].
          apply(context  /*this*/, this.methodCall.args);
      break;
  }
};