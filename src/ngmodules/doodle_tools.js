'use strict';
var angular = require('../lib/angular');
var TouchSurface = require('../lib/touch_surface');
var doodleVersion = require('./doodle_version');
// TODO(productionize) use some module system
// -- require lib to deal with Promise APIs used in the raw here (Ecma6)
// -- require('...some lib...') for `angular.*` utils, and delete `angular` refs



/**
 * @param {!angular.Scope} $scope
 * @constructor
 * @ngInject
 */
var DoodleToolsCtrl = function DoodleToolsCtrl($scope) {
  /** @private {!angular.Scope} */
  this.scope_ = $scope;

  /** @private {!TouchSurface} */
  this.surface_ = null;

  /** @private {!angular.JQLite} */
  this.toolsJq_ = null;

  /** @private {!angular.JQLite} */
  this.anchorJq_ = null;

  /** @private {!angular.JQLite} */
  this.dashboardJq_ = null;

  /** @private {!angular.JQLite} */
  this.historyJq_ = null;

  /** @private {boolean} */
  this.isMacroHistory_ = DoodleToolsCtrl.DEFAULT_HISTORY_MACRO_SCALE;

  /** @private {DoodleToolsCtrl.ToolBox} */
  this.toolBoxMode_ = DoodleToolsCtrl.ToolBox.ANCHORED;

  /** @type {!Object.<string, function>} pre-bound functions on scope */
  this.scope_.filters = {
    historyScale: this.historyScaleFilter.bind(this)
  };
};


/** @const {string} */
DoodleToolsCtrl.DIRECTIVE_NAME = 'doodleTools';


/** @const {string} @private */
DoodleToolsCtrl.CTRL_AS = DoodleToolsCtrl.DIRECTIVE_NAME + 'Ctrl';


/** @const {boolean} whether branches of history are shown */
DoodleToolsCtrl.HISTORY_BRANCHES_VISIBLE = false;


/** @const {boolean} */
DoodleToolsCtrl.DEFAULT_HISTORY_MACRO_SCALE = true;


/** @const {string} */
DoodleToolsCtrl.BOTTOM_SCREEN_TOP_PERCENTAGE = '84%';


/** @enum {string} */
DoodleToolsCtrl.HtmlEntity = {
  ANCHOR_GEAR_KOG: '&#9881;',
  UNDO_ARROW: '&#8630;',
  REDO_ARROW: '&#8631;',
  HISTORY_CLOCK: '&#128336;',
  DOWNLOAD_TO_DISK: '&#8595;',
  DOWNLOAD: '&#128190;'
};


/** @enum {string} */
DoodleToolsCtrl.ToolBox = {
  ANCHORED: 'ANCHORED',
  DASHBOARD: 'DASHBOARD',
  HISTORY: 'HISTORY'
};


/** @enum {string} */
DoodleToolsCtrl.ContainerStyle = {
  POSITION: 'absolute',
  BACKGROUND_COLOR: 'rgba(255, 255, 235, 0.48)'
};


/**
 * @return {!angular.Directive}
 * @ngInject
 */
DoodleToolsCtrl.directiveBuilder = function() {
  return {
    replace: true,
    restrict: 'E',
    controller: ['$scope', DoodleToolsCtrl],
    controllerAs: DoodleToolsCtrl.CTRL_AS,
    template: DoodleToolsCtrl.DIRECTIVE_MARKUP,
    link: function postLink(scope, elem, attr, ctrl) {
      scope.$on(
          TouchSurface.Events.LOADED,
          ctrl.buildOnLoadedSurface.bind(ctrl, elem));
    }
  };
};


/**
 * Child directives, dependent on {@link DoodleToolsCtrl.directiveBuilder}.
 *
 * @const {!Object.<string, {
 *   NAME: string,
 *   builder: !angular.Directive
 * }}
 */
