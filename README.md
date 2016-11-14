# feathers-test-populate-etc

## About

Work in progress for populate++ and other hooks.

## To do

Populate
- `done with stubs` how include permissions.
- Convert mongoose and Sequelize data to regular objects?

Serialize
- need dot notation on only (exclude is done)
- `done with stubs` how include permissions

Permissions discussion is at https://github.com/feathersjs/feathers-hooks-common/issues/42

## Run sample

`npm start`

Schemas

```javascript
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
};

const serializersByRoles = {
  favorites : [
    { permissions: 'clerk', serializer: { /* would cause an error */} }, // temporary stubs for permissions
    { permissions: 'manager', serializer: serializers.favorites }, // temporary stubs for permissions
  ]
};
````

The test

```javascript
const hooks = require('../src/hooks');
const util = require('util');

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
```

The test results

```text
Populate data in hook.result
There are 3 items
permissions verified for this populate.
which is an array

populate array element 0

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

populate array element 1

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
       postId: 2,
       updatedAt: 1479136971616,
       _id: '4sic8ZmeGtKeaBtw',
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
             _id: 'wFMwaBx2O5GdrStI' },
          readers: 
           [ { id: 'as61389dadhga62343hads6712',
               name: 'Author 1',
               email: 'author1@posties.com',
               password: '2347wjkadhad8y7t2eeiudhd98eu2rygr',
               age: 55,
               _id: 'JdQRiW0WaIXkfLWS' },
             { id: '167asdf3689348sdad7312131s',
               name: 'Author 2',
               email: 'author2@posties.com',
               password: '2347wjkadhad8y7t2eeiudhd98eu2rygr',
               age: 16,
               _id: 'wFMwaBx2O5GdrStI' } ],
          createdAt: '',
          _id: 'KToHahYTM5fY9rOr',
          _include: [ 'author', 'comment', 'readers' ],
          comments: 
           [ { title: 'Comment 2',
               content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
               postId: 2,
               _id: 'EBUZg2FzvnTMC4FH' } ] } },
     { userId: '167asdf3689348sdad7312131s',
       postId: 1,
       updatedAt: 1479136971616,
       _id: 'BtzPLgtLVXQUWk4m',
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
             _id: 'JdQRiW0WaIXkfLWS' },
          readers: 
           [ { id: 'as61389dadhga62343hads6712',
               name: 'Author 1',
               email: 'author1@posties.com',
               password: '2347wjkadhad8y7t2eeiudhd98eu2rygr',
               age: 55,
               _id: 'JdQRiW0WaIXkfLWS' },
             { id: '167asdf3689348sdad7312131s',
               name: 'Author 2',
               email: 'author2@posties.com',
               password: '2347wjkadhad8y7t2eeiudhd98eu2rygr',
               age: 16,
               _id: 'wFMwaBx2O5GdrStI' } ],
          createdAt: '',
          _id: 'dKydEzBZKzPiW857',
          _include: [ 'author', 'comment', 'readers' ],
          comments: 
           [ { title: 'Comment 1',
               content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
               postId: 1,
               _id: '3teRSZcddTRf9ijy' },
             { title: 'Comment 3',
               content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
               postId: 1,
               _id: 'YyUtCaEnldwplQxD' } ] } },
     { userId: 'as61389dadhga62343hads6712',
       postId: 1,
       updatedAt: 1479136971616,
       _id: 'XfCF2jczSSv5M7CS',
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
             _id: 'JdQRiW0WaIXkfLWS' },
          readers: 
           [ { id: 'as61389dadhga62343hads6712',
               name: 'Author 1',
               email: 'author1@posties.com',
               password: '2347wjkadhad8y7t2eeiudhd98eu2rygr',
               age: 55,
               _id: 'JdQRiW0WaIXkfLWS' },
             { id: '167asdf3689348sdad7312131s',
               name: 'Author 2',
               email: 'author2@posties.com',
               password: '2347wjkadhad8y7t2eeiudhd98eu2rygr',
               age: 16,
               _id: 'wFMwaBx2O5GdrStI' } ],
          createdAt: '',
          _id: 'dKydEzBZKzPiW857',
          _include: [ 'author', 'comment', 'readers' ],
          comments: 
           [ { title: 'Comment 1',
               content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
               postId: 1,
               _id: '3teRSZcddTRf9ijy' },
             { title: 'Comment 3',
               content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
               postId: 1,
               _id: 'YyUtCaEnldwplQxD' } ] } } ] }
{ userId: 'as61389dadhga62343hads6712',
  postId: 2,
  updatedAt: 1479136971616,
  _id: '4sic8ZmeGtKeaBtw',
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
        _id: 'wFMwaBx2O5GdrStI' },
     readers: [ [Object], [Object] ],
     createdAt: '',
     _id: 'KToHahYTM5fY9rOr',
     _include: [ 'author', 'comment', 'readers' ],
     comments: [ [Object] ] } }
{ userId: '167asdf3689348sdad7312131s',
  postId: 1,
  updatedAt: 1479136971616,
  _id: 'BtzPLgtLVXQUWk4m',
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
        _id: 'JdQRiW0WaIXkfLWS' },
     readers: [ [Object], [Object] ],
     createdAt: '',
     _id: 'dKydEzBZKzPiW857',
     _include: [ 'author', 'comment', 'readers' ],
     comments: [ [Object], [Object] ] } }
{ userId: 'as61389dadhga62343hads6712',
  postId: 1,
  updatedAt: 1479136971616,
  _id: 'XfCF2jczSSv5M7CS',
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
        _id: 'JdQRiW0WaIXkfLWS' },
     readers: [ [Object], [Object] ],
     createdAt: '',
     _id: 'dKydEzBZKzPiW857',
     _include: [ 'author', 'comment', 'readers' ],
     comments: [ [Object], [Object] ] } }

----- serialized -------------------------------------------------
{ total: 3,
  limit: 5,
  skip: 0,
  data: 
   [ { updatedAt: 1479136971616,
       _id: '4sic8ZmeGtKeaBtw',
       _include: [ 'post' ],
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
       commentsCount: 1,
       _computed: [ 'commentsCount' ] },
     { updatedAt: 1479136971616,
       _id: 'BtzPLgtLVXQUWk4m',
       _include: [ 'post' ],
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
       commentsCount: 2,
       _computed: [ 'commentsCount' ] },
     { updatedAt: 1479136971616,
       _id: 'XfCF2jczSSv5M7CS',
       _include: [ 'post' ],
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
       commentsCount: 2,
       _computed: [ 'commentsCount' ] } ] }

----- patched -------------------------------------------------
patching _id 4sic8ZmeGtKeaBtw with { updatedAt: 1479136971616, _id: '4sic8ZmeGtKeaBtw', createdAt: 1479136971923 }
patching _id 4sic8ZmeGtKeaBtw with { updatedAt: 1479136971616, _id: '4sic8ZmeGtKeaBtw', createdAt: 1479136971923 }
patching _id 4sic8ZmeGtKeaBtw with { updatedAt: 1479136971616, _id: '4sic8ZmeGtKeaBtw', createdAt: 1479136971923 }
```

## License

Copyright (c) 2016

Licensed under the [MIT license](LICENSE).
