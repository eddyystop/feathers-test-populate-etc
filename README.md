# feathers-test-populate-etc

## About

Work in progress for populate++ and other hooks.

## To do

Populate
- `done with stubs` how include permissions.
- Convert mongoose and Sequelize data to regular objects?
- `done` do we want a hook that drops all items include'd on the base items?

Serialize
- need dot notation on only (exclude is done)
- `done with stubs` how include permissions

Other hooks that may cooperate with populate.
- sanitize.
- validate.

Permissions discussion is at https://github.com/feathersjs/feathers-hooks-common/issues/42

## Run sample

`npm start`

Schemas

```javascript
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
    only: ['postId'], // 'post' and 'commentCount' remain as they are child items.
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
````

The test

```javascript
const hooks = require('../src/hooks');

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

  Promise.resolve()
    // setup default populate and serialize names sent by client
    .then(() => hooks.setClientView(populations, serializersByRoles)(hook))
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
    .then(hook1 => hooks.dePopulate(/* use default serializer from client */)(hook1))
    .then(hook1 => {
      console.log('\n----- depopulated -------------------------------------------------');
      console.log(util.inspect(hook1.data, { depth: 8, colors: true }));
      return hook1;
    })
    .catch(err => console.log(err))
};
```

The test results

```text
Populate data in hook.data
There are 3 items
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
[ { userId: 'as61389dadhga62343hads6712',
    postId: 1,
    _include: [ 'post' ], // needed for dePopulate so we can service.patch() item after modification
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
          _id: 'KIXqMVbJDoDR0gVv' },
       readers: 
        [ { id: '167asdf3689348sdad7312131s',
            name: 'Author 2',
            email: 'author2@posties.com',
            password: '$2a$10$zW4QTkTg2WouVEBIK.zQ9uSFEVOj6NezYcGSQMWaovPy5xzHOr/wO',
            age: 16,
            _id: '6tTiAyK1pA8cz7Xl' },
          { id: 'as61389dadhga62343hads6712',
            name: 'Author 1',
            email: 'author1@posties.com',
            password: '2347wjkadhad8y7t2eeiudhd98eu2rygr',
            age: 55,
            _id: 'KIXqMVbJDoDR0gVv' } ],
       createdAt: '',
       _id: 'vjVAOsVAqapToZMQ',
       _include: [ 'author', 'comment', 'readers' ],
       comments: 
        [ { title: 'Comment 3',
            content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
            postId: 1,
            _id: 'QsDcTQsTiCncNWAy' },
          { title: 'Comment 1',
            content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
            postId: 1,
            _id: 'REKBwJUnomBIlpNI' } ] } },
  { userId: 'as61389dadhga62343hads6712',
    postId: 2,
    _include: [ 'post' ],
    post: 
     { id: 2,
       title: 'Post 2',
       content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
       author: 
        { id: '167asdf3689348sdad7312131s',
          name: 'Author 2',
          email: 'author2@posties.com',
          password: '$2a$10$zW4QTkTg2WouVEBIK.zQ9uSFEVOj6NezYcGSQMWaovPy5xzHOr/wO',
          age: 16,
          _id: '6tTiAyK1pA8cz7Xl' },
       readers: 
        [ { id: '167asdf3689348sdad7312131s',
            name: 'Author 2',
            email: 'author2@posties.com',
            password: '$2a$10$zW4QTkTg2WouVEBIK.zQ9uSFEVOj6NezYcGSQMWaovPy5xzHOr/wO',
            age: 16,
            _id: '6tTiAyK1pA8cz7Xl' },
          { id: 'as61389dadhga62343hads6712',
            name: 'Author 1',
            email: 'author1@posties.com',
            password: '2347wjkadhad8y7t2eeiudhd98eu2rygr',
            age: 55,
            _id: 'KIXqMVbJDoDR0gVv' } ],
       createdAt: '',
       _id: 'atKSGA7touVueX4H',
       _include: [ 'author', 'comment', 'readers' ],
       comments: 
        [ { title: 'Comment 2',
            content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
            postId: 2,
            _id: 'q5LOcWfDWIVLpjEE' } ] } },
  { userId: '167asdf3689348sdad7312131s',
    postId: 1,
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
          _id: 'KIXqMVbJDoDR0gVv' },
       readers: 
        [ { id: '167asdf3689348sdad7312131s',
            name: 'Author 2',
            email: 'author2@posties.com',
            password: '$2a$10$zW4QTkTg2WouVEBIK.zQ9uSFEVOj6NezYcGSQMWaovPy5xzHOr/wO',
            age: 16,
            _id: '6tTiAyK1pA8cz7Xl' },
          { id: 'as61389dadhga62343hads6712',
            name: 'Author 1',
            email: 'author1@posties.com',
            password: '2347wjkadhad8y7t2eeiudhd98eu2rygr',
            age: 55,
            _id: 'KIXqMVbJDoDR0gVv' } ],
       createdAt: '',
       _id: 'vjVAOsVAqapToZMQ',
       _include: [ 'author', 'comment', 'readers' ],
       comments: 
        [ { title: 'Comment 3',
            content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
            postId: 1,
            _id: 'QsDcTQsTiCncNWAy' },
          { title: 'Comment 1',
            content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
            postId: 1,
            _id: 'REKBwJUnomBIlpNI' } ] } } ]

----- serialized -------------------------------------------------
[ { postId: 1,
    _include: [ 'post' ], // needed for dePopulate so we can service.patch() item after modification
    post: 
     { title: 'Post 1',
       content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
       author: 
        { name: 'Author 1',
          email: 'author1@posties.com',
          isUnder18: false,
          _computed: [ 'isUnder18' ] },
       readers: 
        [ { name: 'Author 2', email: 'author2@posties.com' },
          { name: 'Author 1', email: 'author1@posties.com' } ],
       _include: [ 'author', 'comment', 'readers' ], // needed for dePopulate so we can service.patch() item after modification
       comments: 
        [ { title: 'Comment 3',
            content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!' },
          { title: 'Comment 1',
            content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!' } ] },
    commentCount: 2,
    _computed: [ 'commentCount' ] }, // needed for dePopulate so we can service.patch() item after modification
  { postId: 2,
    _include: [ 'post' ],
    post: 
     { title: 'Post 2',
       content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
       author: 
        { name: 'Author 2',
          email: 'author2@posties.com',
          isUnder18: true,
          _computed: [ 'isUnder18' ] }, // needed for dePopulate so we can service.patch() item after modification
       readers: 
        [ { name: 'Author 2', email: 'author2@posties.com' },
          { name: 'Author 1', email: 'author1@posties.com' } ],
       _include: [ 'author', 'comment', 'readers' ],
       comments: 
        [ { title: 'Comment 2',
            content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!' } ] },
    commentCount: 1,
    _computed: [ 'commentCount' ] },
  { postId: 1,
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
        [ { name: 'Author 2', email: 'author2@posties.com' },
          { name: 'Author 1', email: 'author1@posties.com' } ],
       _include: [ 'author', 'comment', 'readers' ],
       comments: 
        [ { title: 'Comment 3',
            content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!' },
          { title: 'Comment 1',
            content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!' } ] },
    commentCount: 2,
    _computed: [ 'commentCount' ] } ]

----- depopulated -------------------------------------------------
[ { postId: 1 }, { postId: 2 }, { postId: 1 } ]

```

## License

Copyright (c) 2016

Licensed under the [MIT license](LICENSE).