DoodleToolsCtrl.CHILDREN = {
  anchor: {
    NAME: DoodleToolsCtrl.DIRECTIVE_NAME + 'Anchor',

    /**
     * @return {!angular.Directive}
     * @ngInject
     */
    builder: function() {
      return {
        require: '^' + DoodleToolsCtrl.DIRECTIVE_NAME,
        restrict: 'A',
        link: function postLink(scope, elem, attr, ctrl) {
          ctrl.setAnchorEl(elem);
        }
      };
    }
  },

  dashboard: {
    NAME: DoodleToolsCtrl.DIRECTIVE_NAME + 'Dashboard',

    /**
     * @return {!angular.Directive}
     * @ngInject
     */
    builder: function() {
      return {
        require: '^' + DoodleToolsCtrl.DIRECTIVE_NAME,
        restrict: 'A',
        link: function postLink(scope, elem, attr, ctrl) {
          ctrl.setDashboardEl(elem);
        }
      };
    }
  },

  history: {
    NAME: DoodleToolsCtrl.DIRECTIVE_NAME + 'History',

    /**
     * @return {!angular.Directive}
     * @ngInject
     */
    builder: function() {
      return {
        require: '^' + DoodleToolsCtrl.DIRECTIVE_NAME,
        restrict: 'A',
        link: function postLink(scope, elem, attr, ctrl) {
          ctrl.setHistoryEl(elem);
        }
      };
    }
  }
};


/** @private github.com/angular/angular.js/blob/v1.3.8/src/Angular.js#L1447-L1453 */
DoodleToolsCtrl.ngCamToDash_ = function(name, opt_separator) {
  var SNAKE_CASE_REGEXP = /[A-Z]/g;
  var separator = opt_separator || '-';
  return name.replace(SNAKE_CASE_REGEXP, function(letter, pos) {
    return (pos ? separator : '') + letter.toLowerCase();
  });
};


/**
 * @param {string} title
 * @param {string} ngShowExpression
 * @param {string} ngClickExpression
 * @param {boolean=} opt_isConnected
 * @return {string}
 * @private
 */
DoodleToolsCtrl.buildAnchorButtonMarkup_ = function(
    title, ngShowExpression, ngClickExpression, opt_isConnected) {
  var connectionDirective = opt_isConnected  ?
      DoodleToolsCtrl.ngCamToDash_(DoodleToolsCtrl.CHILDREN.anchor.NAME) :
      '';
  return '<button class="anchor" ' + connectionDirective +
         '        ng-click="' + ngClickExpression + '"' +
         '        title="' + title + '"' +
         '        ng-show="' + ngShowExpression+ '"' +
         '>' + DoodleToolsCtrl.HtmlEntity.ANCHOR_GEAR_KOG + '</button>';
};


/**
 * @param {undefined|string} input
 * @param {string} alternative
 * @return {string}
 * @private
 */
DoodleToolsCtrl.ifDefOr_ = function(input, alternative) {
  return angular.isDefined(input) ? input : alternative;
};


/** @param {!angular.JQLite} anchorJq */
DoodleToolsCtrl.prototype.setAnchorEl = function(anchorJq) {
  this.anchorJq_ = anchorJq;
};


/** @param {!angular.JQLite} dashboardJq */
DoodleToolsCtrl.prototype.setDashboardEl = function(dashboardJq) {
  this.dashboardJq_ = dashboardJq;
};


/** @param {!angular.JQLite} historyJq */
DoodleToolsCtrl.prototype.setHistoryEl = function(historyJq) {
  this.historyJq_ = historyJq;
};


/**
 * @param {!angular.JQLite} elem
 * @param {!angular.Scope.Event} event
 * @param {!TouchSurface} surface
 */
DoodleToolsCtrl.prototype.buildOnLoadedSurface = function(elem, event, surface) {
  this.surface_ = surface;
  this.toolsJq_ = elem;

  var toolStyle = this.toolsJq_.eq(0)[0].style;
  toolStyle.position = DoodleToolsCtrl.ContainerStyle.POSITION;
  toolStyle.backgroundColor = DoodleToolsCtrl.ContainerStyle.BACKGROUND_COLOR;

  this.resizeToToolboxMode_();
  this.scope_.$on(
      TouchSurface.Events.RESIZE,
      this.resizeToToolboxMode_.bind(this));
};


