# feathers-test-populate-etc

## About

Work in progress for populate++ and other hooks.

## To do

Populate
- Convert mongoose and Sequelize data to regular objects?

Permissions discussion is at https://github.com/feathersjs/feathers-hooks-common/issues/42

Some questions from a developer: https://github.com/eddyystop/feathers-test-populate-etc/issues/1

## Run sample

`npm start`

## Why a new hook?

Limitations in the current populate:
- The existing populate hook joins one child item type to the parent item.
One of the reasons `MichaelErmer/feathers-populate-hook` is popular is that it joins multiple
child item types in one call.
- The relationship between the parent and child items does not support dot notation.

Practical needs related to populate that presently require custom coding:
- We sometimes want the child item to have child items of its own.
- We cannot `patch` an updated parent without first manually removing joined children
and any calculated values.
- No serialization of the result. Separate hooks are required to remove unwanted values.
- No calculated values. Separate hooks must be written.
- We may want a parent to be populated differently depending on how its going to be used.
For example a Purchase Request populated for accounting may have child Invoices,
while one populated for receiving may have Receiving Slips instead.

We have new separate populate and serialize hooks for 2 reasons:
- The permission checking for populate is not the same as for serialization.
Separate hooks allow us to use the best for each.
- Its easier to reason about what is happening with separate hooks.

The new design, **in the most complicated case**, allows a service call on the client to specify
what populate and serialization schema it prefers be used.
The new populate hook checks if this is permitted.
The new serialize hook optionally help selects the serialization to perform.
The new dePopulate hook prepares the parent item for a `patch` call.

## Permission control

Two things can be controlled:
- (1) What set of joined items a 'user' is allowed to get.
- (2) What values within those joined items is the user allowed to get.

For (1), each populate schema may optionally contain what permissions are required for its use,
e.g. in `populates.feathers.standard.permissions` below.
The user's permissions are expected to be in `hook.params.permissions`,
just as with `feathers-permissions`.

They both may be an array of elements or a comma separated string of elements.
Each element is of the form `serviceName:schemaName`, e.g. `favorites:standard,favorites:mySpecialView`
or `['*.standard', 'favorites:*']` where the `*` matches anything.

A populate schema may be used if at least one element from the schema matches one element from
the hook. This is checked in `hook.populate(populateSchemaName)`.

About (2). The server can use `hook.serialize(serializers.favorites.standard)` and
roles are not checked.

Alternatively, a user's roles are expected to be in `hook.params.roles` and the server can
use `hook.serializeByRole(serializersByRoles.favorites.standard)` to let the serializer choose a
serialization compatible with the user's roles.

The roles in `serializersByRoles` and the ones in `hook.params.roles` may be an array of roles or
a comma separated string of roles. They match if they have a role in common.

## Why are we calling it serialize instead of sanitize?

From Wikipedia:

In computer science, in the context of data storage, serialization is the process of translating data structures or object state into a format that can be stored (for example, in a file or memory buffer, or transmitted across a network connection link) and reconstructed later in the same or another computer environment

Sanitization is the process of removing sensitive information from a document or other message

## Schemas

```javascript
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
      { roles: 'clerk,reception', serializer: { /* would cause an error */ } },
      { roles: 'admin,exec,manager', serializer: serializers.favorites.standard },
      { roles: null, serializer: { /* would cause an error */ } }, // catch all
    ]
  }
};
````

## Tests

The simplest example code, and what our doc would first introduce, would be:

```javascript`
favorites.after({
  find: [
    hooks.populate(populations.favorites.standard),
    hooks.serialize(serializers.favorites.standard),
  ]
});
favorites.find({}).then(result => {}); // result is populated and serialized
```

The above alone has limitations in practical use:
- The populate and serialize schemas would be scattered and not easily reused.
- Code would have to be hand crafted to control what populates' a client is allowed for a service.
- Code would be required to control what must be serialized out based on the client's roles.
- Code would be required to decide which populate should be used for the client for that method call.

The example run below handles each of these concerns and if therefore more complicated.
  
```javascript
const hooks = require('../src/hooks');
const util = require('util');

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
      hooks.serializeByRole(),
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
      $clientParams: { // how client passes params to server
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

// Helpers

function inspect(desc, obj) {
  console.log(desc, util.inspect(obj, { depth: 4, colors: true }));
}
```

## Test results

