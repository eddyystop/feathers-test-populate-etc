
const util = require('util');
const errors = require('feathers-errors');
const hookUtils = require('feathers-hooks-common/lib/utils');

// simplistic stub
const checkPermissions = (hook, viewSerializeName, permissions) => {
  if (typeof permissions === 'string') {
    permissions = permissions.split(',');
  }
  
  if (!permissions || !permissions.length) { // serialize has no permissions
    return true;
  }
  
  if (!hook.params.roles) { // cannot match the existing serialize permission
    return false;
  }
  
  let checkRoles = hook.params.roles.split(',');
  
  for (let i = 0, leni = checkRoles.length; i < leni; i += 1) {
    const clientRole = checkRoles[i].trim();
    
    for (let j = 0, lenj = permissions.length; j < lenj; j += 1) {
      if (clientRole === permissions[j].trim()) {
        return true;
      }
    }
  }
  
  return false;
};

const serialize = (serializerByRoles, where, name) => hook => {
  serializerByRoles = serializerByRoles || hook.params.serializerByRolesDefn;
  
  for (let i = 0, len = serializerByRoles.length; i < len; i += 1) {
    let permissions = serializerByRoles[i].permissions; // todo array or split
    
    if (checkPermissions(hook, hook.params.serialize || null, permissions)) {
      return serializeWith(serializerByRoles[i].serializer, where, name)(hook);
    }
  }
  
  throw new errors.BadRequest('No serializer found for permissions.');
};

const serializeWith = (defn, where = 'result', name) => function (hook) {
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
  (Array.isArray(items) ? items : [items]).forEach(item => {
    // Computed funcs may now use values which are deleted later.
    const computed = {};
    Object.keys(defn.computed || {}).forEach(name => {
      computed[name] = defn.computed[name](item, hook);
    });
    
    const only = defn.only;
    if (only) {
      const newItem = {};
      (Array.isArray(only) ? only : [only]).forEach(key => {
        hookUtils.setByDot(newItem, key, item[key]);
      });
  
  
      const _include = item._include;
      if (!_include) {
        Object.keys(item).forEach(key => { delete item[key]; });
      } else {
        Object.keys(item).forEach(key => {
          if (!_include.includes(key) && key !== '_include') {
            delete item[key];
          }
        });
      }

      Object.assign(item, newItem);
    }
  
    const exclude = defn.exclude;
    if (exclude) {
      (Array.isArray(exclude) ? exclude : [exclude]).forEach(key => {
        hookUtils.setByDot(item, key, undefined, true);
      });
    }
  
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