/** @private */
DoodleToolsCtrl.prototype.resizeToToolboxMode_ = function() {
  var canvas = this.surface_.getCanvas();

  var toolStyle = this.toolsJq_.eq(0)[0].style;

  var top, left, width, height, borderRadius, targetToResize, margin;
  switch(this.toolBoxMode_) {
    case DoodleToolsCtrl.ToolBox.ANCHORED:
      targetToResize = this.anchorJq_;

      var largerEdge = canvas.width > canvas.height ?
          canvas.width : canvas.height;
      width = height = largerEdge * 0.20;
      top = DoodleToolsCtrl.BOTTOM_SCREEN_TOP_PERCENTAGE;
      left = DoodleToolsCtrl.BOTTOM_SCREEN_TOP_PERCENTAGE;
      borderRadius = '50%';
      break;

    case DoodleToolsCtrl.ToolBox.DASHBOARD:
      targetToResize = this.dashboardJq_;

      top = DoodleToolsCtrl.BOTTOM_SCREEN_TOP_PERCENTAGE;
      left = canvas.offsetLeft;
      width = canvas.width;
      height = canvas.height * 0.15;
      margin = '0 1ex';
      break;

    case DoodleToolsCtrl.ToolBox.HISTORY:
      targetToResize = this.historyJq_;

      top = canvas.offsetTop;
      left = canvas.offsetLeft;
      width = canvas.width * 0.3;
      height = canvas.height;
      break;
  }

  toolStyle.margin = DoodleToolsCtrl.ifDefOr_(margin, '');
  toolStyle.top = DoodleToolsCtrl.ifDefOr_(top, '');
  toolStyle.left = DoodleToolsCtrl.ifDefOr_(left, '');
  toolStyle.width = DoodleToolsCtrl.ifDefOr_(width, '');
  toolStyle.height = DoodleToolsCtrl.ifDefOr_(height, '');
  toolStyle.borderRadius = DoodleToolsCtrl.ifDefOr_(borderRadius, '');

  DoodleToolsCtrl.expandChildToFillContainer_(targetToResize);
};


/**
 * @param {!angular.JQLite} childJq
 * @private
 */
DoodleToolsCtrl.expandChildToFillContainer_ = function(childJq) {
  var childStyleDeclaration = childJq.eq(0)[0].style;
  childStyleDeclaration.width = '100%';
  childStyleDeclaration.height = '100%';
  childStyleDeclaration.position = 'relative';
};


/** @return {boolean} */
DoodleToolsCtrl.prototype.isLoaded = function() {
  return Boolean(this.surface_ && this.toolsJq_);
};


/** @return {boolean} */
DoodleToolsCtrl.prototype.hasDoodle = function() {
  return this.isLoaded() && this.surface_.isDirty();
};


/** @return {boolean} */
DoodleToolsCtrl.prototype.hasComplexHistory = function() {
  return (this.isLoaded() && !this.surface_.contextHistory.isEmpty()) && (
      this.surface_.contextHistory.hasHistoricalBranches() ||
      this.surface_.contextHistory.hasHistoricalPauses()
  );
};


/** @private */
DoodleToolsCtrl.prototype.setToolStyles_ = function() {
  var style = {};
  return styles;
};


/** @return {boolean} */
DoodleToolsCtrl.prototype.isToolboxAnchored = function() {
  return this.toolBoxMode_ == DoodleToolsCtrl.ToolBox.ANCHORED;
};


/** @return {boolean} */
DoodleToolsCtrl.prototype.isDashboardOpen = function() {
  return this.toolBoxMode_ == DoodleToolsCtrl.ToolBox.DASHBOARD;
};


/** @return {boolean} */
DoodleToolsCtrl.prototype.isHistoryPaneOpen = function() {
  return this.toolBoxMode_ == DoodleToolsCtrl.ToolBox.HISTORY;
};


/**
 * @param {DoodleToolsCtrl.ToolBox} mode
 * @private
 */
DoodleToolsCtrl.prototype.updateToolboxMode_ = function(mode) {
  this.toolBoxMode_ = mode;
  this.resizeToToolboxMode_();
};


/** Closes dashboard and history pane to maximize canvas space. */
DoodleToolsCtrl.prototype.anchorToolbox = function() {
  this.updateToolboxMode_(DoodleToolsCtrl.ToolBox.ANCHORED);
};


/** Opens a dashboard of tools to control canvas history and behavior */
DoodleToolsCtrl.prototype.openDashboard = function() {
  this.updateToolboxMode_(DoodleToolsCtrl.ToolBox.DASHBOARD);
};


