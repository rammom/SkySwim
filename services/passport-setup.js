const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20');
const FacebookStrategy = require('passport-facebook')
const User = require('../models/user-model');

passport.serializeUser((user, done) => {
	done(null, user._id);
})

passport.deserializeUser((id, done) => {
	User.findById(id)
		.then(user => {
			if (!user) done("no user");
			done(null, user);
		})
})

passport.use(
	new GoogleStrategy({
		// options for google strategy
		callbackURL: '/auth/google/redirect',
		clientID: process.env.SS_GOOGLE_CLIENT_ID,
		clientSecret: process.env.SS_GOOGLE_CLIENT_SECRET
	}, (accessToken, refreshToken, profile, done) => {
		// passport callback function
		User.findOne({googleId: profile.id})
			.then(currentUser => {
				if (!currentUser) {
					new User({
						googleId: profile.id,
						username: profile.displayName,
						picture: profile._json.picture
					}).save().then(newUser => {
						console.log("new user created: " + newUser);
						done(null, newUser);
					});
				}
				else {
					console.log("current user: " + currentUser);
					done(null, currentUser);
				}
			})
	})
)


passport.use(
	new FacebookStrategy({
		// options for google strategy
		callbackURL: '/auth/facebook/redirect',
		clientID: process.env.SS_FACEBOOK_APP_ID,
		clientSecret: process.env.SS_FACEBOOK_APP_SECRET
	}, (accessToken, refreshToken, profile, done) => {
		// passport callback function
		User.findOne({ facebookId: profile.id })
			.then(currentUser => {
				if (!currentUser) {
					new User({
						facebookId: profile.id,
						username: profile.displayName
					}).save().then(newUser => {
						console.log("new user created: " + newUser);
						done(null, newUser);
					});
				}
				else {
					console.log("current user: " + currentUser);
					done(null, currentUser);
				}
			})
	})
)