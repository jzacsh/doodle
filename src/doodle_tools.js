'use strict';
var TouchSurface = require('./lib/touch_surface')
// TODO(productionize) use some module system
// -- require lib to deal with Promise APIs used in the raw here (Ecma6)
// -- require('...some lib...') for `angular.*` utils, and delete `angular` refs

module.exports = (function() {


var doodleTools = {directive: {}};


/** @const {string} */
doodleTools.directive.NAME = 'doodleTools';


/** @const {string} @private */
var ctrlAs_ = doodleTools.directive.NAME + 'Ctrl';


/** @private github.com/angular/angular.js/blob/v1.3.8/src/Angular.js#L1447-L1453 */
var angularCoreCamelToDash_ = function(name, opt_separator) {
  var SNAKE_CASE_REGEXP = /[A-Z]/g;
  var separator = opt_separator || '-';
  return name.replace(SNAKE_CASE_REGEXP, function(letter, pos) {
    return (pos ? separator : '') + letter.toLowerCase();
  });
};


doodleTools.directive.children = {
  anchor: {
    NAME: doodleTools.directive.NAME + 'Anchor',
    
    /**
     * @return {!angular.Directive}
     * @ngInject
     */
    builder: function() {
      return {
        require: '^' + doodleTools.directive.NAME,
        restrict: 'A',
        link: function postLink(scope, elem, attr, ctrl) {
          ctrl.setAnchorEl(elem);
        }
      };
    }
  },

  dashboard: {
    NAME: doodleTools.directive.NAME + 'Dashboard',
    
    /**
     * @return {!angular.Directive}
     * @ngInject
     */
    builder: function() {
      return {
        require: '^' + doodleTools.directive.NAME,
        restrict: 'A',
        link: function postLink(scope, elem, attr, ctrl) {
          ctrl.setDashboardEl(elem);
        }
      };
    }
  },

  history: {
    NAME: doodleTools.directive.NAME + 'History',
    
    /**
     * @return {!angular.Directive}
     * @ngInject
     */
    builder: function() {
      return {
        require: '^' + doodleTools.directive.NAME,
        restrict: 'A',
        link: function postLink(scope, elem, attr, ctrl) {
          ctrl.setHistoryEl(elem);
        }
      };
    }
  }
};


/**
 * @return {!angular.Directive}
 * @ngInject
 */
doodleTools.directive.builder = function() {
  return {
    replace: true,
    restrict: 'E',
    controller: [
      '$scope',
      'VERSION_SHORT_URL',
      doodleTools.directive.Controller
    ],
    controllerAs: ctrlAs_,
    template: doodleTools.directive.MARKUP,
    link: function postLink(scope, elem, attr, ctrl) {
      scope.$on(
          TouchSurface.Events.LOADED,
          ctrl.buildOnLoadedSurface.bind(ctrl, elem));
    }
  };
};


/**
 * @param {!angular.Scope} $scope
 * @param {string} VERSION_SHORT_URL
 * @constructor
 * @ngInject
 */
doodleTools.directive.Controller = function($scope, VERSION_SHORT_URL) {
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
  this.isMacroHistory_ = Controller.DEFAULT_HISTORY_MACRO_SCALE;

  /** @private {Controller.ToolBox} */
  this.toolBoxMode_ = Controller.ToolBox.ANCHORED;

  /** @private {string} */
  this.versionUrl_ = VERSION_SHORT_URL;

  /** @type {!Object.<string, function>} pre-bound functions on scope */
  this.scope_.filters = {
    historyScale: this.historyScaleFilter.bind(this)
  };
};
var Controller = doodleTools.directive.Controller;


/** @const {boolean} whether branches of history are shown */
Controller.HISTORY_BRANCHES_VISIBLE = false;


/** @const {boolean} */
Controller.DEFAULT_HISTORY_MACRO_SCALE = true;


/** @const {string} */
Controller.BOTTOM_SCREEN_TOP_PERCENTAGE = '84%';


/** @const {string} */
Controller.HtmlEntity = {
  ANCHOR_GEAR_KOG: '&#9881;',
  UNDO_ARROW: '&#8630;',
  REDO_ARROW: '&#8631;',
  HISTORY_CLOCK: '&#128336;',
  DOWNLOAD_TO_DISK: '&#8595;',
  DOWNLOAD: '&#128190;'
};


/** @enum {string} */
Controller.ToolBox = {
  ANCHORED: 'ANCHORED',
  DASHBOARD: 'DASHBOARD',
  HISTORY: 'HISTORY'
};


/** @enum {string} */
Controller.ContainerStyle = {
  POSITION: 'absolute',
  BACKGROUND_COLOR: 'rgba(255, 255, 235, 0.48)'
};


/**
 * @param {undefined|string} input
 * @param {string} alternative
 * @return {string}
 * @private
 */
Controller.ifDefOr_ = function(input, alternative) {
  return angular.isDefined(input) ? input : alternative;
};


/** @return {string} */
Controller.prototype.getVersionUrl = function() {
  return this.versionUrl_;
};


/** @param {!angular.JQLite} anchorJq */
Controller.prototype.setAnchorEl = function(anchorJq) {
  this.anchorJq_ = anchorJq;
};


/** @param {!angular.JQLite} dashboardJq */
Controller.prototype.setDashboardEl = function(dashboardJq) {
  this.dashboardJq_ = dashboardJq;
};


/** @param {!angular.JQLite} historyJq */
Controller.prototype.setHistoryEl = function(historyJq) {
  this.historyJq_ = historyJq;
};


/**
 * @param {!angular.JQLite} elem
 * @param {!angular.Scope.Event} event
 * @param {!TouchSurface} surface
 */
Controller.prototype.buildOnLoadedSurface = function(elem, event, surface) {
  this.surface_ = surface;
  this.toolsJq_ = elem;

  var toolStyle = this.toolsJq_.eq(0)[0].style;
  toolStyle.position = Controller.ContainerStyle.POSITION;
  toolStyle.backgroundColor = Controller.ContainerStyle.BACKGROUND_COLOR;

  this.resizeToToolboxMode_();
  this.scope_.$on(
      TouchSurface.Events.RESIZE,
      this.resizeToToolboxMode_.bind(this));
};


/** @private */
Controller.prototype.resizeToToolboxMode_ = function() {
  var canvas = this.surface_.getCanvas();

  var toolStyle = this.toolsJq_.eq(0)[0].style;

  var top, left, width, height, borderRadius, targetToResize, margin;
  switch(this.toolBoxMode_) {
    case Controller.ToolBox.ANCHORED:
      targetToResize = this.anchorJq_;

      var largerEdge = canvas.width > canvas.height ?
          canvas.width : canvas.height;
      width = height = largerEdge * 0.20;
      top = Controller.BOTTOM_SCREEN_TOP_PERCENTAGE;
      left = Controller.BOTTOM_SCREEN_TOP_PERCENTAGE;
      borderRadius = '50%';
      break;

    case Controller.ToolBox.DASHBOARD:
      targetToResize = this.dashboardJq_;

      top = Controller.BOTTOM_SCREEN_TOP_PERCENTAGE;
      left = canvas.offsetLeft;
      width = canvas.width;
      height = canvas.height * 0.15;
      margin = '0 1ex';
      break;

    case Controller.ToolBox.HISTORY:
      targetToResize = this.historyJq_;

      top = canvas.offsetTop;
      left = canvas.offsetLeft;
      width = canvas.width * 0.3;
      height = canvas.height;
      break;
  }

  toolStyle.margin = Controller.ifDefOr_(margin, '');
  toolStyle.top = Controller.ifDefOr_(top, '');
  toolStyle.left = Controller.ifDefOr_(left, '');
  toolStyle.width = Controller.ifDefOr_(width, '');
  toolStyle.height = Controller.ifDefOr_(height, '');
  toolStyle.borderRadius = Controller.ifDefOr_(borderRadius, '');

  Controller.expandChildToFillContainer_(targetToResize);
};


/**
 * @param {!angular.JQLite} childJq
 * @private
 */
Controller.expandChildToFillContainer_ = function(childJq) {
  var childStyleDeclaration = childJq.eq(0)[0].style;
  childStyleDeclaration.width = '100%';
  childStyleDeclaration.height = '100%';
  childStyleDeclaration.position = 'relative';
};


/** @return {boolean} */
Controller.prototype.isLoaded = function() {
  return Boolean(this.surface_ && this.toolsJq_);
};


/** @return {boolean} */
Controller.prototype.hasDoodle = function() {
  return this.isLoaded() && this.surface_.isDirty();
};


/** @return {boolean} */
Controller.prototype.hasComplexHistory = function() {
  return (this.isLoaded() && !this.surface_.contextHistory.isEmpty()) && (
      this.surface_.contextHistory.hasHistoricalBranches() ||
      this.surface_.contextHistory.hasHistoricalPauses()
  );
};


/** @private */
Controller.prototype.setToolStyles_ = function() {
  var style = {};
  return styles;
};


/** @return {boolean} */
Controller.prototype.isToolboxAnchored = function() {
  return this.toolBoxMode_ == Controller.ToolBox.ANCHORED;
};


/** @return {boolean} */
Controller.prototype.isDashboardOpen = function() {
  return this.toolBoxMode_ == Controller.ToolBox.DASHBOARD;
};


/** @return {boolean} */
Controller.prototype.isHistoryPaneOpen = function() {
  return this.toolBoxMode_ == Controller.ToolBox.HISTORY;
};


/**
 * @param {Controller.ToolBox} mode
 * @private
 */
Controller.prototype.updateToolboxMode_ = function(mode) {
  this.toolBoxMode_ = mode;
  this.resizeToToolboxMode_();
};


/** Closes dashboard and history pane to maximize canvas space. */
Controller.prototype.anchorToolbox = function() {
  this.updateToolboxMode_(Controller.ToolBox.ANCHORED);
};


/** Opens a dashboard of tools to control canvas history and behavior */
Controller.prototype.openDashboard = function() {
  this.updateToolboxMode_(Controller.ToolBox.DASHBOARD);
};


/** Opens a filmstrip list showing an interactive history tree. */
Controller.prototype.openHistoryPane = function() {
  throw new Error('TODO implement! This codepath is not thought through..');
  this.updateToolboxMode_(Controller.ToolBox.HISTORY);
};


/** @see {@link TouchSurface#undo} */
Controller.prototype.handleUndo = function() {
  this.surface_.undo();
};


/** @return {boolean} */
Controller.prototype.isUndoDisabled = function() {
  return !this.surface_.contextHistory.isUndoPossible();
};


/** @see {@link TouchSurface#clear} */
Controller.prototype.handleClear = function() {
  this.surface_.clear();
};


/** @see {@link TouchSurface#redo} */
Controller.prototype.handleRedo = function() {
  this.surface_.redo();
};


/** @return {boolean} */
Controller.prototype.isRedoDisabled = function() {
  return !this.surface_.contextHistory.isRedoPossible();
};


/** Saves current history to local app storage. */
Controller.prototype.handleSave = function() {
  throw new Error('implement localStorage/3rd-party API/etc. storage!');
};


/** @param {!angular.Scope.Event} event */
Controller.prototype.handleDownload = function(event) {
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
Controller.prototype.getHistory = function() {
  return this.surface_.contextHistory;
};


/**
 * @return {boolean}
 *     Whether presentation format uses {@link ContextHistory#isPrePauseUpdate}.
 */
Controller.prototype.isHistoryScaleMacro = function() {
  return this.isMacroHistory_;
};


/**
 * Filters according to {@link #isHistoryScaleMacro}.
 *
 * @param {!RenderUpdate} pane
 * @param {number} index
 * @return {boolean}
 */
Controller.prototype.historyScaleFilter = function(pane, index) {
  return this.isHistoryScaleMacro() ?
       this.getHistory.isPrePauseUpdate(pane) :
       true;  // default to not filtering
};


/**
 * @param {!ContextHistory.Update} pane
 * @return {!Object.<string, boolean>}
 */
Controller.prototype.buildHistoryPaneStyles = function(pane) {
  var styles = {};
  return styles;
};


/** @return {!Array.<!ContextHistory.Update>} */
Controller.prototype.getHistoryPanes = function() {
  if (!this.isLoaded()) {
    return [];
  }

  throw new Error('implement! return this.getHistory().someNewApi()');
};


/**
 * @param {string} title
 * @param {string} ngShowExpression
 * @param {string} ngClickExpression
 * @param {boolean=} opt_isConnected
 * @return {string}
 * @private
 */
Controller.buildAnchorButtonMarkup_ = function(
    title, ngShowExpression, ngClickExpression, opt_isConnected) {
  var connectionDirective = opt_isConnected  ?
      angularCoreCamelToDash_(doodleTools.directive.children.anchor.NAME) :
      '';
  return '<button class="anchor" ' + connectionDirective +
    '      ng-click="' + ngClickExpression + '"' +
    '      title="' + title + '"' +
    '      ng-show="' + ngShowExpression+ '">' +
      Controller.HtmlEntity.ANCHOR_GEAR_KOG + '</button>';
};


/** @const {string} */
doodleTools.directive.MARKUP =
    '<div class="' + angularCoreCamelToDash_(doodleTools.directive.NAME) + '"' +
    '     ng-show="' + ctrlAs_ + '.isLoaded()">' +

    Controller.buildAnchorButtonMarkup_(
        'Open Toolbar',
        ctrlAs_ + '.isToolboxAnchored()',
        ctrlAs_ + '.openDashboard()',
        true   /*isConnected*/) +

    '<div class="dashboard" ' +
        angularCoreCamelToDash_(doodleTools.directive.children.dashboard.NAME) +
    '     ng-show="' + ctrlAs_ + '.isDashboardOpen()">' +

    '  <a class="version-url" ' +
    '     ng-href="//{{' + ctrlAs_ + '.getVersionUrl()}}">' +
    '    {{' + ctrlAs_ + '.getVersionUrl()}}</a>' +

    '  <button class="save"' +
    '          ng-disabled="!' + ctrlAs_ + '.hasDoodle()"' +
    '          ng-click="' + ctrlAs_ + '.handleSave()">' +
         Controller.HtmlEntity.DOWNLOAD + '</button>' +

    '  <a class="download"' +
    '     ng-disabled="!' + ctrlAs_ + '.hasDoodle()"' +
    '     ng-click="' + ctrlAs_ + '.handleDownload($event)">' +
          Controller.HtmlEntity.DOWNLOAD_TO_DISK + '</a>' +

    '  <button class="history"' +
    '          ng-disabled="!' + ctrlAs_ + '.hasComplexHistory()"' +
    '          ng-click="' + ctrlAs_ + '.openHistoryPane()">' +
         Controller.HtmlEntity.HISTORY_CLOCK + '</button>' +

    '  <button class="clear"' +
    '          ng-disabled="!' + ctrlAs_ + '.hasDoodle()"' +
    '          ng-click="' + ctrlAs_ + '.handleClear()">clear</button>' +

    '  <button class="undo"' +
    '          ng-disabled="' + ctrlAs_ + '.isUndoDisabled()"' +
    '          ng-click="' + ctrlAs_ + '.handleUndo()">' +
         Controller.HtmlEntity.UNDO_ARROW + '</button>' +

    '  <button class="redo"' +
    '          ng-disabled="' + ctrlAs_ + '.isRedoDisabled()"' +
    '          ng-click="' + ctrlAs_ + '.handleRedo()">' +
         Controller.HtmlEntity.REDO_ARROW + '</button>' +

    Controller.buildAnchorButtonMarkup_(
        'Close Toolbar',
        ctrlAs_ + '.isDashboardOpen()',
        ctrlAs_ + '.anchorToolbox()') +

    '</div>' +  // dashboard

/* TODO finish this
        angularCoreCamelToDash_(doodleTools.directive.children.history.NAME) +
    '     ng-show="' + ctrlAs_ + '.isHistoryPaneOpen()">' +

    // full-context view of chapters, and branches
    '  <div class="timeline">' +
    '    <span class="moment"' +
    '          ng-repeat="' +
    'moment in ' + ctrlAs_ + '.getHistory().getPrePauseHistory() | ' +
                              'filter:historyScaleFilter ">' +
    '      <pre>{{ moment | json }}</pre>' +
    '    </span>' +
    '  </div>' +

    // scrolling thumbnails showing previews of major chapters
    '  <div class="chapter"' +
    '       ng-class="' + ctrlAs_ + '.buildHistoryPaneStyles(pane)"' +
    '       ng-repeat="pane in ' + ctrlAs_ + '.getHistoryPanes()">' +
    '    {{$index}}: <pre>{{pane | json}}</pre>' +
    '  </div>' +

    '</div>' +  // history
*/

    '</div>';


return doodleTools;
})();
