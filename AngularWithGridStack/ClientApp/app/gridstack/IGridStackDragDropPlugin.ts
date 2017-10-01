  /**
  * @class GridStackDragDropPlugin
  * Base class for drag'n'drop plugin.
  */

  export interface IGridStackDragDropPlugin {

    grid: any;
    resizable(el, opts);
    draggable(el, opts);
    droppable(el, opts);
    isDroppable(el, opts) : boolean;
    on(el, eventName, callback);
  }
