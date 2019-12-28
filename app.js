const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const expressLayouts = require('express-ejs-layouts');
const dotenv = require('dotenv');
dotenv.config();
const routes = {
  index: require('./routes/index-routes'),
  auth: require('./routes/auth-routes'),
  user: require('./routes/user-routes'),
  api: require('./routes/api-routes')
}
const passport = require('passport');
const passportSetup = require('./services/passport-setup');
const mongoose = require('mongoose');
const { authCheck, antiAuthCheck } = require('./services/utilities');
const path = require('path');
const Errors = require('./services/Errors');







// connect to mongodb
mongoose.connect(
	process.env.SS_MONGO_URI, 
	{ 
		useNewUrlParser: true, 
		useUnifiedTopology: true 
	}, 
	() => console.log("connected to mongodb")
);






// other middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('./public'));






// session and passport initialization
app.use(cookieSession({
	keys: [process.env.SS_COOKIE_KEY]
}));
app.use(passport.initialize());
app.use(passport.session());






// setup view engine
app.set('view engine', 'ejs');
app.use(expressLayouts);






// setup routes
app.use('/api', authCheck, routes.api);
app.use('/auth', routes.auth);
app.use('/u', authCheck, routes.user);
app.use('/', antiAuthCheck, routes.index);







// error handling

// problem validating requests
app.use(function handleValidationError(error, req, res, next) {
	if (error instanceof Errors.ValidationError) {
		return res.status(400).json({
			type: 'ValidationError',
			message: error.message
		});
	}
	next(error);
});

// problem performing task, probably due to server issue
app.use(function handleServerError(error, req, res, next) {
	if (error instanceof Errors.ServerError) {
		return res.status(500).json({
			type: 'ServerError',
			message: error.message
		});
	}
	next(error);
});

// fallback
app.use(function handleError(error, req, res, next) {
	return res.status(500).json({...error});
});




app.listen(process.env.SS_PORT, () => {
  console.log(`${process.env.SS_NAME} now listening on port ${process.env.SS_PORT}`);
});
