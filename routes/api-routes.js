const express = require('express');
const router = new express.Router();
const apiController = require('../controllers/api-controller');

router.get('/s3-signed-url', apiController.askAWSForPresignedPutUrl);
router.get('/users', apiController.getUsersFromSearchTerm);
router.get('/post/user', apiController.getUserPostsPaginated);
router.get('/post/feed', apiController.getUserFeedPaginated);

router.post('/post', apiController.createPost);
router.post('/follow', apiController.followUser);
router.post('/unfollow', apiController.unfollowUser);

router.delete('/post', apiController.deletePost);
router.delete('/feed', apiController.invalidateFeed);

module.exports = router;
