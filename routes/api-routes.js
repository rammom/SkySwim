const express = require('express');
const router = express.Router();
const Post = require('../models/post-model');
const User = require('../models/user-model');
const AWS = require('aws-sdk');
const Errors = require('../services/Errors');

// publish a new blurb
router.post('/post-blurb', async (req, res, next) => {
	const blurb = req.body.blurb;
	let error = null;

	// validate request body
	if (!req.body.blurb) 
		return next(new Errors.ValidationError('blurb cannot be empty'));

	// find current user
	let user = null;
	await User.findById(req.user._id)
		.then(u => user = u)
		.catch(err => error = err);

	if (!user)
		return next(new Errors.ServerError('failed to find user'));
	if (error)
		return next(error);

	// make post
	let newPost = null;
	await new Post({
		type: 'blurb',
		blurb: blurb,
		user: req.user._id
	}).save()
		.then(np => newPost = np)
		.catch(err => error = err);
	
	if (!newPost)
		return next(new Errors.ServerError('failed to save post'));
	if (error)
		return next(error);

	console.log('new post created: ' + newPost);

	// add post to user
	user.posts.push(newPost._id);
	
	// save updated user to db
	await user.save()
		.then(u => user = u)
		.catch(err => error = err);
	
	if (error) {
		// process failed. backtrack changes
		await newPost.remove()
			.catch(err => {
				// Ideally this job would be added to a queue, to be completed once the server is fixed
				console.log("FAILED to remove unlinked post -> " + newPost._id + "\n" + err);
			})
		next(error);
	}

	return res.redirect('/u/home');

});

// publish an image or video 
router.post('/post-file', async (req, res, next) => {
	const type = req.body.type;
	const blurb = req.body.blurb;
	const image = (req.body.type == 'image') ? req.body.url : null;
	const video = (req.body.type == 'video') ? req.body.url : null;
	let error = null;
	
	// validate request body
	if ( !(type == 'image' || type == 'video') || !req.body.url	|| !blurb){
		return next(new Errors.ValidationError('bad request'));
	}
	
	// find current user
	let user = null;
	await User.findById(req.user._id)
		.then(u => user = u)
		.catch(err => error = err);

	if (!user)
		return next(new Errors.ServerError('failed to find user'));
	if (error)
		return next(error);

	// create and save post
	let newPost = null;
	await new Post({
		type,
		blurb,
		image,
		video,
		user: req.user._id
	})
	.save()
	.then(np => newPost = np)
	.catch(err => error = err);
	
	if (error)
		return next(error);
	
	console.log('new post created: ' + newPost);

	// add post to user
	user.posts.push(newPost._id);

	// save user
	await user.save()
		.then(u => user = u)
		.catch(err => error = err);
		
	if (error) {
		// process failed. backtrack changes
		await newPost.remove()
			.catch(err => {
				// Ideally this job would be added to a queue, to be completed once the server is fixed
				console.log("FAILED to remove unlinked post -> " + newPost._id + "\n" + err);
			})
		next(error);
	}

	return res.redirect('/u/home');
		
});

// Get AWS signed url in order to upload image to s3 directly from the client 
router.get('/s3-signed-url', async (req, res, next) => {
	const contentType = req.query.contentType.toLowerCase();

	// validate request body
	if (!contentType || !(contentType.startsWith("image/") || contentType.startsWith("video/")))
		return next(new Errors.ValidationError("invalid content-type"));

	// configure AWS.S3 
	const fileName = Date.now().toString() + '.' + contentType.split('/').pop();
	const params = {
		Bucket: process.env.SS_AWS_BUCKET,
		// Expires: 30 * 60, // 30 minutes
		Key: fileName,
		ContentType: contentType,
	};
	const options = {
		accessKeyId: process.env.SS_AWS_ID,
		secretAccessKey: process.env.SS_AWS_SECRET,
		signatureVersion: 'v4'
	};
	const s3 = new AWS.S3(options);

	// request signed url from s3
	s3.getSignedUrl('putObject', params, (err, data) => {
		if (err) next(err);

		// return signed url to client for direct upload
		res.status(200).json({
			signedUrl: data,
			bucketName: process.env.SS_AWS_BUCKET,
			fileName: fileName
		})
	});

});

