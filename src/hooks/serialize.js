
const util = require('util');

module.exports = (defn, where = 'data', name) => function (hook) {
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
    // Computed funcs may use later deleted item values.
    const computed = {};
    Object.keys(defn.computed || {}).forEach(name => {
      computed[name] = defn.computed[name](item, hook);
    });
    
    var exclude = defn.exclude;
    exclude = !exclude ? [] : (Array.isArray(exclude) ? exclude : [exclude]);
    exclude.forEach(key => { // .filter may be better for GC at the cost of more iterations
      if (key in item) {
        item[key] = undefined;
        delete item[key];
      }
    });
  
    var only = defn.only; // todo test
    if (only) {
      only = (Array.isArray(only) ? only : [only]);
      item = Object.keys(item).filter(key => only.indexOf(key) !== -1);
    }
  
    Object.assign(item, computed);
  
    Object.keys(defn).forEach(childProp => {
      if (childProp !== 'computed' && childProp !== 'exclude' && childProp !== 'only'
        && item[childProp]) {
  
        serializeItems(item[childProp], defn[childProp], hook);
      }
    });
  });
}
