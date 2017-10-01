import * as $ from 'jquery'  
import * as _ from 'lodash'
import { Utils } from './Util';
import { IGridStackDragDropPlugin } from './IGridStackDragDropPlugin';
import { GridStackDragDropPlugin } from './GridStackDragDropPlugin';
import { GridStackEngine } from './GridStackEngine';

/**
  * gridstack.js 1.0.0-dev
  * http://troolee.github.io/gridstack.js/
  * (c) 2014-2017 Pavel Reznikov, Dylan Weiss
  * gridstack.js may be freely distributed under the MIT license.
  * @preserve
*/

export class GridStack {

  static registeredPlugins = [];
  dd: any;
  opts: any;
  grid: any;
  container: any;
  placeholder: any;
  _styles: any;
  onResizeHandler: any;
  _updateHeightsOnResize: any;
  _stylesId: any;

  constructor(el, opts) {
    var self = this;
    var oneColumnMode, isAutoCellHeight;

    opts = opts || {};

    this.container = $(el);


    opts.itemClass = opts.itemClass || 'grid-stack-item';
    var isNested = this.container.closest('.' + opts.itemClass).length > 0;

    this.opts = _.defaults(opts || {}, {
      width: parseInt(this.container.attr('data-gs-width')) || 12,
      height: parseInt(this.container.attr('data-gs-height')) || 0,
      itemClass: 'grid-stack-item',
      placeholderClass: 'grid-stack-placeholder',
      placeholderText: '',
      handle: '.grid-stack-item-content',
      handleClass: null,
      cellHeight: 60,
      verticalMargin: 20,
      auto: true,
      minWidth: 768,
      float: false,
      staticGrid: false,
      _class: 'grid-stack-instance-' + (Math.random() * 10000).toFixed(0),
      animate: Boolean(this.container.attr('data-gs-animate')) || false,
      alwaysShowResizeHandle: opts.alwaysShowResizeHandle || false,
      resizable: _.defaults(opts.resizable || {}, {
        autoHide: !(opts.alwaysShowResizeHandle || false),
        handles: 'se'
      }),
      draggable: _.defaults(opts.draggable || {}, {
        handle: (opts.handleClass ? '.' + opts.handleClass : (opts.handle ? opts.handle : '')) ||
        '.grid-stack-item-content',
        scroll: false,
        appendTo: 'body'
      }),
      disableDrag: opts.disableDrag || false,
      disableResize: opts.disableResize || false,
      rtl: 'auto',
      removable: false,
      removableOptions: _.defaults(opts.removableOptions || {}, {
        accept: '.' + opts.itemClass
      }),
      removeTimeout: 2000,
      verticalMarginUnit: 'px',
      cellHeightUnit: 'px',
      disableOneColumnMode: opts.disableOneColumnMode || false,
      oneColumnModeClass: opts.oneColumnModeClass || 'grid-stack-one-column-mode',
      ddPlugin: null
    });

    if (this.opts.ddPlugin === false) {
      this.opts.ddPlugin = new GridStackDragDropPlugin();
    } else if (this.opts.ddPlugin === null) {
      this.opts.ddPlugin = _.first(GridStack.registeredPlugins) || new GridStackDragDropPlugin();
    }

    this.opts.ddPlugin.grid = this;
    this.dd = this.opts.ddPlugin;

    if (this.opts.rtl === 'auto') {
      this.opts.rtl = this.container.css('direction') === 'rtl';
    }

    if (this.opts.rtl) {
      this.container.addClass('grid-stack-rtl');
    }

    this.opts.isNested = isNested;

    isAutoCellHeight = this.opts.cellHeight === 'auto';
    if (isAutoCellHeight) {
      self.cellHeight(self.cellWidth(), true);
    } else {
      this.cellHeight(this.opts.cellHeight, true);
    }
    this.verticalMargin(this.opts.verticalMargin, true);

    this.container.addClass(this.opts._class);

    this._setStaticClass();

    if (isNested) {
      this.container.addClass('grid-stack-nested');
    }

    this._initStyles();

    this.grid = new GridStackEngine(this.opts.width, function (nodes, detachNode) {
      detachNode = typeof detachNode === 'undefined' ? true : detachNode;
      var maxHeight = 0;
      _.each(nodes, (n: any)=> {
        if (detachNode && n._id === null) {
          if (n.el) {
            n.el.remove();
          }
        } else {
          n.el
            .attr('data-gs-x', n.x)
            .attr('data-gs-y', n.y)
            .attr('data-gs-width', n.width)
            .attr('data-gs-height', n.height);
          maxHeight = Math.max(maxHeight, n.y + n.height);
        }
      });
      self._updateStyles(maxHeight + 10);
    }, this.opts.float, this.opts.height, undefined);

    if (this.opts.auto) {
      var elements = [];
      var _this = this;
      this.container.children('.' + this.opts.itemClass + ':not(.' + this.opts.placeholderClass + ')')
        .each((index, el)=> {
          el = $(el);
          elements.push({
            el: el,
            i: parseInt(el.attr('data-gs-x')) + parseInt(el.attr('data-gs-y')) * _this.opts.width
          });
        });
      _.chain(elements).sortBy( (x)=> { return x.i; }).each((i)=> {
        self._prepareElement(i.el, undefined);
      }).value();
    }

    this.setAnimation(this.opts.animate);

    this.placeholder = $(
      '<div class="' + this.opts.placeholderClass + ' ' + this.opts.itemClass + '">' +
      '<div class="placeholder-content">' + this.opts.placeholderText + '</div></div>').hide();

    this._updateContainerHeight();

    this._updateHeightsOnResize = _.throttle(function () {
      self.cellHeight(self.cellWidth(), false);
    }, 100);

    this.onResizeHandler = this.onResizeHandlerFunction(self, isAutoCellHeight);
    $(window).resize(this.onResizeHandler);
    this.onResizeHandler();

    if (!self.opts.staticGrid && typeof self.opts.removable === 'string') {
      var trashZone = $(self.opts.removable);
      if (!this.dd.isDroppable(trashZone)) {
        this.dd.droppable(trashZone, self.opts.removableOptions);
      }
      this.dd
        .on(trashZone, 'dropover', function (event, ui) {
          var el = $(ui.draggable);
          var node = el.data('_gridstack_node');
          if (node._grid !== self) {
            return;
          }
          el.data('inTrashZone', true);
          self._setupRemovingTimeout(el);
        })
        .on(trashZone, 'dropout', function (event, ui) {
          var el = $(ui.draggable);
          var node = el.data('_gridstack_node');
          if (node._grid !== self) {
            return;
          }
          el.data('inTrashZone', false);
          self._clearRemovingTimeout(el);
        });
    }

    if (!self.opts.staticGrid && self.opts.acceptWidgets) {
      var draggingElement = null;

      var onDrag = function (event, ui) {
        var el = draggingElement;
        var node = el.data('_gridstack_node');
        var pos = self.getCellFromPixel({ left: event.pageX, top: event.pageY }, true);
        var x = Math.max(0, pos.x);
        var y = Math.max(0, pos.y);
        if (!node._added) {
          node._added = true;

          node.el = el;
          node.autoPosition = true;
          node.x = x;
          node.y = y;
          self.grid.cleanNodes();
          self.grid.beginUpdate(node);
          self.grid.addNode(node);

          self.container.append(self.placeholder);
          self.placeholder
            .attr('data-gs-x', node.x)
            .attr('data-gs-y', node.y)
            .attr('data-gs-width', node.width)
            .attr('data-gs-height', node.height)
            .show();
          node.el = self.placeholder;
          node._beforeDragX = node.x;
          node._beforeDragY = node.y;

          self._updateContainerHeight();
        }
        if (!self.grid.canMoveNode(node, x, y)) {
          return;
        }
        self.grid.moveNode(node, x, y);
        self._updateContainerHeight();
      };

      this.dd
        .droppable(self.container, {
          accept: function (el) {
            el = $(el);
            var node = el.data('_gridstack_node');
            if (node && node._grid === self) {
              return false;
            }
            return el.is(self.opts.acceptWidgets === true ? '.grid-stack-item' : self.opts.acceptWidgets);
          }
        })
        .on(self.container, 'dropover', function (event, ui) {
          var offset = self.container.offset();
          var el = $(ui.draggable);
          var cellWidth = self.cellWidth();
          var cellHeight = self.cellHeight(undefined, undefined);
          var origNode = el.data('_gridstack_node');

          var width = origNode ? origNode.width : (Math.ceil(el.outerWidth() / cellWidth));
          var height = origNode ? origNode.height : (Math.ceil(el.outerHeight() / cellHeight));

          draggingElement = el;

          var node = self.grid._prepareNode({ width: width, height: height, _added: false, _temporary: true });
          el.data('_gridstack_node', node);
          el.data('_gridstack_node_orig', origNode);

          el.on('drag', onDrag);
        })
        .on(self.container, 'dropout', function (event, ui) {
          var el = $(ui.draggable);
          if (!el.data('_gridstack_node')) {
            return;
          }
          el.unbind('drag', onDrag);
          var node = el.data('_gridstack_node');
          node.el = null;
          self.grid.removeNode(node);
          self.placeholder.detach();
          self._updateContainerHeight();
          el.data('_gridstack_node', el.data('_gridstack_node_orig'));
        })
        .on(self.container, 'drop', function (event, ui) {
          self.placeholder.detach();

          var node = $(ui.draggable).data('_gridstack_node');
          node._grid = self;
          var el = $(ui.draggable).clone(false);
          el.data('_gridstack_node', node);
          var originalNode = $(ui.draggable).data('_gridstack_node_orig');
          if (typeof originalNode !== 'undefined' && typeof originalNode._grid !== 'undefined') {
            originalNode._grid._triggerRemoveEvent();
          }
          $(ui.helper).remove();
          node.el = el;
          self.placeholder.hide();
          Utils.removePositioningStyles(el);
          el.find('div.ui-resizable-handle').remove();


          (<any>el)
            .attr('data-gs-x', node.x)
            .attr('data-gs-y', node.y)
            .attr('data-gs-width', node.width)
            .attr('data-gs-height', node.height)
            .addClass(self.opts.itemClass)
            .enableSelection()
            .removeData('draggable')
            .removeClass('ui-draggable ui-draggable-dragging ui-draggable-disabled')
            .unbind('drag', onDrag);
          self.container.append(el);
          self._prepareElementsByNode(el, node);
          self._updateContainerHeight();
          self.grid._addedNodes.push(node);
          self._triggerAddEvent();
          self._triggerChangeEvent(undefined);

          self.grid.endUpdate();
          $(ui.draggable).unbind('drag', onDrag);
          $(ui.draggable).removeData('_gridstack_node');
          $(ui.draggable).removeData('_gridstack_node_orig');
        });
    }
  }

