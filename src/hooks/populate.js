
const util = require('util');
const hooks = require('feathers-hooks-common/lib/utils');

const setClientView = (populations, serializersByRoles) => hook => {
  if (hook.params.query && hook.params.query._view) {
    hook.params.view = Object.assign(hook.params.view || {}, hook.params.query._view || {});
    delete hook.params.query._view;
    
    const view = hook.params.view;
    if (view.populate) {
      view.populateDefn = populations[view.populate];
    }
    if (view.serialize) {
      view.serializerByRolesDefn = serializersByRoles[view.serialize];
    }
    return hook;
  }
};

const populate = (defn, where = 'data', name) => function (hook) {
  console.log(`\nPopulate data in hook.${where}${where === 'params' ? '.' + name : ''}`);
  var items = [];
  
  if (where === 'result') {
    items = hook.result.data || hook.result;
  } if (where === 'data') {
    items = hook.data;
  } if (where === 'params') {
    items = hook.params[name];
  }
  
  console.log(`There are ${items.length} items`);
  
  defn = defn || hook.params.view.populateDefn; // todo throw if not object
  
  // The 'items' are being updated in place within 'hook'. IMPORTANT
  return populateItems(hook, items, defn, 0)
    .then(() => hook);
};

function populateItems(hook, items, includeDefn, depth) {
  const leader = getLeader(depth);
  
  return Promise.resolve()
    .then(() => {
      if (includeDefn.include) {
        // console.log(`${leader}(use populate definition's include prop)`);
        includeDefn = includeDefn.include;
      }
      
      if (!Array.isArray(items)) { // todo refactor after logs are no longer needed
        console.log(`${leader}populate the single item`);
        return populateItem(hook, items, includeDefn, depth + 1);
      }
      
      console.log(`${leader}which is an array`);
      /*
       return Promise.all(
       items.map(item => populateItem(item, includeDefn, depth))
       );
       */
      
      // populate an array sequentially to keep trace log sane
      var promise = Promise.resolve();
      var results = [];
  
      items.forEach((item, i) => {
        promise = promise
          .then(() => {
            console.log(`\n${leader}populate array element ${i}`);
            return populateItem(hook, item, includeDefn, depth + 1)
          });
      });
      
      return promise;
    });
}

function populateItem(hook, item, includeDefn, depth) {
  const leader = getLeader(depth);
  
  return Promise.resolve()
    .then(() => {
      
      // process children sequentially to keep trace log sane
      var promise = Promise.resolve();
      Object.keys(includeDefn).forEach((childName, i) => {
        promise = promise
          .then(() => {
            console.log(`\n${leader}populate with child include: ${childName}`);
            return populateItemWithChild(hook, item, childName, includeDefn[childName], depth)
          });
      });
      
      return promise;
    });
}

function populateItemWithChild(hook, parentItem, childName, childDefn, depth) {
  const leader = getLeader(depth);
  
  //const parentVal = parentItem[childDefn.parentField];
  const parentVal = hooks.getByDot(parentItem, childDefn.parentField);
  
  if (childDefn.select) {
    console.log(`${leader}evaluate 'select' function`);
  }
  
  var promise = Promise.resolve(childDefn.select ? childDefn.select(hook, parentItem) : {})
    .then(query => {
      const find = { query: childDefn.query || {} };
  
      // todo support dot notation on childField & parentField
      if (Array.isArray(parentVal)) {
        console.log(`${leader}parent field is an array. match any value in it.`);
      }
      find.query[childDefn.childField] = Array.isArray(parentVal) ? { $in: parentVal } : parentVal;
      
      Object.assign(find.query, query); // dynamic options override static ones
  
      console.log(`${leader}${childDefn.service}.find(${util.inspect(find, { depth: 5, colors: true })})`);
  
      return hook.params.app.service(childDefn.service).find(find)
    })
    .then(result => {
      result = result.data || result;
      console.log(`${leader}${result.length} results found`);
      
      if (result.length === 1 && !childDefn.asArray) {
        console.log(`${leader}asArray=${childDefn.asArray}, so convert 1 elem array to object. `);
        result = result[0];
      }
      
      const nameAs = childDefn.nameAs || childName;
      parentItem[nameAs] = result;
  
      console.log(`${leader}Place results in parentItem.${nameAs}`);
      return parentItem[nameAs];
    });
  
  if (childDefn.include) {
    promise = promise
      .then(items => populateItems(hook, items, childDefn.include, depth))
  }
  
  return promise;
}


function normalizeResult(obj) { // todo normalize results
  // If it's a mongoose model then
  if (typeof obj.toObject === 'function') {
    return obj.toObject();
  }
  // If it's a Sequelize model
  else if (typeof obj.toJSON === 'function') {
    return obj.toJSON();
  }
}

function getLeader(depth) {
  return '                                                                  '.substr(0, depth * 2);
}

function inspect(desc, obj, leader) {
  console.log(`${leader}.....${desc}...................`);
  console.log(leader, util.inspect(obj, { depth: 8, colors: true }));
  console.log(`${leader}...................`);
}

module.exports = {
  setClientView,
  populate,
};
