const express = require('express');
const router = express.Router();
const User = require('../models/user-model');

router.get('/home', (req, res) => {
	User.findById(req.user._id)
		.populate('posts')
		.then(user => {
			if (!user) {
				// throw error
			}
			user.posts = user.posts.sort((a, b) => b.createdAt - a.createdAt);
			res.render('home', { user });
		});
});

module.exports = router;
