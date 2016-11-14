'use strict';

const app = require('./app');
const loadDbs = require('./loadDbs');
const test = require('../test/populate.test');

loadDbs(app)
  .then(() => {
    test(app);
  });
