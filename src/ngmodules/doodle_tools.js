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


/**
 * Material Design Google Icons, open sourced, and copied from repo at:
 *     http://github.com/google/material-design-icons/tree/523913de6eb7584d
 *
 * See: google.github.io/material-design-icons/
 * @enum {string}
 */
DoodleToolsCtrl.SvgIconPath = {
  ANCHOR_GEAR_KOG:
      '<path d="M0 0h24v24h-24z" fill="none"/>' +
      '<path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65c-.03-.24-.24-.42-.49-.42h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zm-7.43 2.52c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>',
  UNDO_ARROW:
      '<path d="M0 0h24v24h-24z" fill="none"/>' +
      '<path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6l-3.6-3.6v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78c-1.39-4.19-5.32-7.22-9.97-7.22z"/>',
  REDO_ARROW:
      '<path d="M0 0h24v24h-24z" fill="none"/>' +
      '<path d="M18.4 10.6c-1.85-1.61-4.25-2.6-6.9-2.6-4.65 0-8.58 3.03-9.96 7.22l2.36.78c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88l-3.62 3.62h9v-9l-3.6 3.6z"/>',
  HISTORY_CLOCK:
      '<path d="M0 0h24v24h-24z" fill="none"/>' +
      '<path opacity=".9" d="M13 3c-4.97 0-9 4.03-9 9h-3l3.89 3.89.07.14 4.04-4.03h-3c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42c1.63 1.63 3.87 2.64 6.36 2.64 4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08v-4.25h-1.5z"/>',
  DOWNLOAD_TO_DISK:
      '<path d="M19 9h-4v-6h-6v6h-4l7 7 7-7zm-14 9v2h14v-2h-14z"/>' +
      '<path d="M0 0h24v24h-24z" fill="none"/>',
  DOWNLOAD:
      '<path d="M0 0h24v24h-24z" fill="none"/>' +
      '<path d="M17 3h-12c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-12l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10h-10v-4h10v4z"/>'
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
 * @param {DoodleToolsCtrl.SvgIconPath} iconPaths
 * @return {string}
 * @private
 */
DoodleToolsCtrl.buildSvg_ = function(iconPaths) {
  var squareDim = 20;
  var viewBoxDim = 22;
  return '<svg xmlns="http://www.w3.org/2000/svg" ' +
      '        width="' + squareDim + '" ' +
      '        height="' + squareDim + '" ' +
      '        viewBox="0 0 ' + viewBoxDim + ' ' + viewBoxDim + '">' +
         iconPaths +
      '</svg>';
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
         '>' +
         DoodleToolsCtrl.buildSvg_(DoodleToolsCtrl.SvgIconPath.ANCHOR_GEAR_KOG) +
         '</button>';
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

    '  <button class="save btn"' +
    '          ng-disabled="!' + DoodleToolsCtrl.CTRL_AS + '.hasDoodle()"' +
    '          ng-click="' + DoodleToolsCtrl.CTRL_AS + '.handleSave()">' +
         DoodleToolsCtrl.buildSvg_(DoodleToolsCtrl.SvgIconPath.DOWNLOAD) + '</button>' +

    '  <a class="download btn"' +
    '     ng-disabled="!' + DoodleToolsCtrl.CTRL_AS + '.hasDoodle()"' +
    '     ng-click="' + DoodleToolsCtrl.CTRL_AS + '.handleDownload($event)">' +
          DoodleToolsCtrl.buildSvg_(DoodleToolsCtrl.SvgIconPath.DOWNLOAD_TO_DISK) + '</a>' +

    '  <button class="history btn"' +
    '          ng-disabled="!' + DoodleToolsCtrl.CTRL_AS + '.hasComplexHistory()"' +
    '          ng-click="' + DoodleToolsCtrl.CTRL_AS + '.openHistoryPane()">' +
         DoodleToolsCtrl.buildSvg_(DoodleToolsCtrl.SvgIconPath.HISTORY_CLOCK) + '</button>' +

    '  <button class="clear btn"' +
    '          ng-disabled="!' + DoodleToolsCtrl.CTRL_AS + '.hasDoodle()"' +
    '          ng-click="' + DoodleToolsCtrl.CTRL_AS + '.handleClear()">clear</button>' +

    '  <button class="undo btn"' +
    '          ng-disabled="' + DoodleToolsCtrl.CTRL_AS + '.isUndoDisabled()"' +
    '          ng-click="' + DoodleToolsCtrl.CTRL_AS + '.handleUndo()">' +
         DoodleToolsCtrl.buildSvg_(DoodleToolsCtrl.SvgIconPath.UNDO_ARROW) + '</button>' +

    '  <button class="redo btn"' +
    '          ng-disabled="' + DoodleToolsCtrl.CTRL_AS + '.isRedoDisabled()"' +
    '          ng-click="' + DoodleToolsCtrl.CTRL_AS + '.handleRedo()">' +
         DoodleToolsCtrl.buildSvg_(DoodleToolsCtrl.SvgIconPath.REDO_ARROW) + '</button>' +

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
