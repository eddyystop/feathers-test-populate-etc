
const util = require('util');
const hooks = require('../src/hooks');

const populations = {
  favorites: { // for data that's in the hook
    permissions: 'favorites',  // temporary stub for permissions
    include: { // what items to join to the parent
      post: { // this name is only used for some defaults
        service: 'posts', // The service to populate from
        parentField: 'postId', // The matching field in the parent
        childField: 'id', // The matching field in the child
        include: {
          author: {
            service: 'users',
            parentField: 'author', // Supports dot notation a.b.c
            childField: 'id' // Converts a.b.c to find({'a.b.c':value}). Else, use query or select.
          },
          comment: {
            service: 'comments',
            parentField: 'id',
            childField: 'postId',
            select: (hook, parent) => ({ something: { $exists: false }}), // add to query using runtime data
            nameAs: 'comments', // Parent prop name where to place the populated items
            asArray: true, // store as an array if result has just 1 element
            query: { // Normal feathers query syntax. Get selected fields from the last 5 comments
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

const serializers = {
  favorites: {
    only: [], // Keep no props within favorite. 'post' and 'commentCount' remain.
    computed: {
      commentCount: (favorite, hook) => favorite.post.comments.length,
    },
    post: {
      exclude: ['id', 'createdAt', '_id'], // Supports dot notation a.b.c
      author: {
        exclude: ['id', 'password', '_id', 'age'],
        computed: {
          isUnder18: (author, hook) => author.age < 18, // Works despite 'age' being excluded
        },
      },
      readers: {
        exclude: ['id', 'password', 'age', '_id'],
      },
      comments: {
        only: ['title', 'content'] // Does **not** support dot notation presently
      },
    },
  }
};

const serializersByRoles = {
  favorites : [
    { permissions: 'manager', serializer: serializers.favorites }, // temporary stubs for permissions
    { permissions: 'clerk', serializer: serializers.favorites }, // temporary stubs for permissions
  ]
};

module.exports = app => {
  const hook = {
    result: {},
    params: {
      query: {
        _view: { // the populate and serializersByRoles the client wants done
          populate: 'favorites', // Supports dot notation a.b.c
          serialize: 'favorites', // Supports dot notation a.b.c
        },
      },
      permissions: { // temporary permissions stub
        populate: 'favorites',
        serialize: 'favorites',
      },
      roles: 'manager', // temporary permissions stub
      app,
    },
    data: [
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
  
  Promise.resolve()
    .then(() => hooks.setClientView(populations, serializersByRoles)(hook)) // setup defaults sent by client
    .then(hook1 => hooks.populate(/* use default populate from client */)(hook1))
    .then(hook1 => {
      console.log('\n----- populated -------------------------------------------------');
      console.log(util.inspect(hook1.data, { depth: 8, colors: true }));
      return hook1;
    })
    .then(hook1 => hooks.serialize(/* use default serializer from client */)(hook1))
    .then(hook1 => {
      console.log('\n----- serialized -------------------------------------------------');
      console.log(util.inspect(hook1.data, { depth: 8, colors: true }));
      return hook1;
    })
    .catch(err => console.log(err))
};
