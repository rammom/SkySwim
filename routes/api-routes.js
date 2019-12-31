const express = require('express');
const router = express.Router();
const apiController = require('../controllers/api-controller');

router.get('/s3-signed-url', apiController.getS3SignedUrl);
router.get('/users', apiController.getUsers);

router.post('/post', apiController.createPost);
router.post('/follow', apiController.follow);
router.post('/unfollow', apiController.unfollow);

module.exports = router;