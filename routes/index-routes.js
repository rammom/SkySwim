const express = require('express');
const router = new express.Router();
const indexController = require('../controllers/index-controller');

router.get('/', indexController.renderLanding);

module.exports = router;
