
const util = require('util');

module.exports = (defn, where, name) => function (hook) {
  console.log(where ? `\nPopulate hook.${where}.${name}` : 'For hook.data');
  const items = where ? hook[where][name] : hook.data;
  
  return populateItems(hook, items, defn, 0);
};

function populateItems(hook, items, includeDefn, depth) {
  const leader = getLeader(depth);
  
  return Promise.resolve()
    .then(() => {
      if (includeDefn.include) {
        // console.log(`${leader}(use populate definition's include prop)`);
        includeDefn = includeDefn.include;
      }
      
      if (!Array.isArray(items)) {
        console.log(`${leader}populate the single item`);
        return populateItem(hook, items, includeDefn, depth + 1);
      }
      
      console.log(`${leader}which is an array`);
      /*
       return Promise.all(
       items.map(item => populateItem(item, includeDefn, depth))
       );
       */
      
      // populate an array sequentially to make trace log sane
      var promise = Promise.resolve();
      var results = [];
  
      items.forEach((item, i) => {
        promise = promise
          .then(() => {
            console.log(`\n${leader}populate array element ${i}`);
            return populateItem(hook, item, includeDefn, depth + 1)
              .catch(err => console.log('populateItem error', err))
          })
          .catch(err => console.log('sequential promise chain error', err))
      });
      
      return promise
        .then(() => results)
        .catch(err => console.log('populateItem error', err));
    })
    .catch(err => console.log('populateItems error', err));
}

function populateItem(hook, item, includeDefn, depth) { // todo implement find: (parent, child) => query
  const leader = getLeader(depth);
  
  return Promise.resolve()
    .then(() => {

      const children = Object.keys(includeDefn);
      
      // process children sequentially
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
  
  const parentVal = parentItem[childDefn.parentField];
  
  if (childDefn.select) {
    console.log(`${leader}evaluate 'select' function`);
  }
  
  var promise = Promise.resolve(childDefn.select ? childDefn.select(hook, parentItem) : {})
    .then(query => {
      const find = { query: childDefn.query || {} };
  
      if (Array.isArray(parentVal)) {
        console.log(`${leader}parent field is an array. match any value in it.`);
      }
      find.query[childDefn.childField] = Array.isArray(parentVal) ? { $in: parentVal } : parentVal;
      
      Object.assign(find.query, query);
  
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
      console.log(`${leader}store results in parent prop: ${nameAs}`);
      
      return parentItem[nameAs];
    });
  
  if (childDefn.include) {
    promise = promise
      .then(items => populateItems(hook, items, childDefn.include, depth))
  }
  
  return promise;
}


function getLeader(depth) {
  return '                                                                  '.substr(0, depth * 2);
}