  onResizeHandlerFunction(self, isAutoCellHeight) {
    return function () {
      if (isAutoCellHeight) {
        self._updateHeightsOnResize();
      }
      var oneColumnMode;
      if (self._isOneColumnMode() && !self.opts.disableOneColumnMode) {
        if (oneColumnMode) {
          return;
        }
        self.container.addClass(self.opts.oneColumnModeClass);
        oneColumnMode = true;

        self.grid._sortNodes();
        _.each(self.grid.nodes, (node: any)=> {
          self.container.append(node.el);

          if (self.opts.staticGrid) {
            return;
          }
          self.dd.draggable(node.el, 'disable');
          self.dd.resizable(node.el, 'disable');

          node.el.trigger('resize');
        });
      } else {
        if (!oneColumnMode) {
          return;
        }

        self.container.removeClass(self.opts.oneColumnModeClass);
        oneColumnMode = false;

        if (self.opts.staticGrid) {
          return;
        }

        _.each(self.grid.nodes, (node: any)=> {
          if (!node.noMove && !self.opts.disableDrag) {
            self.dd.draggable(node.el, 'enable');
          }
          if (!node.noResize && !self.opts.disableResize) {
            self.dd.resizable(node.el, 'enable');
          }

          node.el.trigger('resize');
        });
      }
    }
  }


