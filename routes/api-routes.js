const express = require('express');
const router = express.Router();
const Post = require('../models/post-model');
const User = require('../models/user-model');
const multer = require('multer')
const upload = require('../services/multer-setup');
const AWS = require('aws-sdk');
const s3 = require('../services/aws-setup');
const fs = require('fs');

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
router.post('/publish-file', upload.single('file'), (req, res) => {

	const fileContent = fs.readFileSync(req.file.path);

	// Setting up S3 upload parameters
	const params = {
		Bucket: process.env.SS_AWS_BUCKET,
		Key: req.file.filename,
		Body: fileContent
	};

	// Uploading files to the bucket
	s3.upload(params, function (err, data) {
		if (err) {
			throw err;
		}
		console.log(`File uploaded successfully. ${data.Location}`);
		fs.unlink(req.file.path, err => {
			new Post({
				type: req.body.type,
				blurb: req.body.blurb,
				image: (req.body.type == 'image') ? data.Location : null,
				video: (req.body.type == 'video') ? data.Location : null,
				user: req.user._id
			}).save().then(newPost => {
				console.log('new post created: ' + newPost);
				User.findById(req.user._id)
					.then(user => {
						user.posts.push(newPost._id);
						user.save();
					})
					.finally(() => {
						res.redirect('/u/home');
					})
			});
		});
	});

	

});

module.exports = router;