const express = require('express');
const router = express.Router();

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
router.get('/users', async (req, res, next) => {
	const text = req.query.text;
	let error = null;

	// validate request
	if (!text)
		return next(new Errors.ValidationError('invalid request'));

	// search for matching users, slow
	let users = null;
	await User.find({ username: { $regex: text, $options: 'i' } })
		.select('_id username picture')
		.limit(10)
		.then(u => users = u)
		.catch(e => error = e);

	if (error)
		return next(error);

	res.status(200).json({ users });
});

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
	}).save()
		.then(p => newPost = p)
		.catch(e => error = e);

	if (error)
		return next(error);

	return res.status(200).json(newPost);
});
router.post('/follow', async (req, res, next) => {
	const user = req.body.user;
	const followee = req.user._id;
	let error = null;

	// validate request
	if (!user)
		return Errors.ValidationError('invalid request');

	// check if relationship already exists
	let fee = null;
	await Followee.findOne({ user, followee })
		.then(f => fee = f)
		.catch(e => error = e);

	if (fee)
		return next(Errors.ValidationError('invalid request'));
	if (error)
		return next(error);

	// create a followee relationship
	console.log('mending')
	await new Followee({ user, followee })
		.save()
		.then(f => fee = f)
		.catch(e => error = e);

	if (error)
		return next(error);

	console.log("returning: " + fee)
	return res.status(200).json(fee);
});

router.post('/unfollow', async (req, res, next) => {
	const user = req.body.user;
	const followee = req.user._id;
	let error = null;

	// validate request
	if (!user)
		return Errors.ValidationError('invalid request');

	// delete relationship
	await Followee.findOneAndDelete({ user, followee })
		.catch(e => error = e);

	if (error)
		return next(error);

	return res.status(200).json();
});

module.exports = router;