  _triggerChangeEvent(forceTrigger) {
    var elements = this.grid.getDirtyNodes();
    var hasChanges = false;

    var eventParams = [];
    if (elements && elements.length) {
      eventParams.push(elements);
      hasChanges = true;
    }

    if (hasChanges || forceTrigger === true) {
      this.container.trigger('change', eventParams);
    }
  };

  _triggerAddEvent() {
    if (this.grid._addedNodes && this.grid._addedNodes.length > 0) {
      this.container.trigger('added', [_.map(this.grid._addedNodes, _.clone)]);
      this.grid._addedNodes = [];
    }
  };

  _triggerRemoveEvent() {
    if (this.grid._removedNodes && this.grid._removedNodes.length > 0) {
      this.container.trigger('removed', [_.map(this.grid._removedNodes, _.clone)]);
      this.grid._removedNodes = [];
    }
  };

  _initStyles() {
    if (this._stylesId) {
      Utils.removeStylesheet(this._stylesId);
    }
    this._stylesId = 'gridstack-style-' + (Math.random() * 100000).toFixed();
    this._styles = Utils.createStylesheet(this._stylesId);
    if (this._styles !== null) {
      this._styles._max = 0;
    }
  };

  getHeightFunction(self) {
    if (!this.opts.verticalMargin || this.opts.cellHeightUnit === this.opts.verticalMarginUnit) {
      return function (nbRows, nbMargins) {
        return (self.opts.cellHeight * nbRows + self.opts.verticalMargin * nbMargins) + self.opts.cellHeightUnit;
      }
    }
    else {
      return function (nbRows, nbMargins) {
        if (!nbRows || !nbMargins) {
          return (self.opts.cellHeight * nbRows + self.opts.verticalMargin * nbMargins) +
            self.opts.cellHeightUnit;
        }
        return 'calc(' + ((self.opts.cellHeight * nbRows) + self.opts.cellHeightUnit) + ' + ' +
          ((self.opts.verticalMargin * nbMargins) + self.opts.verticalMarginUnit) + ')';
      };
    }
  }

