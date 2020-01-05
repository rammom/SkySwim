const express = require('express');
const router = express.Router();
const Post = require('../models/post-model');
const User = require('../models/user-model');
const Follow = require('../models/follow-model');
const Feed = require('../models/feed-model');
const s3 = require('../services/s3-setup');
const Errors = require('../services/Errors');
const safe = require('safe-regex');

// Get and AWS.S3 presigned PUT url, allowing you to upload directly to the s3 bucket
router.get('/s3-signed-url', async (req, res, next) => {
	const contentType = req.query.contentType.toLowerCase();
	let error = null;

	// validate request body
	if (!contentType || !(contentType.startsWith("image/") || contentType.startsWith("video/")))
		return next(new Errors.ValidationError("invalid request"));

	const fileName = Date.now().toString() + '.' + contentType.split('/').pop();
	
	let url = null;
	await s3.getSignedUrl(fileName, contentType)
		.then(u => url = u)
		.catch(e => error = e);
	
	if (error)
		return next(error);

	// return signed url to client for direct upload
	res.status(200).json({
		signedUrl: url,
		bucketName: process.env.SS_AWS_BUCKET,
		fileName: fileName
	})

});



//Get list of 10 users based on matching search terms
router.get('/users', async (req, res, next) => {
	const text = req.query.text;
	let error = null;

	// validate request
	if (!text || !safe(text))
		return next(new Errors.ValidationError('invalid request'));

	// search for matching users, slow
	let users = null;
	await User.find({ username: { $regex: "^"+text, $options: 'i' } })
		.select('_id username picture')
		.limit(10)
		.then(u => users = u)
		.catch(e => error = e);

	if (error)
		return next(error);

	res.status(200).json({ users });
});

// Get paginated posts for user (fan out on read is slow, hopefully this won't happen much)
router.get('/post/user', async (req, res, next) => {
	const page = parseInt(req.query.page);
	const user = req.query.user;

	let error = null;

	// validate request
	if (!page || page < 1 || !user)
		return next(new Errors.ValidationError('invalid request'));

	// find recent posts from user profile
	let posts = null;
	await Post.find({ "user.id": user })
		.sort({ created: -1 })
		.skip(parseInt(process.env.SS_FEED_CACHE_LIMIT) * (page - 1))		// offset to correct batch
		.limit(parseInt(process.env.SS_FEED_CACHE_LIMIT))
		.then(ps => posts = ps)
		.catch(err => error = err);

	if (error)
		return next(error);

	return res.status(200).json({posts});
});

// Get paginated posts for newsfeed (fan out on read is slow, hopefully this won't happen much)
router.get('/post/feed', async (req, res, next) => {
	const page = parseInt(req.query.page);
	let error = null;
	let posts = null;
	
	// validate request
	if (!page || page < 1)
	return next(Errors.ValidationError('invalid request'));

	// if page = 1, look for cached feed
	if (page == 1) {
		let feed = null;

		await Feed.findOne({ user: req.user._id })
			.populate('posts')
			.then(f => feed = f)
			.catch(e => error = e);

		if (error)
			return next(error);

		// check length of user feed, if it is very short, invalidate it
		// probably would need to better optimize this
		if (feed.posts.length  < process.env.SS_FEED_CACHE_LIMIT / 3) {
			await feed.remove()
				.catch(e => error = e);

			// don't throw the error here in order to complete request
			if (error) 
				console.log(error);
			
			feed = null;
		};

		if (feed) {
			// get posts
			console.log('cached feed read.');
			posts = feed.posts;
			return res.status(200).json({ posts });
		}

	}

	// fan out read all following user's posts

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

	// find corresponding posts
	await Post.find({ "user.id": { $in: followers } })
		.sort({ created: -1 })
		.skip(parseInt(process.env.SS_FEED_CACHE_LIMIT) * (page - 1))		// offset to correct batch
		.limit(parseInt(process.env.SS_FEED_CACHE_LIMIT))
		.then(p => posts = p)
		.catch(e => error = e);

	if (error)
		return next(error)

	// cache new user feed
	await new Feed({
		user: req.user._id,
		posts: posts
	})
		.save()
		.then(f => feed = f)
		.catch(e => error = e);

	if (error)
		return next(error);

	console.log('fan out feed read.');
	return res.status(200).json({ posts });

});

