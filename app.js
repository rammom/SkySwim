const express = require('express');
const app = express();
const cookieSession = require('cookie-session');
const expressLayouts = require('express-ejs-layouts');
const dotenv = require('dotenv');
dotenv.config();
const routes = {
  index: require('./routes/index-routes'),
  auth: require('./routes/auth-routes'),
  user: require('./routes/user-routes')
}
const passport = require('passport');
const passportSetup = require('./services/passport-setup');
const mongoose = require('mongoose');
const { authCheck, antiAuthCheck } = require('./services/utilities');

// connect to mongodb
mongoose.connect(
	process.env.SS_MONGO_URI, 
	{ 
		useNewUrlParser: true, 
		useUnifiedTopology: true 
	}, 
	() => console.log("connected to mongodb")
);

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
app.use('/auth', routes.auth);
app.use('/u', authCheck, routes.user);
app.use('/', antiAuthCheck, routes.index);

app.listen(process.env.SS_PORT, () => {
  console.log(`${process.env.SS_NAME} now listening on port ${process.env.SS_PORT}`);
});
