
const util = require('util');
const hooks = require('../src/hooks');

const populations = {
  favorites: { // Will be used with favorites service.
    permissions: 'favorites',  // Temporary stub for permissions. To integrate witht feathers-permissions.
    include: { // Which child items to join to the parent item
      post: { // This name is only used for some defaults
        service: 'posts', // The service to populate from
        parentField: 'postId', // The matching field in the parent. Supports dot notation a.b.c
        childField: 'id', // The matching field in the child. Supports dot notation a.b.c
        include: {
          author: {
            service: 'users',
            parentField: 'author',
            childField: 'id' // Would convert a.b.c to find({'a.b.c':value}). Use .query or .select for something else.
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
            parentField: 'readers', // This is an array, so id: { $in: { readers } } will be used.
            childField: 'id'
          }
        }
      }
    }
  }
};

const serializers = {
  favorites: {
    only: ['_id', 'updatedAt'], // 'post' and 'commentsCount' are also included, being calculated
    computed: {
      commentsCount: (favorite, hook) => favorite.post.comments.length
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
        only: ['title', 'content'] // Will support dot notation
      },
    },
  }
};

const serializersByRoles = {
  favorites : [
    { permissions: 'clerk', serializer: { /* would cause an error */} }, // temporary stubs for permissions
    { permissions: 'manager', serializer: serializers.favorites }, // temporary stubs for permissions
  ]
};

// === Test

module.exports = app => {
  const favorites = app.service('favorites');
  
  // ===== Set up hooks to populate, serialize and depopulate
  
  favorites.before({
    all: [
      // Insert user's permissions and roles. Will be replaced by something from feathers-permissions.
      hook => {
        hook.params.permissions = { // temporary permissions stub
          populate: 'favorites',
          serialize: 'favorites',
        };
        
        hook.params.roles = 'manager'; // temporary roles stub
        
        return hook;
      },
      // Move default populate and serialize names to hook.params (see favorites.find below)
      hooks.getClientParams(),
      // Convert the default populate and serialize names to their objects
      hooks.getDefaultPopulateSerialize(populations, serializersByRoles),
    ],
    patch: [
      // Remove all populated or computed data before patching the item
      hooks.dePopulate(),
      hook => {
        console.log('patching _id', hook.data._id, 'with', hook.data)
      },
    ],
  });
  
  favorites.after({
    find: [
      // Populate the result using the default from getDefaultPopulateSerialize
      hooks.populate(),
      hook => {
        console.log('\n----- populated -------------------------------------------------');
        console.log(util.inspect(hook.result, {depth: 8, colors: true}));
        return hook;
      },
      // Serialize the result using the default from getDefaultPopulateSerialize
      hooks.serialize(),
      hook => {
        console.log('\n----- serialized -------------------------------------------------');
        console.log(util.inspect(hook.result, {depth: 8, colors: true}));
        return hook;
      }
    ],
  });
  
  // ===== Read data. The client indicates how it wants the result populated and serialized.
  
  favorites.find({
    query: {
      _clientParams: { // how client passes params to server
        populate: 'favorites', // How client wants result populated. Supports dot notation a.b.c
        serialize: 'favorites', // How client wants result serialized. Supports dot notation a.b.c
      }
    }
  })
    .catch(err => console.log('error', err))
    .then(result => {
      console.log('\n----- patched -------------------------------------------------');
      
      // ===== Update data. The populated and computed data is removed beforehand.
      
      result.data.forEach(item => {
        item.createdAt = Date.now();
        favorites.patch(result.data[0]._id, result.data[0]); // hook logs patch data
      });
    });
};

// Helpers

function inspect(desc, obj) {
  console.log(desc, util.inspect(obj, { depth: 4, colors: true }));
}
