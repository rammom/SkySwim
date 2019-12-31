const express = require('express');
const router = express.Router();
const passport = require('passport');

// auth logout
router.get('/logout', (req, res) => {
	// handle with passport
	req.logout();
	res.redirect('/');
});

// auth with google
router.get('/google', passport.authenticate('google', {
	scope: ['profile']
}));

// google oauth callback route
router.get('/google/redirect', passport.authenticate('google'), (req, res) => {
	res.redirect('/u/home');
})

// auth with facebook
router.get('/facebook', passport.authenticate('facebook', {
	scope: ['email', 'public_profile']
}));

// facebook oauth callback route
router.get('/facebook/redirect', passport.authenticate('facebook'), (req, res) => {
	res.redirect('/u/home');
})
module.exports = router;
