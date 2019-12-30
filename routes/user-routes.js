const express = require('express');
const router = express.Router();
const User = require('../models/user-model');
const Errors = require('../services/Errors');

router.get('/home', (req, res, next) => {
	User.findById(req.user._id)
		.populate('posts')
		.then(user => {
			if (!user) next(new Errors.ValidationError({message: 'no matching user. this should not happen.'}));
			user.posts = user.posts.sort((a, b) => b.createdAt - a.createdAt);
			res.render('home', { user });
		});
});

router.get('/:profileId', (req, res, next) => {
	User.findById(req.params.profileId)
		.populate('posts')
		.then(profile => {
			if (!profile) next(new Errors.ValidationError('no user'));
			profile.posts = profile.posts.sort((a, b) => b.createdAt - a.createdAt);
			res.render('profile', { 
				user: req.user,
				profile: profile
			});
		});
})

module.exports = router;
