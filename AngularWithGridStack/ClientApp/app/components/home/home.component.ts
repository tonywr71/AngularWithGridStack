import * as $ from 'jquery';
import * as _ from 'lodash';
import { Component, ViewEncapsulation } from '@angular/core';

import { JQueryUIGridStackDragDropPlugin } from '../../gridstack/JQueryUIGridStackDragDropPlugin';
import { GridStack } from '../../gridstack/gridstack';
import { Utils } from '../../gridstack/Util';

@Component({
    selector: 'home',
    templateUrl: './home.component.html',
    encapsulation: ViewEncapsulation.None
})
export class HomeComponent {

  serializedData: any[] = [
                    {id: "tile1", x: 0, y: 0, w: 12, h: 2},
                    {id: "tile2", x: 0, y: 7, w: 6, h: 3},
                    {id: "tile3", x: 0, y: 12, w: 6, h: 3},
                    {id: "tile4", x: 6, y: 12, w: 6, h: 3},
                    {id: "tile5", x: 6, y: 19, w: 6, h: 3}
              ];

  ngOnInit() {

    var options = {};
    GridStack.registerPlugin(new JQueryUIGridStackDragDropPlugin());
    GridStack.initializeGridStack("grid-stack", options);

    $('#grid-stack').on('change', (event, items) => {
          var result = this.getSerializedData();
          var json = JSON.stringify(result, null, '    ');
          $('#saved-data').val(json);
    });


    this.loadGrid();
  }

  loadGrid() {
      var grid = $('.grid-stack').data('gridstack');
      grid.removeAll();
      var items = Utils.sort(this.serializedData,undefined,undefined);
      items.forEach(node=>{
          var containerElt = $("#" + node.id);
          containerElt.attr("data-gs-id", node.id);
          containerElt.attr("data-gs-width", node.w);
          containerElt.attr("data-gs-height", node.h);
          containerElt.attr("data-gs-x", node.x);
          containerElt.attr("data-gs-y", node.y);
          grid.makeWidget(containerElt)
      });
      return false;
  }

  saveGrid() {

      this.serializedData = _.map($('.grid-stack > .grid-stack-item:visible'), (el: any)=> {
          el = $(el);
          var node = el.data('_gridstack_node');
          return {
              id: node.id,
              x: node.x,
              y: node.y,
              width: node.width,
              height: node.height
          };
      });
      $('#saved-data').val(JSON.stringify(this.serializedData, null, '    '));

      return false;
  }

  getSerializedData() {

    var result = _.map($('.grid-stack > .grid-stack-item:visible'), (el: any)=> {
        el = $(el);
        var node = el.data('_gridstack_node');
        return {
            id: node.id,
            x: node.x,
            y: node.y,
            w: node.width,
            h: node.height
        };
    });
    return result;

  }

  clearGrid() {
    var grid = $('.grid-stack').data('gridstack');
    grid.removeAll();
    return false;
  }

/*
                $('#save-grid').click(this.saveGrid);
                $('#load-grid').click(this.loadGrid);
                $('#clear-grid').click(this.clearGrid);

                $('#grid-stack').on('change', (event, items) => {
                  var result = this.getSerializedData();
                  var json = JSON.stringify(result, null, '    ');
                  $('#saved-data').val(json);
                });
*/

}
