const express = require('express');
const router = express.Router();
const Post = require('../models/post-model');
const User = require('../models/user-model');

// publish a new blurb
router.post('/publish-blurb', (req, res) => {
	if (!req.body.blurb) {
		res.status(400).send('400 bad request');
	}

	new Post({
		type: 'blurb',
		blurb: req.body.blurb,
		user: req.user._id
	}).save().then(newPost => {
		console.log('new post created: ' + newPost);
		User.findById(req.user._id)
			.then(user => {
				user.posts.push(newPost._id);
				user.save();
			})
			.finally( () => {
				res.redirect('/u/home');
			})
	});

});

// publish a new image
router.post('/publish-image', (req, res) => {
	if (!req.body.image) {
		res.status(400).send('400 bad request');
	}
	console.log(req.body);
	// new Post({
	// 	type: 'image',
	// 	blurb: req.body.blurb,
	// 	image: req.body.image,
	// 	user: req.user._id
	// }).save().then(newPost => {
	// 	console.log('new post created: ' + newPost);
	// 	User.findById(req.user._id)
	// 		.then(user => {
	// 			user.posts.push(newPost._id);
	// 			user.save();
	// 		})
	// 		.finally(() => {
	// 			res.redirect('/u/home');
	// 		})
	// });

});

module.exports = router;