  _updateStyles(maxHeight) {
    if (this._styles === null || typeof this._styles === 'undefined') {
      return;
    }

    var prefix = '.' + this.opts._class + ' .' + this.opts.itemClass;
    var self = this;
    var getHeight;

    if (typeof maxHeight == 'undefined') {
      maxHeight = this._styles._max;
    }
    if (this._styles._max !== 0 && maxHeight <= this._styles._max) { // Keep this._styles._max increasing
      return;
    }
    this._initStyles();
    this._updateContainerHeight();
    if (!this.opts.cellHeight) { // The rest will be handled by CSS
      return;
    }

    // can't declare inline functions anymore. Instead, declare a function that returns a function.
    getHeight = this.getHeightFunction(self);

    if (this._styles._max === 0) {
      Utils.insertCSSRule(this._styles, prefix, 'min-height: ' + getHeight(1, 0) + ';', 0);
    }

    if (maxHeight > this._styles._max) {
      for (var i = this._styles._max; i < maxHeight; ++i) {
        Utils.insertCSSRule(this._styles,
          prefix + '[data-gs-height="' + (i + 1) + '"]',
          'height: ' + getHeight(i + 1, i) + ';',
          i
        );
        Utils.insertCSSRule(this._styles,
          prefix + '[data-gs-min-height="' + (i + 1) + '"]',
          'min-height: ' + getHeight(i + 1, i) + ';',
          i
        );
        Utils.insertCSSRule(this._styles,
          prefix + '[data-gs-max-height="' + (i + 1) + '"]',
          'max-height: ' + getHeight(i + 1, i) + ';',
          i
        );
        Utils.insertCSSRule(this._styles,
          prefix + '[data-gs-y="' + i + '"]',
          'top: ' + getHeight(i, i) + ';',
          i
        );
      }
      this._styles._max = maxHeight;
    }
  };

  _updateContainerHeight() {
    if (this.grid._updateCounter) {
      return;
    }
    var height = this.grid.getGridHeight();
    // check for css min height. Each row is cellHeight + verticalMargin, until last one which has no margin below
    var cssMinHeight = parseInt(this.container.css('min-height'));
    if (cssMinHeight > 0) {
      var minHeight = (cssMinHeight + this.opts.verticalMargin) / (this.cellHeight(undefined, undefined) + this.opts.verticalMargin);
      if (height < minHeight) {
        height = minHeight;
      }
    }
    this.container.attr('data-gs-current-height', height);
    if (!this.opts.cellHeight) {
      return;
    }
    if (!this.opts.verticalMargin) {
      this.container.css('height', (height * (this.opts.cellHeight)) + this.opts.cellHeightUnit);
    } else if (this.opts.cellHeightUnit === this.opts.verticalMarginUnit) {
      this.container.css('height', (height * (this.opts.cellHeight + this.opts.verticalMargin) -
        this.opts.verticalMargin) + this.opts.cellHeightUnit);
    } else {
      this.container.css('height', 'calc(' + ((height * (this.opts.cellHeight)) + this.opts.cellHeightUnit) +
        ' + ' + ((height * (this.opts.verticalMargin - 1)) + this.opts.verticalMarginUnit) + ')');
    }
  };

  _isOneColumnMode() {
    return (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth) <=
      this.opts.minWidth;
  };

  _setupRemovingTimeout(el) {
    var self = this;
    var node = $(el).data('_gridstack_node');

    if (node._removeTimeout || !self.opts.removable) {
      return;
    }
    node._removeTimeout = setTimeout(function () {
      el.addClass('grid-stack-item-removing');
      node._isAboutToRemove = true;
    }, self.opts.removeTimeout);
  };

  _clearRemovingTimeout(el) {
    var node = $(el).data('_gridstack_node');

    if (!node._removeTimeout) {
      return;
    }
    clearTimeout(node._removeTimeout);
    node._removeTimeout = null;
    el.removeClass('grid-stack-item-removing');
    node._isAboutToRemove = false;
  };

  onStartMoving(self, node, el) {
    return function (event, ui) {
      self.container.append(self.placeholder);
      var o = $(this);
      self.grid.cleanNodes();
      self.grid.beginUpdate(node);
      var cellWidth = self.cellWidth();
      var dataGsHeight: any =  o.attr('data-gs-height');
      var strictCellHeight: any = Math.ceil(o.outerHeight() / dataGsHeight);
      var cellHeight = self.container.height() / parseInt(self.container.attr('data-gs-current-height'));
      self.placeholder
        .attr('data-gs-x', o.attr('data-gs-x'))
        .attr('data-gs-y', o.attr('data-gs-y'))
        .attr('data-gs-width', o.attr('data-gs-width'))
        .attr('data-gs-height', o.attr('data-gs-height'))
        .show();
      node.el = self.placeholder;
      node._beforeDragX = node.x;
      node._beforeDragY = node.y;

      self.dd.resizable(el, 'option', 'minWidth', cellWidth * (node.minWidth || 1));
      self.dd.resizable(el, 'option', 'minHeight', strictCellHeight * (node.minHeight || 1));

      if (event.type == 'resizestart') {
        o.find('.grid-stack-item').trigger('resizestart');
      }
    }
  }

