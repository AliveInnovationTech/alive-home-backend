"use strict";

const router = require("express").Router();
 /* GET home page. */
router.get('/', function(req, res, next) {
  return res.status(200).json({ 
    message: 'Alive Home Backend API',
    version: '1.0.0',
    status: 'running'
  });
});

module.exports = router;