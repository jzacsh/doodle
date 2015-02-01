'use strict';



/**
 * @param {!Document} $document
 * @param {!angular.Scope} $scope
 * @constructor
 * @ngInject
 */
var DoodleVersionCtrl = function DoodleVersionCtrl($document, $scope) {
  /** @private {!Document} */
  this.document_ = $document;

  /** @private {!angular.Scope} */
  this.scope_ = $scope;

  /** @private {!Object.<string, ?string>} */
  this.cachedMetaContent_ = {};
};


/**
 * @const {string}
 * @private
 */
DoodleVersionCtrl.NAME_PREFIX_ = 'doodleVersion';


/** @const {string} */
DoodleVersionCtrl.CTRL_AS = DoodleVersionCtrl.NAME_PREFIX_ + 'Ctrl';


/** @enum {string} */
DoodleVersionCtrl.MetaContent = {
  VERSION: 'doodle-tag-version',
  FEEDBACK: 'doodle-tag-feedback',
  APPURL: 'doodle-tag-appurl'
};


/** @const {!Array.<string|!Function>} */
DoodleVersionCtrl.CTRL_NG_INJECT = [
  '$document',
  '$scope',
  DoodleVersionCtrl
];


/** @const {string} */
DoodleVersionCtrl.FEEDBACK_FORM_MARKUP =
    '<span class="feedback">' +
    '  feedback: ' +

    '  <a class="github-feedback"' +
    '     target="_blank"' +
    '     ng-href="{{' + DoodleVersionCtrl.CTRL_AS + '.buildFeedbackFormUrl()}}">' +
    '    directly</a>' +

    '  or ' +

    '  <a class="direct-feedback"' +
    '     target="_blank"' +
    '     ng-href="{{' + DoodleVersionCtrl.CTRL_AS + '.buildFeedbackGithubUrl()}}">' +
    '    on Github</a>' +
    '</span>';


/**
 * @return {!angular.Directive}
 * @ngInject
 */
DoodleVersionCtrl.buildFeedbackform = function() {
  return {
    restrict: 'E',
    controller: DoodleVersionCtrl.CTRL_NG_INJECT,
    controllerAs: DoodleVersionCtrl.CTRL_AS,
    template: DoodleVersionCtrl.FEEDBACK_FORM_MARKUP
  };
};


/** @const {string} */
DoodleVersionCtrl.VERSION_MARKUP =
    '<span class="version-tag">' +
      '<abbr title="version">v.</abbr>' +
      '{{' + DoodleVersionCtrl.CTRL_AS + '.getVersionTag()}}' +
    '</span>';


/**
 * @return {!angular.Directive}
 * @ngInject
 */
DoodleVersionCtrl.buildVersionTag = function() {
  return {
    restrict: 'E',
    controller: DoodleVersionCtrl.CTRL_NG_INJECT,
    controllerAs: DoodleVersionCtrl.CTRL_AS,
    template: DoodleVersionCtrl.VERSION_MARKUP
  };
};


/**
 * @return {!angular.Directive}
 * @ngInject
 */
DoodleVersionCtrl.buildVersionTitle = function() {
  return {
    restrict: 'A',
    controller: DoodleVersionCtrl.CTRL_NG_INJECT,
    controllerAs: DoodleVersionCtrl.CTRL_AS,
    link: function postLink(scope, elem, attr, ctrl) {
      elem.text(ctrl.getAppUrl());
    }
  };
};


/** @return {string} */
DoodleVersionCtrl.prototype.getAppUrl = function() {
  return this.getMetaContent_(DoodleVersionCtrl.MetaContent.APPURL);
};


/** @return {string} */
DoodleVersionCtrl.prototype.getVersionTag = function() {
  return this.getMetaContent_(DoodleVersionCtrl.MetaContent.VERSION);
};


/** @return {string} */
DoodleVersionCtrl.prototype.buildFeedbackFormUrl = function() {
  return 'https://docs.google.com/forms/d/' +
         '1QqiJ-3_pSHRwNyG6ixrbUxtPitk979FsNiSduyL2pTw/viewform' +
         '?entry.640562798' +
         '&entry.571543210=' + this.getVersionTag()+
         '&entry.1164501193' +
         '&entry.1691384506' +
         '&entry.985751264';
};


/**
 * @param {DoodleVersionCtrl.MetaContent} metaName
 * @return {string}
 * @private
 */
DoodleVersionCtrl.prototype.getMetaContent_ = function(metaName) {
  if (!this.cachedMetaContent_[metaName]) {
    var querySelector = 'meta[name="' + metaName + '"]';

    var assertionError = '<meta name="' + metaName +
        '" ...>, tried querySelectorAll(' +
        querySelector + ')'

    var matchingMetaTagEls = this.document_[0].querySelectorAll(querySelector);
    if (!matchingMetaTagEls || !matchingMetaTagEls.length) {
      throw new Error('Not found: ' + assertionError);
    }

    var content = matchingMetaTagEls[0].getAttribute('content');
    if (!content) {
      throw new Error('Empty content attribute: ' + assertionError);
    }

    this.cachedMetaContent_[metaName] = content;
  }
  return this.cachedMetaContent_[metaName];
};


/** @return {string} */
DoodleVersionCtrl.prototype.buildFeedbackGithubUrl = function() {
  return this.getMetaContent_(DoodleVersionCtrl.MetaContent.FEEDBACK);
};


/** @type {!angular.Module} */
module.exports = angular.
    module(DoodleVersionCtrl.NAME_PREFIX_ + 'Module', []).
    directive(
        DoodleVersionCtrl.NAME_PREFIX_ + 'Tag',
        DoodleVersionCtrl.buildVersionTag).
    directive(
        DoodleVersionCtrl.NAME_PREFIX_ + 'Feedback',
        DoodleVersionCtrl.buildFeedbackform).
    directive(
        DoodleVersionCtrl.NAME_PREFIX_ + 'Title',
        DoodleVersionCtrl.buildVersionTitle);
