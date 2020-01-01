const express = require('express');
const router = express.Router();
const passport = require('passport');

// Logout current authenticated user
router.get('/logout', (req, res) => {
	// handle with passport
	req.logout();
	res.redirect('/');
});

// Authenticate using Google OAuth2
router.get('/google', passport.authenticate('google', {
	scope: ['profile']
}));

// Redirect URI given hit by google after authentication
router.get('/google/redirect', passport.authenticate('google'), (req, res) => {
	res.redirect('/u/home');
})

// Authenticate using Facebook OAuth2
router.get('/facebook', passport.authenticate('facebook', {
	scope: ['email', 'public_profile']
}));

// Redirect URI given hit by facebook after authentication
router.get('/facebook/redirect', passport.authenticate('facebook'), (req, res) => {
	res.redirect('/u/home');
})

module.exports = router;