// Creates a post
router.post('/post', async (req, res, next) => {
	const type = req.body.type;
	const blurb = req.body.blurb;
	const media = req.body.media;
	let error = null;

	// validate request body
	if (!type ||
		!['blurb', 'image', 'video'].includes(type) ||
		!blurb ||
		(type == 'image' && media == null) ||
		(type == 'video' && media == null))
		return next(new Errors.ValidationError('invalid request'))

	// create new post
	let newPost = null;
	await new Post({
		type,
		blurb,
		media,
		user: {
			id: req.user._id,
			username: req.user.username,
			picture: req.user.picture
		}
	})
		.save()
		.then(p => newPost = p)
		.catch(e => error = e);

	if (error)
		return next(error);

	let feedLimit = parseInt(process.env.SS_FEED_CACHE_LIMIT)

	// add to user's feed
	await Feed.findOneAndUpdate({ user: req.user._id }, { $push: { posts: { $each: [newPost], $position: 0, $slice: feedLimit } } }).exec();

	// fan out to followers with cached feeds, don't await to not block
	Follow.find({ user: req.user._id })
		.then(follows => {
			// send out update for each follower
			follows.forEach(relation => {
				// what happens if this fails?
				// TODO: add job queue?
				Feed.findOneAndUpdate({ user: relation.follower }, { $push: { posts: { $each: [newPost], $position: 0, $slice: feedLimit } }}).exec();
			})
		});

	return res.status(200).json(newPost);
});

// Remove a post
router.delete('/post', async (req, res, next) => {
	const postId = req.body.post;
	let error = null;

	// validate request body
	if (!postId)
		return next(new Errors.ValidationError('invalid request'))

	// check post belongs to user
	let post = null
	await Post.findOne({ _id: postId, "user.id": req.user._id })
		.then(p => post = p)
		.catch(e => error = e);
	
	if (error)
		return next(error);
	if (!post)
		return next(new Errors.ValidationError('invalid request'))

	// remove any media uploaded by post
	if (post.media) {
		const fileName = post.media.split('/').pop();

		await s3.deleteObject(fileName)
			.catch(e => error = e);

		if (error)
			return next(error);
	}

	// remove post
	await post.remove()
		.catch(e => error = e);
	
	if (error)
		return next(error);

	// update user's feed
	Feed.findOneAndUpdate({ user: req.user._id }, { $pull: { posts: postId } }).exec();

	// fan out to followers with cached feeds, don't await to not block
	Follow.find({ user: req.user._id })
		.then(follows => {
			// send out update for each follower
			follows.forEach(relation => {
				// what happens if this fails?
				// TODO: add job queue?
				Feed.findOneAndUpdate({ user: relation.follower }, { $pull: { posts: postId } }).exec();
			})
		});

	return res.status(200).json({});
});

// Invalidate user's feed
router.delete('/feed', async (req, res, next) => {
	let error = null;

	// invalidate user's feed
	await Feed.findOneAndDelete({ user: req.user._id })
		.exec()
		.catch(e => error = e);

	if (error)
		return next(error);

	return res.status(200).json({});
})

// Follow a user
router.post('/follow', async (req, res, next) => {
	const user = req.body.user;
	const follower = req.user._id;
	let error = null;

	// validate request
	if (!user)
		return Errors.ValidationError('invalid request');

	// check if relationship already exists
	let follow = null;
	await Follow.findOne({ user, follower })
		.then(f => follow = f)
		.catch(e => error = e);

	if (follow)
		return next(Errors.ValidationError('invalid request'));
	if (error)
		return next(error);

	// create a follow relationship
	await new Follow({ user, follower })
		.save()
		.then(f => follow = f)
		.catch(e => error = e);

	if (error)
		return next(error);

	// invalidate user feed
	await Feed.findOneAndRemove({ user: req.user._id })
		.exec()
		.catch(e => error = e);

	if (error)
		return next(error);

	return res.status(200).json(follow);
});


// Unfollow a user
router.post('/unfollow', async (req, res, next) => {
	const user = req.body.user;
	const follower = req.user._id;
	let error = null;

	// validate request
	if (!user)
		return Errors.ValidationError('invalid request');

	// delete relationship
	await Follow.findOneAndDelete({ user, follower })
		.catch(e => error = e);

	if (error)
		return next(error);

	return res.status(200).json({});
});

module.exports = router;