```text
Populate data in hook.result
There are 3 items
client permission favorites:* satisfies populate permission favorites:standard
permissions verified for this populate.
which is an array

populate array element 0

  save child names for depopulate: post

  populate with child include: post
  posts.find({ query: { id: 1 } })
  1 results found
  asArray=undefined, so convert 1 elem array to object. 
  Place results in parentItem.post
  populate the single item

    save child names for depopulate: author,comment,readers

    populate with child include: author
    users.find({ query: { id: 'as61389dadhga62343hads6712' } })
    1 results found
    asArray=undefined, so convert 1 elem array to object. 
    Place results in parentItem.author

    populate with child include: comment
    evaluate 'select' function
    comments.find({ query: 
   { '$limit': 5,
     '$select': [ 'title', 'content', 'postId' ],
     '$sort': { createdAt: -1 },
     postId: 1,
     something: { '$exists': false } } })
    2 results found
    Place results in parentItem.comments

    populate with child include: readers
    parent field is an array. match any value in it.
    users.find({ query: { id: { '$in': [ 'as61389dadhga62343hads6712', '167asdf3689348sdad7312131s' ] } } })
    2 results found
    Place results in parentItem.readers

populate array element 1

  save child names for depopulate: post

  populate with child include: post
  posts.find({ query: { id: 2 } })
  1 results found
  asArray=undefined, so convert 1 elem array to object. 
  Place results in parentItem.post
  populate the single item

    save child names for depopulate: author,comment,readers

    populate with child include: author
    users.find({ query: { id: '167asdf3689348sdad7312131s' } })
    1 results found
    asArray=undefined, so convert 1 elem array to object. 
    Place results in parentItem.author

    populate with child include: comment
    evaluate 'select' function
    comments.find({ query: 
   { '$limit': 5,
     '$select': [ 'title', 'content', 'postId' ],
     '$sort': { createdAt: -1 },
     postId: 2,
     something: { '$exists': false } } })
    1 results found
    Place results in parentItem.comments

    populate with child include: readers
    parent field is an array. match any value in it.
    users.find({ query: { id: { '$in': [ 'as61389dadhga62343hads6712', '167asdf3689348sdad7312131s' ] } } })
    2 results found
    Place results in parentItem.readers

populate array element 2

  save child names for depopulate: post

  populate with child include: post
  posts.find({ query: { id: 1 } })
  1 results found
  asArray=undefined, so convert 1 elem array to object. 
  Place results in parentItem.post
  populate the single item

    save child names for depopulate: author,comment,readers

    populate with child include: author
    users.find({ query: { id: 'as61389dadhga62343hads6712' } })
    1 results found
    asArray=undefined, so convert 1 elem array to object. 
    Place results in parentItem.author

    populate with child include: comment
    evaluate 'select' function
    comments.find({ query: 
   { '$limit': 5,
     '$select': [ 'title', 'content', 'postId' ],
     '$sort': { createdAt: -1 },
     postId: 1,
     something: { '$exists': false } } })
    2 results found
    Place results in parentItem.comments

    populate with child include: readers
    parent field is an array. match any value in it.
    users.find({ query: { id: { '$in': [ 'as61389dadhga62343hads6712', '167asdf3689348sdad7312131s' ] } } })
    2 results found
    Place results in parentItem.readers

----- populated -------------------------------------------------
{ total: 3,
  limit: 5,
  skip: 0,
  data: 
   [ { userId: 'as61389dadhga62343hads6712',
       postId: 1,
       updatedAt: 1479243746822,
       _id: 'KifegxXtwKquiXfp',
       _include: [ 'post' ],
       post: 
        { id: 1,
          title: 'Post 1',
          content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
          author: 
           { id: 'as61389dadhga62343hads6712',
             name: 'Author 1',
             email: 'author1@posties.com',
             password: '2347wjkadhad8y7t2eeiudhd98eu2rygr',
             age: 55,
             _id: 'DJEQwHkStyqnwCiS' },
          readers: 
           [ { id: 'as61389dadhga62343hads6712',
               name: 'Author 1',
               email: 'author1@posties.com',
               password: '2347wjkadhad8y7t2eeiudhd98eu2rygr',
               age: 55,
               _id: 'DJEQwHkStyqnwCiS' },
             { id: '167asdf3689348sdad7312131s',
               name: 'Author 2',
               email: 'author2@posties.com',
               password: '2347wjkadhad8y7t2eeiudhd98eu2rygr',
               age: 16,
               _id: 'txICatQsjvixFcf3' } ],
          createdAt: '',
          _id: 'qO31ZdM5TWJSw1vQ',
          _include: [ 'author', 'comment', 'readers' ],
          comments: 
           [ { title: 'Comment 1',
               content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
               postId: 1,
               _id: 'MvnmaqJ6d1LQlItu' },
             { title: 'Comment 3',
               content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
               postId: 1,
               _id: 'NePpminh5LISZECh' } ] } },
     { userId: 'as61389dadhga62343hads6712',
       postId: 2,
       updatedAt: 1479243746823,
       _id: 'NOqg51tVftA6pl54',
       _include: [ 'post' ],
       post: 
        { id: 2,
          title: 'Post 2',
          content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
          author: 
           { id: '167asdf3689348sdad7312131s',
             name: 'Author 2',
             email: 'author2@posties.com',
             password: '2347wjkadhad8y7t2eeiudhd98eu2rygr',
             age: 16,
             _id: 'txICatQsjvixFcf3' },
          readers: 
           [ { id: 'as61389dadhga62343hads6712',
               name: 'Author 1',
               email: 'author1@posties.com',
               password: '2347wjkadhad8y7t2eeiudhd98eu2rygr',
               age: 55,
               _id: 'DJEQwHkStyqnwCiS' },
             { id: '167asdf3689348sdad7312131s',
               name: 'Author 2',
               email: 'author2@posties.com',
               password: '2347wjkadhad8y7t2eeiudhd98eu2rygr',
               age: 16,
               _id: 'txICatQsjvixFcf3' } ],
          createdAt: '',
          _id: '8ay8fIcyx50uhl0g',
          _include: [ 'author', 'comment', 'readers' ],
          comments: 
           [ { title: 'Comment 2',
               content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
               postId: 2,
               _id: 'qqwaopW8LdWLyX0b' } ] } },
     { userId: '167asdf3689348sdad7312131s',
       postId: 1,
       updatedAt: 1479243746823,
       _id: 'NeCYB4TyB4ySJEwa',
       _include: [ 'post' ],
       post: 
        { id: 1,
          title: 'Post 1',
          content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
          author: 
           { id: 'as61389dadhga62343hads6712',
             name: 'Author 1',
             email: 'author1@posties.com',
             password: '2347wjkadhad8y7t2eeiudhd98eu2rygr',
             age: 55,
             _id: 'DJEQwHkStyqnwCiS' },
          readers: 
           [ { id: 'as61389dadhga62343hads6712',
               name: 'Author 1',
               email: 'author1@posties.com',
               password: '2347wjkadhad8y7t2eeiudhd98eu2rygr',
               age: 55,
               _id: 'DJEQwHkStyqnwCiS' },
             { id: '167asdf3689348sdad7312131s',
               name: 'Author 2',
               email: 'author2@posties.com',
               password: '2347wjkadhad8y7t2eeiudhd98eu2rygr',
               age: 16,
               _id: 'txICatQsjvixFcf3' } ],
          createdAt: '',
          _id: 'qO31ZdM5TWJSw1vQ',
          _include: [ 'author', 'comment', 'readers' ],
          comments: 
           [ { title: 'Comment 1',
               content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
               postId: 1,
               _id: 'MvnmaqJ6d1LQlItu' },
             { title: 'Comment 3',
               content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
               postId: 1,
               _id: 'NePpminh5LISZECh' } ] } } ] }

----- serialized -------------------------------------------------
{ total: 3,
  limit: 5,
  skip: 0,
  data: 
   [ { _include: [ 'post' ],
       post: 
        { title: 'Post 1',
          content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
          author: 
           { name: 'Author 1',
             email: 'author1@posties.com',
             isUnder18: false,
             _computed: [ 'isUnder18' ] },
          readers: 
           [ { name: 'Author 1', email: 'author1@posties.com' },
             { name: 'Author 2', email: 'author2@posties.com' } ],
          _include: [ 'author', 'comment', 'readers' ],
          comments: 
           [ { title: 'Comment 1',
               content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!' },
             { title: 'Comment 3',
               content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!' } ] },
       _id: 'KifegxXtwKquiXfp',
       updatedAt: 1479243746822,
       commentsCount: 2,
       _computed: [ 'commentsCount' ] },
     { _include: [ 'post' ],
       post: 
        { title: 'Post 2',
          content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
          author: 
           { name: 'Author 2',
             email: 'author2@posties.com',
             isUnder18: true,
             _computed: [ 'isUnder18' ] },
          readers: 
           [ { name: 'Author 1', email: 'author1@posties.com' },
             { name: 'Author 2', email: 'author2@posties.com' } ],
          _include: [ 'author', 'comment', 'readers' ],
          comments: 
           [ { title: 'Comment 2',
               content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!' } ] },
       _id: 'NOqg51tVftA6pl54',
       updatedAt: 1479243746823,
       commentsCount: 1,
       _computed: [ 'commentsCount' ] },
     { _include: [ 'post' ],
       post: 
        { title: 'Post 1',
          content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
          author: 
           { name: 'Author 1',
             email: 'author1@posties.com',
             isUnder18: false,
             _computed: [ 'isUnder18' ] },
          readers: 
           [ { name: 'Author 1', email: 'author1@posties.com' },
             { name: 'Author 2', email: 'author2@posties.com' } ],
          _include: [ 'author', 'comment', 'readers' ],
          comments: 
           [ { title: 'Comment 1',
               content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!' },
             { title: 'Comment 3',
               content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!' } ] },
       _id: 'NeCYB4TyB4ySJEwa',
       updatedAt: 1479243746823,
       commentsCount: 2,
       _computed: [ 'commentsCount' ] } ] }

----- patched -------------------------------------------------
patching _id KifegxXtwKquiXfp with { _id: 'KifegxXtwKquiXfp', updatedAt: 1479243747646 }
patching _id NOqg51tVftA6pl54 with { _id: 'NOqg51tVftA6pl54', updatedAt: 1479243747648 }
patching _id NeCYB4TyB4ySJEwa with { _id: 'NeCYB4TyB4ySJEwa', updatedAt: 1479243747649 }
```

## License

Copyright (c) 2016

Licensed under the [MIT license](LICENSE).