// follow a friend
router.post('/follow', async (req, res, next) => {
	const friendId = req.body.user;
	let error = null;
	
	// validate request body
	if (!friendId | friendId == req.user._id.toString()) 
		return next(new Errors.ValidationError('bad request'));


	// find friend in database
	let friend = null;
	await User.findById(friendId)
		.then(f => friend = f)
		.catch(err => error = err);
	
	if (!friend) 
		return next(new Errors.ValidationError('bad request'));
	if (error) 
		return next(error);
	
	// find user in database
	let user = null;
	await User.findById(req.user._id)
		.then(u => user = u)
		.catch(err => error = err);

	if (!user)
		return next(new Errors.ServerError("can't find logged in user. this should never happen"));
	if (error)
		return next(error);

	// record follow in both documents
	user.following.push(friend._id);
	friend.followers.push(user._id);

	await user.save()
		.then(u => user = u)
		.catch(err => error = err);

	if (error) 
		return next(error);

	await friend.save()
		.then(f => friend = f)
		.catch(err => error = err);

	if (error) {
		// correct the previously saved user
		user.following = user.following.filter((x) => x.toString() != friend._id.toString());

		await user.save()
			.then(u => user = u)
			.catch(err => {
				// in this situation, I would queue this job to be completed once problem is fixed
				console.log("WARNING could not correct user in following error, discrepancies persist\n"+err);
			})

		return next(error);
	}

	return res.status(200).json({
		message: 'ok'
	});
	
});

// unfollow a friend
router.post('/unfollow', async (req, res, next) => {
	console.log('starting unfollow');
	const friendId = req.body.user;
	let error = null;

	// validate request body
	if (!friendId | friendId == req.user._id.toString())
		return next(new Errors.ValidationError('bad request'));


	// find friend in database
	let friend = null;
	await User.findById(friendId)
		.then(f => friend = f)
		.catch(err => error = err);

	if (!friend)
		return next(new Errors.ValidationError('bad request'));
	if (error)
		return next(error);

	// find user in database
	let user = null;
	await User.findById(req.user._id)
		.then(u => user = u)
		.catch(err => error = err);

	if (!user)
		return next(new Errors.ServerError("can't find logged in user. this should never happen"));
	if (error)
		return next(error);

	// remove follow from both documents
	user.following = user.following.filter(x => x.toString() != friend._id.toString());
	friend.followers = friend.followers.filter(x => x.toString() != user._id.toString());


	await user.save()
		.then(u => user = u)
		.catch(err => error = err);

	if (error)
		return next(error);

	await friend.save()
		.then(f => friend = f)
		.catch(err => error = err);

	console.log('unfollowed')


	if (error) {
		// correct the previously saved user
		user.following.push(friend._id);

		await user.save()
			.then(u => user = u)
			.catch(err => {
				// in this situation, I would queue this job to be completed once problem is fixed
				console.log("WARNING could not correct user in following error, discrepancies persist\n"+err);
			})

		return next(error);
	}

	return res.status(200).json({
		message: 'ok'
	});

});

// find users based on name query
router.post('/search-users', async (req, res, next) => {
	const searchText = req.body.searchText;
	let error = null;

	// validate request body
	if (!searchText)
		return next(new Errors.ValidationError('bad request'));


	// search for matching users
	let users = null;
	await User.find({ username: { $regex: searchText, $options: 'i' }})
		.limit(10)
		.then(us => users = us)
		.catch(err => error = err);

	if (error) 
		return next(error);

	// only send required fields
	users = users.map(user => {
		return {
			_id: user._id,
			username: user.username,
			picture: user.picture
		}
	})

	return res.status(200).json({
		matches: users
	});
});

module.exports = router;