/** Opens a filmstrip list showing an interactive history tree. */
DoodleToolsCtrl.prototype.openHistoryPane = function() {
  throw new Error('TODO implement! This codepath is not thought through..');
  this.updateToolboxMode_(DoodleToolsCtrl.ToolBox.HISTORY);
};


/** @see {@link TouchSurface#undo} */
DoodleToolsCtrl.prototype.handleUndo = function() {
  this.surface_.undo();
};


/** @return {boolean} */
DoodleToolsCtrl.prototype.isUndoDisabled = function() {
  return !this.surface_.contextHistory.isUndoPossible();
};


/** @see {@link TouchSurface#clear} */
DoodleToolsCtrl.prototype.handleClear = function() {
  this.surface_.clear();
};


/** @see {@link TouchSurface#redo} */
DoodleToolsCtrl.prototype.handleRedo = function() {
  this.surface_.redo();
};


/** @return {boolean} */
DoodleToolsCtrl.prototype.isRedoDisabled = function() {
  return !this.surface_.contextHistory.isRedoPossible();
};


/** Saves current history to local app storage. */
DoodleToolsCtrl.prototype.handleSave = function() {
  throw new Error('implement localStorage/3rd-party API/etc. storage!');
};


/** @param {!angular.Scope.Event} event */
DoodleToolsCtrl.prototype.handleDownload = function(event) {
  if (!this.hasDoodle()) {
    return;
  }
  // Temporarily set a white background
  this.surface_.clear(true  /*opt_offTheRecord*/);

  var canvas = this.surface_.getCanvas();
  var context = this.surface_.getContext();

  context.fillStyle = this.surface_.getBackgroundColorSetting();
  context.fillRect(0, 0, canvas.width, canvas.height);
  this.surface_.redraw(true  /*opt_retainCurrentSurface*/);

  var doodleStamp = this.surface_.contextHistory.getTimeStamp();
  var downloadAs = 'doodle_' + doodleStamp + '_saved:' +
      (Date.now() - doodleStamp) + 'ms.png';

  // Trigger download, given whitebackground
  event.target.setAttribute('download', downloadAs);
  event.target.setAttribute('href', canvas.toDataURL());

  // redraw surface as we found it
  this.surface_.redraw();
};


/** @return {boolean} */
DoodleToolsCtrl.prototype.getHistory = function() {
  return this.surface_.contextHistory;
};


/**
 * @return {boolean}
 *     Whether presentation format uses {@link ContextHistory#isPrePauseUpdate}.
 */
DoodleToolsCtrl.prototype.isHistoryScaleMacro = function() {
  return this.isMacroHistory_;
};


/**
 * Filters according to {@link #isHistoryScaleMacro}.
 *
 * @param {!RenderUpdate} pane
 * @param {number} index
 * @return {boolean}
 */
DoodleToolsCtrl.prototype.historyScaleFilter = function(pane, index) {
  return this.isHistoryScaleMacro() ?
       this.getHistory.isPrePauseUpdate(pane) :
       true;  // default to not filtering
};


/**
 * @param {!ContextHistory.Update} pane
 * @return {!Object.<string, boolean>}
 */
DoodleToolsCtrl.prototype.buildHistoryPaneStyles = function(pane) {
  var styles = {};
  return styles;
};


/** @return {!Array.<!ContextHistory.Update>} */
DoodleToolsCtrl.prototype.getHistoryPanes = function() {
  if (!this.isLoaded()) {
    return [];
  }

  throw new Error('implement! return this.getHistory().someNewApi()');
};


