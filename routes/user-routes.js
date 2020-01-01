const express = require('express');
const router = express.Router();
const User = require('../models/user-model');
const Post = require('../models/post-model');
const Follow = require('../models/follow-model');

// gets user's posts temporarily
// TODO: make this get user's newsfeed
// go to user newsfeed
router.get('/home', async (req, res, next) => {
	let error = null;

	// find people the user is following
	let followers = [];
	await Follow.find({ follower: req.user })
		.then(f => followers = f)
		.catch(e => error = e);
	
	if (error) 
		return next(error);

	// map to followee ids and add user's id
	followers = followers.map(f => f.user);
	followers.push(req.user._id);

	console.log(followers);

	// find user's follower's recent posts
	let posts = null;
	await Post.find({ "user.id": { $in: followers } })
		.sort({ created: -1 })
		.limit(30)
		.then(p => posts = p)
		.catch(e => error = e);

	if (error)
		return next(error)

	res.render('home', { user: req.user, posts: posts });
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

	// find recent posts from user profile
	let posts = null;
	await Post.find({ "user.id": profile._id })
		.sort({ created: -1 })
		.limit(10)
		.then(ps => posts = ps)
		.catch(err => error = err);

	if (error)
		return next(error);

	// check follow status between users, fast because of index
	let following = false;
	await Follow.findOne({ user: profile._id, follower: req.user._id })
		.then(f => {
			if (f) return following = true;
		})
		.catch(err => error = err);
	
	if (error)
		return next(error);

	// get followers and followees
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
		posts, 
		following, 
		followers,
		followees
	});
})

module.exports = router;
