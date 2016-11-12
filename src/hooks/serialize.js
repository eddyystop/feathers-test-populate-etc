
const util = require('util');
const errors = require('feathers-errors');
const hookUtils = require('feathers-hooks-common/lib/utils');

// simplistic stub
const isSerializerPermitted = (hook, viewSerializeName, permissions) => {
  return permissions === hook.params.roles;
};

const serialize = (serializerByRoles, where, name) => hook => {
  serializerByRoles = serializerByRoles || hook.params.view.serializerByRolesDefn;
  
  for (let i = 0, len = serializerByRoles.length; i < len; i += 1) {
    let permissions = serializerByRoles[i].permissions; // todo array or split
    
    if (isSerializerPermitted(hook, hook.params.view.serialize || null, permissions)) {
      return serializeWith(serializerByRoles[i].serializer, where, name)(hook);
    }
  }
  
  throw new errors.BadRequest('No serializer found for permissions.');
};

const serializeWith = (defn, where = 'data', name) => function (hook) {
  var items = [];
  
  if (where === 'result') {
    items = hook.result.data || hook.result;
  } if (where === 'data') {
    items = hook.data;
  } if (where === 'params') {
    items = hook.params[name];
  }
  
  serializeItems(items, defn, hook); // 'items' are being updated in place within 'hook'. IMPORTANT
  
  return hook;
};

function serializeItems(items, defn, hook) {
  (Array.isArray(items) ? items : [items]).forEach((item, i) => {
    // Computed funcs may now use values which are deleted later.
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
  
      const includeNames = Object.keys(defn).filter(key => !isReservedWord(key));
      const newExcludes = Object.keys(item).filter(
        key => !only.includes(key) && !includeNames.includes(key) && key !== '_computed' && key !== '_include'
      );
  
      exclude = exclude.concat(newExcludes);
    }
  
    exclude.forEach(key => {
      hookUtils.setByDot(item, key, undefined, true);
    });
  
    const _computed = Object.keys(computed);
    Object.assign(item, computed, _computed.length ? { _computed} : {});
  
    Object.keys(defn).forEach(childProp => {
      if (!isReservedWord(childProp) && item[childProp]) {
        serializeItems(item[childProp], defn[childProp], hook);
      }
    });
  });
}

function isReservedWord(str) {
  return ['computed', 'exclude', 'only'].includes(str);
}

module.exports = {
  serialize,
  serializeWith,
};
