const express = require('express');
const router = new express.Router();
const userController = require('../controllers/user-controller');

router.get('/home', userController.renderHome);
router.get('/users', userController.renderUsers);
router.get('/:profileId', userController.renderProfileByProfileId);

module.exports = router;