  onEndMoving(self, node, el) {
    return function (event, ui) {
      var o = $(this);
      if (!o.data('_gridstack_node')) {
        return;
      }

      var forceNotify = false;
      self.placeholder.detach();
      node.el = o;
      self.placeholder.hide();

      if (node._isAboutToRemove) {
        forceNotify = true;
        var gridToNotify = el.data('_gridstack_node')._grid;
        gridToNotify._triggerRemoveEvent();
        el.removeData('_gridstack_node');
        el.remove();
      } else {
        self._clearRemovingTimeout(el);
        if (!node._temporaryRemoved) {
          Utils.removePositioningStyles(o);
          o
            .attr('data-gs-x', node.x)
            .attr('data-gs-y', node.y)
            .attr('data-gs-width', node.width)
            .attr('data-gs-height', node.height);
        } else {
          Utils.removePositioningStyles(o);
          o
            .attr('data-gs-x', node._beforeDragX)
            .attr('data-gs-y', node._beforeDragY)
            .attr('data-gs-width', node.width)
            .attr('data-gs-height', node.height);
          node.x = node._beforeDragX;
          node.y = node._beforeDragY;
          self.grid.addNode(node);
        }
      }
      self._updateContainerHeight();
      self._triggerChangeEvent(forceNotify);

      self.grid.endUpdate();

      var nestedGrids = o.find('.grid-stack');
      if (nestedGrids.length && event.type == 'resizestop') {
        nestedGrids.each(function (index, el) {
          $(el).data('gridstack').onResizeHandler();
        });
        o.find('.grid-stack-item').trigger('resizestop');
        o.find('.grid-stack-item').trigger('gsresizestop');
      }
      if (event.type == 'resizestop') {
        self.container.trigger('gsresizestop', o);
      }
    }
  }

  dragOrResize(self, node, el) {
    return function (event, ui) {

      var cellWidth = self.cellWidth();
      var cellHeight = self.cellHeight();

      var x = Math.round(ui.position.left / cellWidth);
      var y = Math.floor((ui.position.top + cellHeight / 2) / cellHeight);
      var width;
      var height;

      if (event.type != 'drag') {
        width = Math.round(ui.size.width / cellWidth);
        height = Math.round(ui.size.height / cellHeight);
      }

      if (event.type == 'drag') {
        if (el.data('inTrashZone') || x < 0 || x >= self.grid.width || y < 0 ||
          (!self.grid.float && y > self.grid.getGridHeight())) {
          if (!node._temporaryRemoved) {
            if (self.opts.removable === true) {
              self._setupRemovingTimeout(el);
            }

            x = node._beforeDragX;
            y = node._beforeDragY;

            self.placeholder.detach();
            self.placeholder.hide();
            self.grid.removeNode(node);
            self._updateContainerHeight();

            node._temporaryRemoved = true;
          }
        } else {
          self._clearRemovingTimeout(el);

          if (node._temporaryRemoved) {
            self.grid.addNode(node);
            self.placeholder
              .attr('data-gs-x', x)
              .attr('data-gs-y', y)
              .attr('data-gs-width', width)
              .attr('data-gs-height', height)
              .show();
            self.container.append(self.placeholder);
            node.el = self.placeholder;
            node._temporaryRemoved = false;
          }
        }
      } else if (event.type == 'resize') {
        if (x < 0) {
          return;
        }
      }
      // width and height are undefined if not resizing
      var lastTriedWidth = typeof width !== 'undefined' ? width : node.lastTriedWidth;
      var lastTriedHeight = typeof height !== 'undefined' ? height : node.lastTriedHeight;
      if (!self.grid.canMoveNode(node, x, y, width, height) ||
        (node.lastTriedX === x && node.lastTriedY === y &&
          node.lastTriedWidth === lastTriedWidth && node.lastTriedHeight === lastTriedHeight)) {
        return;
      }
      node.lastTriedX = x;
      node.lastTriedY = y;
      node.lastTriedWidth = width;
      node.lastTriedHeight = height;
      self.grid.moveNode(node, x, y, width, height);
      self._updateContainerHeight();
    }
  }

