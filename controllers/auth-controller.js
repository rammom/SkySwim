const passport = require('passport');

/*
  /auth/Logout
  Logout current authenticated user
*/
exports.logout = (req, res, next) => {
	req.logout();
	res.redirect('/');
}

/*
  /auth/google
  Authenticate using Google OAuth2
*/
exports.authenticateWithGoogle = passport.authenticate('google', {scope: ['profile']});

/*
  /auth/facebook
  Authenticate using Facebook OAuth2
*/
exports.authenticateWithFacebook = passport.authenticate('facebook', {scope: ['email', 'public_profile']});

/*
  Redirect user to homepage
*/
exports.redirectToHome = (req, res, next) => {
  res.redirect('/u/home');
}
