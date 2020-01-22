const User = require('../models/user-model');
const Post = require('../models/post-model');
const Follow = require('../models/follow-model');
const Feed = require('../models/feed-model');

/*
  /u/home
  Render the authenticated user's home page
*/
exports.renderHome = async (req, res, next) => {
	return res.render('home', {user: req.user});
};

/*
  /u/users
  Render the users page with all stored users
*/
exports.renderUsers = async (req, res, next) => {
	let error = null;

	// get all users
	let users = await User.find()
		.catch(error_ => {
      error = error_;
    });

	if (error) {
		return next(error);
  }

	res.render('users', {user: req.user, users: users});
};

/*
  /:profileId
  Find user profile by profileId and render profile page with follow information
*/
exports.renderProfileByProfileId = async (req, res, next) => {
	let error = null;
  let user = req.user;

  // find user
	let profile = await User.findById(req.params.profileId)
		.catch(error_ => {
      error_ = error;
    });

	if (!profile) {
    // No user
    return res.redirect('/u/home');
  }

	if (error) {
    return next(error);
  }

	// check follow status between users, fast because of index
	let following = await Follow.findOne({user: profile._id, follower: user._id})
		.catch(error_ => {
      error = error_;
		}) != null;

	if (error) {
		return next(error);
  }

	// get followers and followees
	// TODO: move this to API ?
	let followers = await Follow.find({user: profile._id})
		.populate('follower')
		.catch(error_ => {
      error = error_;
    });

	if (error) {
		return next(error);
  }

	let followees = await Follow.find({follower: profile._id})
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
}
