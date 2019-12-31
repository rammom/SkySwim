const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20');
const FacebookStrategy = require('passport-facebook')
const User = require('../models/user-model');
const Errors = require('./Errors');

passport.serializeUser((user, done) => {
	done(null, user._id);
})

passport.deserializeUser((id, done) => {
	User.findById(id)
		.then(user => {
			if (!user) 
				return done(new Errors.UserError("passport: user not found"));
			return done(null, user);
		})
})

passport.use(
	new GoogleStrategy({
		// options for google strategy
		callbackURL: `${process.env.SS_HOSTNAME}/auth/google/redirect`,
		clientID: process.env.SS_GOOGLE_CLIENT_ID,
		clientSecret: process.env.SS_GOOGLE_CLIENT_SECRET
	}, async (accessToken, refreshToken, profile, done) => {
		// google authentication success
		let error = null;

		// check if user exists
		let user = null;
		await User.findOne({ googleId: profile.id })
			.then(u => user = u)
			.catch(e => error = e);

		if (error)
			return next(error);

		if (user) {
			// pass the user over to passport
			return done(null, user);
		}
		else {
			// create a new user
			await new User({
				googleId: profile._id,
				username: profile.displayName,
				picture: profile._json.picture
			})
				.save()
				.then(u => user = u)
				.catch(e => error = e);

			if (error)
				done(error);

			return done(null, user);
		}
	})
)


passport.use(
	new FacebookStrategy({
		// options for google strategy
		callbackURL: `${process.env.SS_HOSTNAME}/auth/facebook/redirect`,
		clientID: process.env.SS_FACEBOOK_APP_ID,
		clientSecret: process.env.SS_FACEBOOK_APP_SECRET
	}, async (accessToken, refreshToken, profile, done) => {
		// facebook authentication success
		let error = null;

		// check if user exists
		let user = null;
		await User.findOne({ facebookId: profile.id })
			.then(u => user = u)
			.catch(e => error = e);

		if (error)
			return next(error);

		if (user) {
			// pass the user over to passport
			return done(null, user);
		}
		else {
			// create a new user
			await new User({
				facebookId: profile._id,
				username: profile.displayName,
				picture: profile._json.picture
			})
				.save()
				.then(u => user = u)
				.catch(e => error = e);

			if (error)
				done(error);

			return done(null, user);
		}
	})
)