const express = require('express');
const router = express.Router();
const Post = require('../models/post-model');
const User = require('../models/user-model');
const AWS = require('aws-sdk');
const Errors = require('../services/Errors');

// publish a new blurb
router.post('/post-blurb', (req, res, next) => {
	if (!req.body.blurb) return next(new Errors.ValidationError('blurb cannot be empty'));

	new Post({
		type: 'blurb',
		blurb: req.body.blurb,
		user: req.user._id
	})
	.save()
	.then(newPost => {
		console.log('new post created: ' + newPost);
		User.findById(req.user._id)
			.then(user => {
				user.posts.push(newPost._id);
				user.save()
				.then(res.redirect('/u/home'))
				.catch(err => {
					// could not complete request, remove post from db
					newPost.remove()
					.catch(err => {
						console.log("FAILED to remove unlinked post -> " + newPost._id + "\n" + err);
					})
					next(err);
				});
			})
			.catch(err => {
				// could not complete request, remove post from db
				newPost.remove()
				.catch(err => {
					console.log("FAILED to remove unlinked post -> " + newPost._id + "\n" + err);
				})
				next(err);
			})
	})
	.catch(err => {
		next(err);
	});

});


// Get AWS signed url in order to upload image to s3 directly from the client 
router.get('/s3-signed-url', (req, res, next) => {
	const contentType = req.query.contentType.toLowerCase();
	if (!contentType) return next(new Errors.ValidationError('content-type required'));
	if (!(contentType.startsWith("image/") || contentType.startsWith("video/"))) return next(new Errors.ValidationError("invalid content-type"));
	const fileName = Date.now().toString() + '.' + contentType.split('/').pop();
	const params = {
		Bucket: process.env.SS_AWS_BUCKET,
		Expires: 30 * 60, // 30 minutes
		Key: fileName,
		ContentType: contentType,
	};
	const options = {
		accessKeyId: process.env.SS_AWS_ID,
		secretAccessKey: process.env.SS_AWS_SECRET,
		signatureVersion: 'v4'
	}
	const s3 = new AWS.S3(options);
	s3.getSignedUrl('putObject', params, (err, data) => {
		if (err) next(err);
		res.status(200).json({
			signedUrl: data,
			bucketName: process.env.SS_AWS_BUCKET,
			fileName: fileName
		})
	});

});

// publish an image or video 
router.post('/post-file', (req, res, next) => {
	const type = req.body.type;
	const blurb = req.body.blurb;
	const image = (req.body.type == 'image') ? req.body.url : null;
	const video = (req.body.type == 'video') ? req.body.url : null;
	const user = req.user._id;

	if ( !(type == 'image' || type == 'video') || !req.body.url	|| !blurb){
		return next(new Errors.ValidationError('bad request'));
	}

	new Post({
		type,
		blurb,
		image,
		video,
		user
	})
	.save()
	.then(newPost => {
		console.log('new post created: ' + newPost);
		User.findById(req.user._id)
			.then(user => {
				user.posts.push(newPost._id);
				user.save()
				.then(res.redirect('/u/home'))
				.catch(err => { 

					// could not complete request, remove post from db
					newPost.remove()
					.catch(err => {
						console.log("FAILED to remove unlinked post -> "+newPost._id+"\n"+err);
					})

					next(err) 
				});
			})
			.catch(err => {

				// could not complete request, remove post from db
				newPost.remove()
				.catch(err => {
					console.log("FAILED to remove unlinked post -> " + newPost._id + "\n" + err);
				})

				return next(err);
			})
	})
	.catch(err => {
		return next(err);
	});
});


module.exports = router;