var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;
const helpers = require('../helpers/util')
var path = require('path');

module.exports = function (db) {

  // router.get('/', function (req, res, next) {
  //   res.render('index', { info: req.flash('info'), success: req.flash('success')})
  // });

  router.post('/', function (req, res, next) {
    
  });

  router.get('/', async function (req, res, next) {
    res.render('index')
  });

  return router;
}