  _prepareElementsByNode(el, node) {
    var self = this;

    this.dd
      .draggable(el, {
        start: this.onStartMoving(self, node, el),
        stop: this.onEndMoving(self, node, el),
        drag: this.dragOrResize(self, node, el)
      })
      .resizable(el, {
        start: this.onStartMoving(self, node, el),
        stop: this.onEndMoving(self, node, el),
        resize: this.dragOrResize(self, node, el)
      });

    if (node.noMove || (this._isOneColumnMode() && !self.opts.disableOneColumnMode) || this.opts.disableDrag ||
      this.opts.staticGrid) {
      this.dd.draggable(el, 'disable');
    }

    if (node.noResize || (this._isOneColumnMode() && !self.opts.disableOneColumnMode) || this.opts.disableResize ||
      this.opts.staticGrid) {
      this.dd.resizable(el, 'disable');
    }

    el.attr('data-gs-locked', node.locked ? 'yes' : null);
  };

  _prepareElement(el, triggerAddEvent) {
    triggerAddEvent = typeof triggerAddEvent != 'undefined' ? triggerAddEvent : false;
    var self = this;
    el = $(el);

    el.addClass(this.opts.itemClass);
    var node = self.grid.addNode({
      x: parseInt(el.attr('data-gs-x'), 10),
      y: parseInt(el.attr('data-gs-y'), 10),
      width: el.attr('data-gs-width'),
      height: el.attr('data-gs-height'),
      maxWidth: el.attr('data-gs-max-width'),
      minWidth: el.attr('data-gs-min-width'),
      maxHeight: el.attr('data-gs-max-height'),
      minHeight: el.attr('data-gs-min-height'),
      autoPosition: Utils.toBool(el.attr('data-gs-auto-position')),
      noResize: Utils.toBool(el.attr('data-gs-no-resize')),
      noMove: Utils.toBool(el.attr('data-gs-no-move')),
      locked: Utils.toBool(el.attr('data-gs-locked')),
      resizeHandles: el.attr('data-gs-resize-handles'),
      el: el,
      id: el.attr('data-gs-id'),
      _grid: self
    }, triggerAddEvent);
    el.data('_gridstack_node', node);

    this._prepareElementsByNode(el, node);
  };

  setAnimation(enable) {
    if (enable) {
      this.container.addClass('grid-stack-animate');
    } else {
      this.container.removeClass('grid-stack-animate');
    }
  };

  addWidget(el, x, y, width, height, autoPosition, minWidth, maxWidth,
    minHeight, maxHeight, id) {
    el = $(el);
    if (typeof x != 'undefined') { el.attr('data-gs-x', x); }
    if (typeof y != 'undefined') { el.attr('data-gs-y', y); }
    if (typeof width != 'undefined') { el.attr('data-gs-width', width); }
    if (typeof height != 'undefined') { el.attr('data-gs-height', height); }
    if (typeof autoPosition != 'undefined') { el.attr('data-gs-auto-position', autoPosition ? 'yes' : null); }
    if (typeof minWidth != 'undefined') { el.attr('data-gs-min-width', minWidth); }
    if (typeof maxWidth != 'undefined') { el.attr('data-gs-max-width', maxWidth); }
    if (typeof minHeight != 'undefined') { el.attr('data-gs-min-height', minHeight); }
    if (typeof maxHeight != 'undefined') { el.attr('data-gs-max-height', maxHeight); }
    if (typeof id != 'undefined') { el.attr('data-gs-id', id); }
    this.container.append(el);
    this._prepareElement(el, true);
    this._triggerAddEvent();
    this._updateContainerHeight();
    this._triggerChangeEvent(true);

    return el;
  };

  makeWidget(el) {
    el = $(el);
    this._prepareElement(el, true);
    this._triggerAddEvent();
    this._updateContainerHeight();
    this._triggerChangeEvent(true);

    return el;
  };

  willItFit(x, y, width, height, autoPosition) {
    var node = { x: x, y: y, width: width, height: height, autoPosition: autoPosition };
    return this.grid.canBePlacedWithRespectToHeight(node);
  };

  removeWidget(el, detachNode) {
    detachNode = typeof detachNode === 'undefined' ? true : detachNode;
    el = $(el);
    var node = el.data('_gridstack_node');

    // For Meteor support: https://github.com/troolee/gridstack.js/pull/272
    if (!node) {
      node = this.grid.getNodeDataByDOMEl(el);
    }

    this.grid.removeNode(node, detachNode);
    el.removeData('_gridstack_node');
    this._updateContainerHeight();
    if (detachNode) {
      el.remove();
    }
    this._triggerChangeEvent(true);
    this._triggerRemoveEvent();
  };

  removeAll(detachNode) {
    _.each(this.grid.nodes, _.bind(function (node) {
      this.removeWidget(node.el, detachNode);
    }, this));
    this.grid.nodes = [];
    this._updateContainerHeight();
  };

