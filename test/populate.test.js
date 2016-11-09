
const util = require('util');
const hooks = require('../src/hooks');
const populate = hooks.populate;

const populations = {
  favorites: { // for data that's in the hook
    include: { // what items to join to the parent
      post: { // this name is only used for some defaults
        service: 'posts', // The service to populate from
        parentField: 'postId', // The matching field in the parent
        childField: 'id', // The matching field in the child
        include: {
          author: {
            service: 'users',
            parentField: 'author',
            childField: 'id'
          },
          comment: {
            service: 'comments',
            parentField: 'id',
            childField: 'postId',
            select: (hook, parent) => ({ something: { $exists: false }}), // add to query using runtime data
            nameAs: 'comments', // Parent prop name where to place the populated items
            asArray: true,
            query: { // Normal feathers query syntax. Get the title and body of the last 5 comments
              $limit: 5,
              $select: ['title', 'content', 'postId'],
              $sort: { createdAt: -1 }
            },
          },
          readers: {
            service: 'users',
            parentField: 'readers',
            childField: 'id'
          }
        }
      }
    }
  }
};

module.exports = app => {
  const hook = { params: { app }, result: {}, data: [
    {
      userId: 'as61389dadhga62343hads6712',
      postId: 1
    },
    {
      userId: 'as61389dadhga62343hads6712',
      postId: 2
    },
    {
      userId: '167asdf3689348sdad7312131s',
      postId: 1
    }
  ]};
  
  console.log('\n==================================================================');
  
  populate(populations.favorites)(hook)
    .then(results => {
      console.log('\n----- result -------------------------------------------------');
      console.log(util.inspect(hook.data, { depth: 8, colors: true }));
    });
};