/** @const {string} */
DoodleToolsCtrl.DIRECTIVE_MARKUP =
    '<div class="' + DoodleToolsCtrl.ngCamToDash_(DoodleToolsCtrl.DIRECTIVE_NAME) + '"' +
    '     ng-show="' + DoodleToolsCtrl.CTRL_AS + '.isLoaded()">' +

      DoodleToolsCtrl.buildAnchorButtonMarkup_(
          'Open Toolbar',
          DoodleToolsCtrl.CTRL_AS + '.isToolboxAnchored()',
          DoodleToolsCtrl.CTRL_AS + '.openDashboard()',
          true   /*opt_isConnected*/) +

    '<div class="dashboard" ' +
        DoodleToolsCtrl.ngCamToDash_(DoodleToolsCtrl.CHILDREN.dashboard.NAME) +
    '     ng-show="' + DoodleToolsCtrl.CTRL_AS + '.isDashboardOpen()">' +

    '  <button class="save"' +
    '          ng-disabled="!' + DoodleToolsCtrl.CTRL_AS + '.hasDoodle()"' +
    '          ng-click="' + DoodleToolsCtrl.CTRL_AS + '.handleSave()">' +
         DoodleToolsCtrl.HtmlEntity.DOWNLOAD + '</button>' +

    '  <a class="download"' +
    '     ng-disabled="!' + DoodleToolsCtrl.CTRL_AS + '.hasDoodle()"' +
    '     ng-click="' + DoodleToolsCtrl.CTRL_AS + '.handleDownload($event)">' +
          DoodleToolsCtrl.HtmlEntity.DOWNLOAD_TO_DISK + '</a>' +

    '  <button class="history"' +
    '          ng-disabled="!' + DoodleToolsCtrl.CTRL_AS + '.hasComplexHistory()"' +
    '          ng-click="' + DoodleToolsCtrl.CTRL_AS + '.openHistoryPane()">' +
         DoodleToolsCtrl.HtmlEntity.HISTORY_CLOCK + '</button>' +

    '  <button class="clear"' +
    '          ng-disabled="!' + DoodleToolsCtrl.CTRL_AS + '.hasDoodle()"' +
    '          ng-click="' + DoodleToolsCtrl.CTRL_AS + '.handleClear()">clear</button>' +

    '  <button class="undo"' +
    '          ng-disabled="' + DoodleToolsCtrl.CTRL_AS + '.isUndoDisabled()"' +
    '          ng-click="' + DoodleToolsCtrl.CTRL_AS + '.handleUndo()">' +
         DoodleToolsCtrl.HtmlEntity.UNDO_ARROW + '</button>' +

    '  <button class="redo"' +
    '          ng-disabled="' + DoodleToolsCtrl.CTRL_AS + '.isRedoDisabled()"' +
    '          ng-click="' + DoodleToolsCtrl.CTRL_AS + '.handleRedo()">' +
         DoodleToolsCtrl.HtmlEntity.REDO_ARROW + '</button>' +

      DoodleToolsCtrl.buildAnchorButtonMarkup_(
          'Close Toolbar',
          DoodleToolsCtrl.CTRL_AS + '.isDashboardOpen()',
          DoodleToolsCtrl.CTRL_AS + '.anchorToolbox()') +

    '  <div class="help-info">' +
    '    <doodle-version-tag></doodle-version-tag>' +
    '    <doodle-version-feedback></doodle-version-feedback>' +
    '  </div>' +

    '</div>' +  // dashboard


/* TODO finish this
        DoodleToolsCtrl.ngCamToDash_(DoodleToolsCtrl.CHILDREN.history.NAME) +
    '     ng-show="' + DoodleToolsCtrl.CTRL_AS + '.isHistoryPaneOpen()">' +

    // full-context view of chapters, and branches
    '  <div class="timeline">' +
    '    <span class="moment"' +
    '          ng-repeat="' +
    'moment in ' + DoodleToolsCtrl.CTRL_AS + '.getHistory().getPrePauseHistory() | ' +
                              'filter:historyScaleFilter ">' +
    '      <pre>{{ moment | json }}</pre>' +
    '    </span>' +
    '  </div>' +

    // scrolling thumbnails showing previews of major chapters
    '  <div class="chapter"' +
    '       ng-class="' + DoodleToolsCtrl.CTRL_AS + '.buildHistoryPaneStyles(pane)"' +
    '       ng-repeat="pane in ' + DoodleToolsCtrl.CTRL_AS + '.getHistoryPanes()">' +
    '    {{$index}}: <pre>{{pane | json}}</pre>' +
    '  </div>' +

    '</div>' +  // history
*/

    '</div>';


/** @type {!angular.Module} */
module.exports = angular.
    module('doodleToolsModule', [
      doodleVersion.name
    ]).
    directive(
        DoodleToolsCtrl.DIRECTIVE_NAME,
        [DoodleToolsCtrl.directiveBuilder]);


// HACK: define every child directive on the above exported module:
angular.forEach(DoodleToolsCtrl.CHILDREN, function(childDirective) {
  module.exports.directive(childDirective.NAME, childDirective.builder);
});