  destroy(detachGrid) {
    $(window).off('resize', this.onResizeHandler);
    this.disable();
    if (typeof detachGrid != 'undefined' && !detachGrid) {
      this.removeAll(false);
      this.container.removeData('gridstack');
    } else {
      this.container.remove();
    }
    Utils.removeStylesheet(this._stylesId);
    if (this.grid) {
      this.grid = null;
    }
  };

  resizable(el, val) {
    var self = this;
    el = $(el);
    el.each(function (index, el) {
      el = $(el);
      var node = el.data('_gridstack_node');
      if (typeof node == 'undefined' || node === null) {
        return;
      }

      node.noResize = !(val || false);
      if (node.noResize || (self._isOneColumnMode() && !self.opts.disableOneColumnMode)) {
        self.dd.resizable(el, 'disable');
      } else {
        self.dd.resizable(el, 'enable');
      }
    });
    return this;
  };

  movable(el, val) {
    var self = this;
    el = $(el);
    el.each(function (index, el) {
      el = $(el);
      var node = el.data('_gridstack_node');
      if (typeof node == 'undefined' || node === null) {
        return;
      }

      node.noMove = !(val || false);
      if (node.noMove || (self._isOneColumnMode() && !self.opts.disableOneColumnMode)) {
        self.dd.draggable(el, 'disable');
        el.removeClass('ui-draggable-handle');
      } else {
        self.dd.draggable(el, 'enable');
        el.addClass('ui-draggable-handle');
      }
    });
    return this;
  };

  enableMove(doEnable, includeNewWidgets) {
    this.movable(this.container.children('.' + this.opts.itemClass), doEnable);
    if (includeNewWidgets) {
      this.opts.disableDrag = !doEnable;
    }
  };

  enableResize(doEnable, includeNewWidgets) {
    this.resizable(this.container.children('.' + this.opts.itemClass), doEnable);
    if (includeNewWidgets) {
      this.opts.disableResize = !doEnable;
    }
  };

  disable() {
    this.movable(this.container.children('.' + this.opts.itemClass), false);
    this.resizable(this.container.children('.' + this.opts.itemClass), false);
    this.container.trigger('disable');
  };

  enable() {
    this.movable(this.container.children('.' + this.opts.itemClass), true);
    this.resizable(this.container.children('.' + this.opts.itemClass), true);
    this.container.trigger('enable');
  };

  locked(el, val) {
    el = $(el);
    el.each(function (index, el) {
      el = $(el);
      var node = el.data('_gridstack_node');
      if (typeof node == 'undefined' || node === null) {
        return;
      }

      node.locked = (val || false);
      el.attr('data-gs-locked', node.locked ? 'yes' : null);
    });
    return this;
  };

  maxHeight(el, val) {
    el = $(el);
    el.each(function (index, el) {
      el = $(el);
      var node = el.data('_gridstack_node');
      if (typeof node === 'undefined' || node === null) {
        return;
      }

      if (!isNaN(val)) {
        node.maxHeight = (val || false);
        el.attr('data-gs-max-height', val);
      }
    });
    return this;
  };

  minHeight(el, val) {
    el = $(el);
    el.each(function (index, el) {
      el = $(el);
      var node = el.data('_gridstack_node');
      if (typeof node === 'undefined' || node === null) {
        return;
      }

      if (!isNaN(val)) {
        node.minHeight = (val || false);
        el.attr('data-gs-min-height', val);
      }
    });
    return this;
  };

  maxWidth(el, val) {
    el = $(el);
    el.each(function (index, el) {
      el = $(el);
      var node = el.data('_gridstack_node');
      if (typeof node === 'undefined' || node === null) {
        return;
      }

      if (!isNaN(val)) {
        node.maxWidth = (val || false);
        el.attr('data-gs-max-width', val);
      }
    });
    return this;
  };

  minWidth(el, val) {
    el = $(el);
    el.each(function (index, el) {
      el = $(el);
      var node = el.data('_gridstack_node');
      if (typeof node === 'undefined' || node === null) {
        return;
      }

      if (!isNaN(val)) {
        node.minWidth = (val || false);
        el.attr('data-gs-min-width', val);
      }
    });
    return this;
  };

  _updateElement(el, callback) {
    el = $(el).first();
    var node = el.data('_gridstack_node');
    if (typeof node == 'undefined' || node === null) {
      return;
    }

    var self = this;

    self.grid.cleanNodes();
    self.grid.beginUpdate(node);

    callback.call(this, el, node);

    self._updateContainerHeight();
    self._triggerChangeEvent(undefined);

    self.grid.endUpdate();
  };

