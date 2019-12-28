const express = require('express');
const router = express.Router();
const User = require('../models/user-model');
const Errors = require('../services/Errors');

router.get('/home', (req, res) => {
	User.findById(req.user._id)
		.populate('posts')
		.then(user => {
			if (!user) throw new Errors.ValidationError({message: 'no matching user. this should not happen.'});
			user.posts = user.posts.sort((a, b) => b.createdAt - a.createdAt);
			res.render('home', { user });
		});
});

module.exports = router;
