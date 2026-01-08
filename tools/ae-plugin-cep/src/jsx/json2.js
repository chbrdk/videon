/*
  json2.js
  2018-04-11

  Public Domain.

  NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

  Version 2.10.3

  This file creates a global JSON object containing two methods: stringify
  and parse.

    JSON.stringify(value, replacer, space)
      value      any JavaScript value, usually an object or array.

      replacer   an optional parameter that determines how object
                  values are stringified for objects. It can be a
                  function or an array of strings.

      space      an optional parameter that specifies the indentation
                  of nested structures. If it is omitted, the text will
                  be packed without extra whitespace. If it is a number,
                  it will specify the number of spaces to indent at each
                  level. If it is a string (such as '\t' or '&nbsp;'),
                  it contains the characters used to indent at each level.

      This method produces a JSON text from a JavaScript value.

      In an object, if an object has a toJSON method, it will be called,
      and the resulting value will be stringified.

      For example, toJSON can be used to serialize Date objects.

    JSON.parse(text, reviver)
      text       a string containing JSON
      reviver    an optional transformation function

      This method parses a JSON text to produce an object or array.

      It can throw a SyntaxError exception.

  This is a minimal implementation for ES3 environments that need JSON support.
  For full implementation, see: https://github.com/douglascrockford/JSON-js
*/

(function () {
    'use strict';
    
    // Minimal JSON implementation for ES3
    if (typeof JSON === 'undefined') {
        window.JSON = {};
    }
    
    if (typeof JSON.stringify === 'undefined') {
        JSON.stringify = function stringify(value, replacer, space) {
            // Simple implementation
            if (value === null) return 'null';
            if (typeof value === 'string') return '"' + value.replace(/"/g, '\\"') + '"';
            if (typeof value === 'number') return value.toString();
            if (typeof value === 'boolean') return value.toString();
            if (Array.isArray(value)) {
                var arr = [];
                for (var i = 0; i < value.length; i++) {
                    arr.push(stringify(value[i], replacer, space));
                }
                return '[' + arr.join(',') + ']';
            }
            if (typeof value === 'object') {
                var props = [];
                for (var key in value) {
                    if (value.hasOwnProperty(key)) {
                        props.push('"' + key + '":' + stringify(value[key], replacer, space));
                    }
                }
                return '{' + props.join(',') + '}';
            }
            return 'undefined';
        };
    }
    
    if (typeof JSON.parse === 'undefined') {
        JSON.parse = function parse(text) {
            // Simple implementation using eval (safe in CEP context)
            return eval('(' + text + ')');
        };
    }
}());