  resize(el, width, height) {
    this._updateElement(el, function (el, node) {
      width = (width !== null && typeof width != 'undefined') ? width : node.width;
      height = (height !== null && typeof height != 'undefined') ? height : node.height;

      this.grid.moveNode(node, node.x, node.y, width, height);
    });
  };

  move(el, x, y) {
    this._updateElement(el, function (el, node) {
      x = (x !== null && typeof x != 'undefined') ? x : node.x;
      y = (y !== null && typeof y != 'undefined') ? y : node.y;

      this.grid.moveNode(node, x, y, node.width, node.height);
    });
  };

  update(el, x, y, width, height) {
    this._updateElement(el, function (el, node) {
      x = (x !== null && typeof x != 'undefined') ? x : node.x;
      y = (y !== null && typeof y != 'undefined') ? y : node.y;
      width = (width !== null && typeof width != 'undefined') ? width : node.width;
      height = (height !== null && typeof height != 'undefined') ? height : node.height;

      this.grid.moveNode(node, x, y, width, height);
    });
  };

  verticalMargin(val, noUpdate) {
    if (typeof val == 'undefined') {
      return this.opts.verticalMargin;
    }

    var heightData = Utils.parseHeight(val);

    if (this.opts.verticalMarginUnit === heightData.unit && this.opts.height === heightData.height) {
      return;
    }
    this.opts.verticalMarginUnit = heightData.unit;
    this.opts.verticalMargin = heightData.height;

    if (!noUpdate) {
      this._updateStyles(undefined);
    }
  };

  cellHeight(val, noUpdate) {
    if (typeof val == 'undefined') {
      if (this.opts.cellHeight) {
        return this.opts.cellHeight;
      }
      var o = this.container.children('.' + this.opts.itemClass).first();
      return Math.ceil(o.outerHeight() / o.attr('data-gs-height'));
    }
    var heightData = Utils.parseHeight(val);

    if (this.opts.cellHeightUnit === heightData.unit && this.opts.cellHeight === heightData.height) {
      return;
    }
    this.opts.cellHeightUnit = heightData.unit;
    this.opts.cellHeight = heightData.height;

    if (!noUpdate) {
      this._updateStyles(undefined);
    }

  };

  cellWidth() {
    return Math.round(this.container.outerWidth() / this.opts.width);
  };

  getCellFromPixel(position, useOffset) {
    var containerPos = (typeof useOffset != 'undefined' && useOffset) ?
      this.container.offset() : this.container.position();
    var relativeLeft = position.left - containerPos.left;
    var relativeTop = position.top - containerPos.top;

    var columnWidth = Math.floor(this.container.width() / this.opts.width);
    var rowHeight = Math.floor(this.container.height() / parseInt(this.container.attr('data-gs-current-height')));

    return { x: Math.floor(relativeLeft / columnWidth), y: Math.floor(relativeTop / rowHeight) };
  };

  batchUpdate() {
    this.grid.batchUpdate();
  };

  commit() {
    this.grid.commit();
    this._updateContainerHeight();
  };

  isAreaEmpty(x, y, width, height) {
    return this.grid.isAreaEmpty(x, y, width, height);
  };

  setStatic(staticValue) {
    this.opts.staticGrid = (staticValue === true);
    this.enableMove(!staticValue, undefined);
    this.enableResize(!staticValue, undefined);
    this._setStaticClass();
  };

  _setStaticClass() {
    var staticClassName = 'grid-stack-static';

    if (this.opts.staticGrid === true) {
      this.container.addClass(staticClassName);
    } else {
      this.container.removeClass(staticClassName);
    }
  };

  _updateNodeWidths(oldWidth, newWidth) {
    this.grid._sortNodes();
    this.grid.batchUpdate();
    var node: any = {};
    for (var i = 0; i < this.grid.nodes.length; i++) {
      node = this.grid.nodes[i];
      this.update(node.el, Math.round(node.x * newWidth / oldWidth), undefined,
        Math.round(node.width * newWidth / oldWidth), undefined);
    }
    this.grid.commit();
  };

  setGridWidth(gridWidth, doNotPropagate) {
    this.container.removeClass('grid-stack-' + this.opts.width);
    if (doNotPropagate !== true) {
      this._updateNodeWidths(this.opts.width, gridWidth);
    }
    this.opts.width = gridWidth;
    this.grid.width = gridWidth;
    this.container.addClass('grid-stack-' + gridWidth);
  };

  static registerPlugin(pluginClass) {
    GridStack.registeredPlugins.push(pluginClass);
  }

  static initializeGridStack(gridStackCssClassName, options)
  {
      var elements= document.getElementsByClassName(gridStackCssClassName);
      for (var i = 0; i < elements.length; i++) {
          var o = $(elements[i]);
          if (!o.data('gridstack')) {
            o.data('gridstack', new GridStack(o, options));
          }
      }
  }

}

