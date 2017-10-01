  /**
  * @class GridStackDragDropPlugin
  * Base class for drag'n'drop plugin.
  */

import { IGridStackDragDropPlugin } from './IGridStackDragDropPlugin';

export class GridStackDragDropPlugin implements IGridStackDragDropPlugin {

  grid: any;
  constructor() { }

  resizable(el, opts) {
    return this;
  }

  draggable(el, opts) {
    return this;
  }

  droppable(el, opts) {
    return this;
  }

  isDroppable(el) {
    return false;
  }

  on(el, eventName, callback) {
    return this;
  }

}
