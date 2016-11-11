
const util = require('util');
const hookUtils = require('feathers-hooks-common/lib/utils');

const serialize = (defn, where = 'data', name) => function (hook) {
  var items = [];
  
  if (where === 'result') {
    items = hook.result.data || hook.result;
  } if (where === 'data') {
    items = hook.data;
  } if (where === 'params') {
    items = hook.params[name];
  }
  
  // The 'items' are being updated in place within 'hook'. IMPORTANT
  serializeItems(items, defn, hook);
  
  return hook;
};

function serializeItems(items, defn, hook) {
  (Array.isArray(items) ? items : [items]).forEach((item, i) => {
    // Compute d funcs may use later deleted item values.
    const computed = {};
    Object.keys(defn.computed || {}).forEach(name => {
      computed[name] = defn.computed[name](item, hook);
    });
    
    var exclude = defn.exclude;
    exclude = !exclude ? [] : (Array.isArray(exclude) ? exclude : [exclude]);
    
    // Convert 'only' to 'exclude' as we need to update 'item' in place. Negative impact on GC.
    var only = defn.only;
    if (only) {
      only = Array.isArray(only) ? only : [only];
      
      const childPropNames = Object.keys(defn).filter(key => !isReservedWord(key));
      const newExcludes = Object.keys(item).filter(
        key => !only.includes(key) && !childPropNames.includes(key)
      );
  
      exclude = exclude.concat(newExcludes);
    }
    
    exclude.forEach(key => {
      hookUtils.setByDot(item, key, undefined, true);
      /*
      if (key in item) {
        item[key] = undefined;
        delete item[key];
      }
      */
    });
  
    Object.assign(item, computed);
  
    Object.keys(defn).forEach(childProp => {
      if (!isReservedWord(childProp) && item[childProp]) {
        serializeItems(item[childProp], defn[childProp], hook);
      }
    });
  });
}

function isReservedWord(str) {
  return str === 'computed' || str === 'exclude' || str === 'only';
}

module.exports = {
  serialize,
};