"use strict";

const router = require("express").Router();
 /* GET home page. */
router.get('/', function(req, res, next) {
  return res.status(200).render('index', { title: 'User Service' });
});

module.exports = router;