# feathers-test-populate-etc

## About

Work in progress for populate++ and other hooks.

## To do

Populate
- need dot notation on `parentField` and `childField`.
- how include permissions
- do we want a hook that drops all items include'd on the base items?
We could require the original populate schema be a param to stay simple.

Serialize
- need dot notation on exclude
- how include permissions

Other hooks that'll cooperate with populate.
- sanitize.
- validate.

Permissions discussion is at https://github.com/feathersjs/feathers-hooks-common/issues/42

## Run sample

`npm start`

Populate schema

```javascript
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

const serializers = {
  favorites: {
    only: [], // Keep no props within favorite. 'post' and 'commentCount' remain.
    computed: {
      commentCount: (favorite, hook) => favorite.post.comments.length,
    },
    post: {
      exclude: ['id', 'createdAt', '_id'],
      author: {
        exclude: ['id', 'password', '_id', 'age'],
        computed: {
          isUnder18: (author, hook) => author.age < 18, // Works despite 'age' being deleted
        },
      },
      readers: {
        exclude: ['id', 'password', 'age', '_id'],
      },
      comments: {
        only: ['title', 'content']
      },
    },
  }
};
````

The test

```javascript
const hooks = require('../src/hooks');

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
  
  Promise.resolve()
    .then(() => hooks.populate(populations.favorites) /* signature (defn, where, name) */ (hook))
    .then(hook1 => {
      console.log('\n----- populated -------------------------------------------------');
      console.log(util.inspect(hook1.data, { depth: 8, colors: true }));
      return hook1;
    })
    .then(hook1 => hooks.serialize(serializers.favorites) /* signature (defn, where, name) */ (hook))
    .then(hook1 => {
      console.log('\n----- serialized -------------------------------------------------');
      console.log(util.inspect(hook1.data, { depth: 8, colors: true }));
      return hook1;
    })
};
```

The test results

```text
Populate data in hook.data
There are 3 items
which is an array

populate array element 0

  populate with child include: post
  posts.find({ query: { id: 1 } })
  1 results found
  asArray=undefined, so convert 1 elem array to object. 
  Place results in parentItem.post
  populate the single item

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

  populate with child include: post
  posts.find({ query: { id: 2 } })
  1 results found
  asArray=undefined, so convert 1 elem array to object. 
  Place results in parentItem.post
  populate the single item

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

  populate with child include: post
  posts.find({ query: { id: 1 } })
  1 results found
  asArray=undefined, so convert 1 elem array to object. 
  Place results in parentItem.post
  populate the single item

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
       comments: 
        [ { title: 'Comment 2',
            content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
            postId: 2,
            _id: 'q5LOcWfDWIVLpjEE' } ] } },
  { userId: '167asdf3689348sdad7312131s',
    postId: 1,
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
[ { post: 
     { title: 'Post 1',
       content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
       author: 
        { name: 'Author 1',
          email: 'author1@posties.com',
          isUnder18: false },
       readers: 
        [ { name: 'Author 2', email: 'author2@posties.com' },
          { name: 'Author 1', email: 'author1@posties.com' } ],
       comments: 
        [ { title: 'Comment 3',
            content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!' },
          { title: 'Comment 1',
            content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!' } ] },
    commentCount: 2 },
  { post: 
     { title: 'Post 2',
       content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
       author: 
        { name: 'Author 2',
          email: 'author2@posties.com',
          isUnder18: true },
       readers: 
        [ { name: 'Author 2', email: 'author2@posties.com' },
          { name: 'Author 1', email: 'author1@posties.com' } ],
       comments: 
        [ { title: 'Comment 2',
            content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!' } ] },
    commentCount: 1 },
  { post: 
     { title: 'Post 1',
       content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
       author: 
        { name: 'Author 1',
          email: 'author1@posties.com',
          isUnder18: false },
       readers: 
        [ { name: 'Author 2', email: 'author2@posties.com' },
          { name: 'Author 1', email: 'author1@posties.com' } ],
       comments: 
        [ { title: 'Comment 3',
            content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!' },
          { title: 'Comment 1',
            content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!' } ] },
    commentCount: 2 } ]
```

## License

Copyright (c) 2016

Licensed under the [MIT license](LICENSE).
