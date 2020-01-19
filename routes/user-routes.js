const express = require('express');
const router = express.Router();
const User = require('../models/user-model');
const Post = require('../models/post-model');
const Follow = require('../models/follow-model');
const Feed = require('../models/feed-model');

// gets user's posts temporarily
// TODO: make this get user's newsfeed
// render user newsfeed
router.get('/home', async (req, res, next) => {
	return res.render('home', { user: req.user });
});

router.get('/users', async (req, res, next) => {
	let error = null;
	let users = null;

	// get all users
	await User.find()
		.then(u => users = u)
		.catch(e => error = e);

	if (error)
		return next(error);

	res.render('users', { user: req.user, users: users })
});

// render user profile
router.get('/:profileId', async (req, res, next) => {
	let error = null;

	// find user profile
	let profile = null;
	await User.findById(req.params.profileId)
		.then(p => profile = p)
		.catch(err => error = err);

	// check if user exists, otherwise go home
	if (!profile)
		return res.redirect('/u/home');
	if (error)
		return next(error);

	// check follow status between users, fast because of index
	let following = false;
	await Follow.findOne({ user: profile._id, follower: req.user._id })
		.then(f => following = (f != null))
		.catch(e => error = e);

	console.log(following);

	if (error)
		return next(error);

	// get followers and followees
	// TODO: move this to API ?
	let followers = null;
	await Follow.find({ user: profile._id })
		.populate('follower')
		.then(f => followers = f)
		.catch(e => error = e);

	if (error)
		return next(error);

	let followees = null;
	await Follow.find({ follower: profile._id })
		.populate('user')
		.then(f => followees = f)
		.catch(e => error = e);

	if (error)
		return next(error);

	res.render('profile', {
		user: req.user,
		profile,
		following,
		followers,
		followees
	});
});

module.exports = router;
