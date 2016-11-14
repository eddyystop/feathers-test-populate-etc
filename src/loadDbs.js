
module.exports = function (app) {
  const usersDb = [
    {id:'as61389dadhga62343hads6712',name:'Author 1',email: 'author1@posties.com',password:'2347wjkadhad8y7t2eeiudhd98eu2rygr',age:55},
    {id:'167asdf3689348sdad7312131s',name:'Author 2',email:'author2@posties.com',password:'2347wjkadhad8y7t2eeiudhd98eu2rygr',age:16}
  ];
  
  const commentsDb = [
    {
      id: 1,
      postId: 1,
      title: 'Comment 1',
      content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
      author: 'as61389dadhga62343hads6712',
      createdAt: ''
    },
    {
      id: 2,
      postId: 2,
      title: 'Comment 2',
      content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
      author: 'as61389dadhga62343hads6712',
      createdAt: ''
    },
    {
      id: 3,
      postId: 1,
      title: 'Comment 3',
      content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
      author: '167asdf3689348sdad7312131s',
      createdAt: ''
    }
  ];
  
  const postsDb = [
    {
      id: 1,
      title: 'Post 1',
      content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
      author: 'as61389dadhga62343hads6712',
      readers: ['as61389dadhga62343hads6712', '167asdf3689348sdad7312131s'],
      createdAt: ''
    },
    {
      id: 2,
      title: 'Post 2',
      content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, architecto!',
      author: '167asdf3689348sdad7312131s',
      readers: ['as61389dadhga62343hads6712', '167asdf3689348sdad7312131s'],
      createdAt: ''
    }
  ];
  
  const favoritesDb = [
    {
      userId: 'as61389dadhga62343hads6712',
      postId: 1,
      updatedAt: Date.now()
    },
    {
      userId: 'as61389dadhga62343hads6712',
      postId: 2,
      updatedAt: Date.now()
    },
    {
      userId: '167asdf3689348sdad7312131s',
      postId: 1,
      updatedAt: Date.now()
    }
  ];
  
  const users = app.service('users');
  const comments = app.service('comments');
  const posts = app.service('posts');
  const favorites = app.service('favorites');
  
  
  return Promise.all([
    users.remove(null, { _id: { $exists: true }}, { multi: true })
      .then(() => { console.log('users remove done'); })
      .catch(err => { console.log('users remove error', err); })
      .then(() => users.create(usersDb))
      .then(() => { console.log('users create done'); })
      .catch(err => { console.log('user create error'); }),
    
    comments.remove(null, {})
      .then(() => { console.log('comments remove done'); })
      .catch(err => { console.log('comments remove error', err); })
      .then(() => comments.create(commentsDb))
      .then(() => { console.log('comments create done'); })
      .catch(err => { console.log('comments create error', err); }),
    
    
    posts.remove(null, {})
      .then(() => { console.log('posts remove done'); })
      .catch(err => { console.log('posts remove error', err); })
      .then(() => posts.create(postsDb))
      .then(() => { console.log('posts create done'); })
      .catch(err => { console.log('posts create error', err); }),
    
    favorites.remove(null, {})
      .then(() => { console.log('favorites remove done'); })
      .catch(err => { console.log('favorites remove error', err); })
      .then(() => favorites.create(favoritesDb))
      .then(() => { console.log('favorites create done'); })
      .catch(err => { console.log('favorites create error', err); })
  ])
};
