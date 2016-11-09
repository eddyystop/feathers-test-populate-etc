# feathers-test-populate-etc

## About

Work in progress for populate++ hook.

## To do

Populate
- dot notation on `parentField` and `childField`.
- support user permissions (here?)
- do we want a hook that drops all items include'd on the base items?
We could require the original populate schema be a param to stay simple.

Other hooks that'll cooperate with populate.
- serialization (include, exclude, calculate) including permissions.
- sanitization.
- validations.

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
            select: (hook, parent) => ({ something: { $exists: false }}), // add to query based on run-time criteria
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
            parentField: 'readers', // This is an array. We'll match users to any of its values.
            childField: 'id'
          }
        }
      }
    }
  }
};
````

The test

```javascript
const hooks = require('../src/hooks');
const populate = hooks.populate;

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
  
  populate(populations.favorites)(hook)
    .then(results => {
      console.log('\n----- result -------------------------------------------------');
      console.log(util.inspect(hook.data, { depth: 8, colors: true }));
    });
};
```

The test results

```text
For hook.data
which is an array

populate array element 0

  populate with child include: post
  posts.find({ query: { id: 1 } })
  1 results found
  asArray=undefined, so convert 1 elem array to object. 
  store results in parent prop: post
  populate the single item

    populate with child include: author
    users.find({ query: { id: 'as61389dadhga62343hads6712' } })
    1 results found
    asArray=undefined, so convert 1 elem array to object. 
    store results in parent prop: author

    populate with child include: comment
    evaluate 'select' function
    comments.find({ query: 
   { '$limit': 5,
     '$select': [ 'title', 'content', 'postId' ],
     '$sort': { createdAt: -1 },
     postId: 1,
     something: { '$exists': false } } })
    2 results found
    store results in parent prop: comments

    populate with child include: readers
    parent field is an array. match any value in it.
    users.find({ query: { id: { '$in': [ 'as61389dadhga62343hads6712', '167asdf3689348sdad7312131s' ] } } })
    2 results found
    store results in parent prop: readers

populate array element 1

  populate with child include: post
  posts.find({ query: { id: 2 } })
  1 results found
  asArray=undefined, so convert 1 elem array to object. 
  store results in parent prop: post
  populate the single item

    populate with child include: author
    users.find({ query: { id: '167asdf3689348sdad7312131s' } })
    1 results found
    asArray=undefined, so convert 1 elem array to object. 
    store results in parent prop: author

    populate with child include: comment
    evaluate 'select' function
    comments.find({ query: 
   { '$limit': 5,
     '$select': [ 'title', 'content', 'postId' ],
     '$sort': { createdAt: -1 },
     postId: 2,
     something: { '$exists': false } } })
    1 results found
    store results in parent prop: comments

    populate with child include: readers
    parent field is an array. match any value in it.
    users.find({ query: { id: { '$in': [ 'as61389dadhga62343hads6712', '167asdf3689348sdad7312131s' ] } } })
    2 results found
    store results in parent prop: readers

populate array element 2

  populate with child include: post
  posts.find({ query: { id: 1 } })
  1 results found
  asArray=undefined, so convert 1 elem array to object. 
  store results in parent prop: post
  populate the single item

    populate with child include: author
    users.find({ query: { id: 'as61389dadhga62343hads6712' } })
    1 results found
    asArray=undefined, so convert 1 elem array to object. 
    store results in parent prop: author

    populate with child include: comment
    evaluate 'select' function
    comments.find({ query: 
   { '$limit': 5,
     '$select': [ 'title', 'content', 'postId' ],
     '$sort': { createdAt: -1 },
     postId: 1,
     something: { '$exists': false } } })
    2 results found
    store results in parent prop: comments

    populate with child include: readers
    parent field is an array. match any value in it.
    users.find({ query: { id: { '$in': [ 'as61389dadhga62343hads6712', '167asdf3689348sdad7312131s' ] } } })
    2 results found
    store results in parent prop: readers

----- result -------------------------------------------------
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

```

## License

Copyright (c) 2016

Licensed under the [MIT license](LICENSE).
