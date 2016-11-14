'use strict';
const favorites = require('./favorites');
const posts = require('./posts');
const comments = require('./comments');
const authentication = require('./authentication');
const user = require('./user');

module.exports = function() {
  const app = this;


  app.configure(authentication);
  app.configure(user);
  app.configure(comments);
  app.configure(posts);
  app.configure(favorites);
};
