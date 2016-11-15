
const util = require('util');
const hooks = require('../src/hooks');

const populations = {
  favorites: { // Service name
    standard:   { // Our name for this group of populates
      permissions: 'favorites:standard,favorites:abc',  // allows clients having favorites:*, *:standard, *:abc
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
  }
};

const serializers = {
  favorites: {
    standard: {
      only: ['_id', 'updatedAt'], // commentsCount and post are auto included as they are calculated
      computed: {
        commentsCount: (favorite, hook) => favorite.post.comments.length,
      },
      post: {
        exclude: ['id', 'createdAt', '_id'], // Can exclude child items, e.g. author
        author: {
          exclude: ['id', 'password', '_id', 'age'], // Supports dot notation a.b.c
          computed: {
            isUnder18: (author, hook) => author.age < 18, // Works despite 'age' being excluded
          },
        },
        readers: {
          exclude: ['id', 'password', 'age', '_id'],
        },
        comments: {
          only: ['title', 'content'] // Supports dot notation a.b.c
        },
      },
    }
  }
};

const serializersByRoles = { // Which serializer to use depending on client's permission role
  favorites: {
    standard: [
      { permissions: 'clerk,reception', serializer: { /* would cause an error */ } },
      { permissions: 'admin,exec,manager', serializer: serializers.favorites.standard },
      { permissions: null, serializer: { /* would cause an error */ } }, // catch all
    ]
  }
};

// === Test

/*
  The simplest example code, and what our doc would first introduce, would be:
  
  favorites.after({
    find: [
      hooks.populate(populations.favorites.standard),
      hooks.serialize(serializers.favorites.standard),
    ]
  });
  favorites.find({}).then(result => {}); // result is populated and serialized
  
  The above alone has limitations in practical use:
  - The populate and serialize schemas would be scattered and not easily reused.
  - Code would have to be hand crafted to control what populates' a client is allowed for a service.
  - Code would be required to control what must be serialized out based on the client's roles.
  - Code would be required to decide which populate should be used for the client for that method call.
  
  The example run below handles each of these concerns and if therefore more complicated.
*/

module.exports = app => {
  const favorites = app.service('favorites');
  
  // ===== Set up hooks to populate, serialize and depopulate
  
  favorites.before({
    all: [
      // Insert user's permissions and roles. Will be replaced by something from feathers-permissions.
      hook => {
        hook.params.permissions = {
          populate: 'favorites:*,chatroom:standard', // satisfies populate permission feathers:anything
        };
        
        hook.params.roles = 'manager';
        
        return hook;
      },
      // Move default populate and serialize names to hook.params (see favorites.find(query) below)
      hooks.getClientParams(),
    ],
    find: [
      // Convert the default populate and serialize names to their objects
      hooks.getDefaultPopulateSerialize(populations, serializersByRoles),
    ],
    patch: [
      // Remove all populated or computed data before patching the item
      hooks.dePopulate(),
      // Show that the patch method gets the depopulated results
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
  
  // ===== Read data. The client indicates how it would like the result populated and serialized.

  favorites.find({
    query: {
      _clientParams: { // how client passes params to server
        populate: 'standard', // Client wants favorites.standard populate. Supports dot notation a.b.c
        serialize: 'standard', // Client wants favorites.standard serialize. Supports dot notation a.b.c
      }
    }
  })
    .catch(err => console.log('find error', err))
    .then(result => {
      console.log('\n----- patched -------------------------------------------------');
      
      // ===== Update data. The populated and computed data is removed beforehand.
      
      result.data.forEach(item => {
        item.updatedAt = Date.now();
        favorites.patch(item._id, item) // hook logs patch data
          .catch(err => console.log('patch error', err));
      });
    });
};

// Helpers

function inspect(desc, obj) {
  console.log(desc, util.inspect(obj, { depth: 4, colors: true }));
}
