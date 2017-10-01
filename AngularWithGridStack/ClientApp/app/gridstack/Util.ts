import * as $ from 'jquery'  
import * as _ from 'lodash'

 export class Utils {

    static node;
    static nn;
    static newY;
    static n;
    static width;
    static x;
    static y;

    static isIntercepted(a, b) {
      return !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
    }

    static sort(nodes, dir, width) {
      width = width || (<any>_.chain(nodes).map(function (node) { return node.x + node.width; })).max().value();
      dir = dir != -1 ? 1 : -1;
      return _.sortBy(nodes, (n: any)=> { return dir * (n.x + n.y * width); });
    }

    static createStylesheet(id) {
      var style = document.createElement('style');
      style.setAttribute('type', 'text/css');
      style.setAttribute('data-gs-style-id', id);
      if ((<any>style).styleSheet) {
        (<any>style).styleSheet.cssText = '';
      } else {
        style.appendChild(document.createTextNode(''));
      }
      document.getElementsByTagName('head')[0].appendChild(style);
      return style.sheet;
    }

    static removeStylesheet(id) {
      $('STYLE[data-gs-style-id=' + id + ']').remove();
    }

    static insertCSSRule(sheet, selector, rules, index) {
      if (typeof sheet.insertRule === 'function') {
        sheet.insertRule(selector + '{' + rules + '}', index);
      } else if (typeof sheet.addRule === 'function') {
        sheet.addRule(selector, rules, index);
      }
    }

    static toBool(v) {
      if (typeof v == 'boolean') {
        return v;
      }
      if (typeof v == 'string') {
        v = v.toLowerCase();
        return !(v === '' || v == 'no' || v == 'false' || v == '0');
      }
      return Boolean(v);
    }

    static _collisionNodeCheck(n) {
      return n != this.node && Utils.isIntercepted(n, this.nn);
    }

    static _didCollide(bn) {
      return Utils.isIntercepted({ x: this.n.x, y: this.newY, width: this.n.width, height: this.n.height }, bn);
    }

    static _isAddNodeIntercepted(n) {
      return Utils.isIntercepted({ x: this.x, y: this.y, width: this.node.width, height: this.node.height }, n);
    }

    static parseHeight(val) {
      var height = val;
      var heightUnit = 'px';
      if (height && _.isString(height)) {
        var match = height.match(/^(-[0-9]+\.[0-9]+|[0-9]*\.[0-9]+|-[0-9]+|[0-9]+)(px|em|rem|vh|vw)?$/);
        if (!match) {
          throw new Error('Invalid height');
        }
        heightUnit = match[2] || 'px';
        height = parseFloat(match[1]);
      }
      return { height: height, unit: heightUnit };
    }

    static removePositioningStyles(el) {
      var style = el[0].style;
      if (style.position) {
        style.removeProperty('position');
      }
      if (style.left) {
        style.removeProperty('left');
      }
      if (style.top) {
        style.removeProperty('top');
      }
      if (style.width) {
        style.removeProperty('width');
      }
      if (style.height) {
        style.removeProperty('height');
      }
    }

  }
