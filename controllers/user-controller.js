const User = require('../models/user-model');
const Follow = require('../models/follow-model');

/*
  /u/home
  Render the authenticated user's home page
*/
exports.renderHome = async (req, res, _) => {
	return res.render('home', {user: req.user});
};

/*
  /u/users
  Render the users page with all stored users
*/
exports.renderUsers = async (req, res, next) => {
	let error = null;

	// Get all users
	const users = await User.find()
		.catch(error_ => {
			error = error_;
		});

	if (error) {
		return next(error);
	}

	res.render('users', {user: req.user, users});
};

/*
  /:profileId
  Find user profile by profileId and render profile page with follow information
*/
exports.renderProfileByProfileId = async (req, res, next) => {
	let error = null;
	const {user} = req;

	// Find user
	const profile = await User.findById(req.params.profileId)
		.catch(error_ => {
			error = error_;
		});

	if (!profile) {
		// No user
		return res.redirect('/u/home');
	}

	if (error) {
		return next(error);
	}

	// Check follow status between users, fast because of index
	const following = await Follow.findOne({user: profile._id, follower: user._id})
		.catch(error_ => {
			error = error_;
		}) !== null;

	if (error) {
		return next(error);
	}

	// Get followers and followees
	// TODO: move this to API ?
	const followers = await Follow.find({user: profile._id})
		.populate('follower')
		.catch(error_ => {
			error = error_;
		});

	if (error) {
		return next(error);
	}

	const followees = await Follow.find({follower: profile._id})
		.populate('user')
		.catch(error_ => {
			error = error_;
		});

	if (error) {
		return next(error);
	}

	res.render('profile', {
		user,
		profile,
		following,
		followers,
		followees
	});
};
