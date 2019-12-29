const express = require('express');
const router = express.Router();
const Post = require('../models/post-model');
const User = require('../models/user-model');
const multer = require('multer')
const upload = require('../services/multer-setup');
const AWS = require('aws-sdk');
const fs = require('fs');
const Errors = require('../services/Errors');
const { wrapAsync } = require('../services/utilities');

// publish a new blurb
router.post('/publish-blurb', (req, res, next) => {
	if (!req.body.blurb) throw new Errors.ValidationError({message: 'blurb cannot be empty'});

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
				user.save().catch(err => {
					next(err);
				});
			})
			.catch(err => {
				next(err);
			})
			.finally(res.redirect('/u/home'));
	})
	.catch(err => {
		next(err);
	});

});

router.get('/signed-form-upload', async (req, res, next) => {
	const params = {
		Bucket: process.env.SS_AWS_BUCKET,
		Fields: {
			key: Date.now().toString(),
		}
	};

	s3.createPresignedPost(params, (err, data) => {
		res.json(data);
	});
});

router.get('/s3-signed-url', (req, res, next) => {
	const contentType = req.query.contentType.toLowerCase();
	if (!contentType) return next(new Errors.ValidationError('content-type required'));
	if (!(contentType.startsWith("image/") || contentType.startsWith("video/"))) return next(new Errors.ValidationError("invalid content-type"));
	const params = {
		Bucket: process.env.SS_AWS_BUCKET,
		Expires: 30 * 60, // 30 minutes
		Key: Date.now().toString()+'.'+contentType.split('/').pop(),
		ContentType: contentType,
	};
	console.log(contentType.split('/').pop());
	const options = {
		accessKeyId: process.env.SS_AWS_ID,
		secretAccessKey: process.env.SS_AWS_SECRET,
		signatureVersion: 'v4'
	}
	const s3 = new AWS.S3(options);
	s3.getSignedUrl('putObject', params, (err, data) => {
		if (err) next(err);
		console.log(data);
		res.status(200).json({
			signedUrl: data
		})
	});

});

router.post('/post', (req, res, next) => {
	console.log('/api/post');
	const type = req.body.type;
	const blurb = req.body.blurb;
	const image = (req.body.type == 'image') ? req.body.url : null;
	const video = (req.body.type == 'video') ? req.body.url : null;
	const user = req.user._id;

	console.log(req.body);
	if (type != 'image' || type != 'video' || !req.body.url	|| !blurb){
		console.log('validation failed');
		return next(Errors.ValidationError('bad request'));
	}
	console.log('validation passed');

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
				user.save().catch(err => { next(err) });
			})
			.catch(err => {
				return next(err);
			})
			.finally(() => {
				res.redirect('/u/home');
			})
	})
	.catch(err => {
		return next(err);
	});
});

// publish a new image
router.post('/publish-file', upload.single('file'), (req, res, next) => {

	const fileContent = fs.readFileSync(req.file.path);

	// Setting up S3 upload parameters
	const params = {
		Bucket: process.env.SS_AWS_BUCKET,
		Key: req.file.filename,
		Body: fileContent
	};

	const s3 = new AWS.S3();

	// Uploading files to the bucket
	s3.upload(params, function (err, data) {
		if (err) next(err);
		console.log(`File uploaded successfully. ${data.Location}`);
		fs.unlink(req.file.path, err => {
			if (err) next(err);
			new Post({
				type: req.body.type,
				blurb: req.body.blurb,
				image: (req.body.type == 'image') ? data.Location : null,
				video: (req.body.type == 'video') ? data.Location : null,
				user: req.user._id
			})
			.save()
			.then(newPost => {
				console.log('new post created: ' + newPost);
				User.findById(req.user._id)
					.then(user => {
						user.posts.push(newPost._id);
						user.save().catch(err => {next(err)});
					})
					.catch(err => {
						next(err);
					})
					.finally(() => {
						res.redirect('/u/home');
					})
			})
			.catch(err => {
				next(err);
			});
		});
	});

	

});

module.exports = router;