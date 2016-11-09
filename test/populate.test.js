
const util = require('util');
const hooks = require('../src/hooks');
const populate = hooks.populate;

const populations = {
  favorites: {
    include: {
      post: {
        service: 'posts', // The service to populate from
        parentField: 'postId', // The local field to the parent (ie. favourite). Only needed if different than the key name.
        childField: 'id', // The field of populated object to use for comparison to the parentField
        include: {
          author: {
            service: 'users', // The service to populate from
            parentField: 'author', // The local field to the parent (ie. post)
            childField: 'id' // The field of populated object to use for comparison to the parentField
          },
          comment: {
            service: 'comments', // The service to populate from
            parentField: 'id', // The local field to the parent (ie. post)
            childField: 'postId', // The field of populated object to use for comparison to the parentField
            select: (hook, parent) => ({ something: { $exists: false }}),
            nameAs: 'comments', // Key name to place the populated items on (optional. Defaults to the key name in the object)
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
