
const util = require('util');
const hooks = require('../src/hooks');

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
    //only: 'a.b.c',
    exclude: ['userId', 'postId'],
    computed: {
      commentCount: (favorite, hook) => {
        return favorite.post.comments.length;
      }
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
        exclude: ['postId', '_id']
      },
    },
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
