import * as $ from 'jquery' 
import 'jqueryui';
import * as _ from 'lodash'
import { IGridStackDragDropPlugin } from './IGridStackDragDropPlugin';

export class JQueryUIGridStackDragDropPlugin implements IGridStackDragDropPlugin {

  grid: any;

  constructor() {}

  resizable(el, opts) {
    el = $(el);
    if (opts === 'disable' || opts === 'enable') {
      el.resizable(opts);
    } else if (opts === 'option') {
      var key = arguments[2];
      var value = arguments[3];
      el.resizable(opts, key, value);
    } else {
      var handles = el.data('gs-resize-handles') ? el.data('gs-resize-handles') :
        this.grid.opts.resizable.handles;
      el.resizable(_.extend({}, this.grid.opts.resizable, {
        handles: handles
      }, {
          start: opts.start || function () { },
          stop: opts.stop || function () { },
          resize: opts.resize || function () { }
        }));
    }
    return this;
  }

  draggable(el, opts) {
    el = $(el);
    if (opts === 'disable' || opts === 'enable') {
      el.draggable(opts);
    } else {
      el.draggable(_.extend({}, this.grid.opts.draggable, {
        containment: this.grid.opts.isNested ? this.grid.container.parent() : null,
        start: opts.start || function () { },
        stop: opts.stop || function () { },
        drag: opts.drag || function () { }
      }));
    }
    return this;
  }

  droppable(el, opts) {
    el = $(el);
    el.droppable(opts);
    return this;
  };

  isDroppable(el, opts) {
    el = $(el);
    return Boolean(el.data('droppable'));
  };

  on(el, eventName, callback) {
    $(el).on(eventName, callback);
    return this;
  };
}