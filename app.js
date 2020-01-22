const express = require('express');
const app = express();
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cookieSession = require('cookie-session');
const expressLayouts = require('express-ejs-layouts');
const swaggerUi = require('swagger-ui-express');
const dotenv = require('dotenv');
dotenv.config();
const passport = require('passport');
const passportSetup = require('./services/passport-setup');
passportSetup.config(passport);
const {authCheck, antiAuthCheck} = require('./services/utilities');
const swaggerSpec = require('./swagger.json');
const routes = {
	index: require('./routes/index-routes'),
	auth: require('./routes/auth-routes'),
	user: require('./routes/user-routes'),
	api: require('./routes/api-routes')
};

// Secure HTTP headers
app.use(helmet());

// Setup swagger
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Connect to mongodb
mongoose.connect(
	process.env.SS_MONGO_URI,
	{
		useNewUrlParser: true,
		useUnifiedTopology: true
	},
	() => console.log('connected to mongodb')
);
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);

// Other middleware
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.static('./public'));
app.use(morgan('tiny'));

// Setup rate limiters

// 100 requests every 10 minutes from same IP
const apiRateLimiter = rateLimit({
	windowMs: 10 * 60 * 1000, // 10 minutes
	max: 100
});

// 100 requests a day from same IP
const authRateLimiter = rateLimit({
	windowMs: 24 * 60 * 60 * 1000,
	max: 100
});

// Passport/Session initialization
app.use(cookieSession({
	keys: [process.env.SS_COOKIE_KEY]
}));
app.use(passport.initialize());
app.use(passport.session());

// Setup view engine
app.set('view engine', 'ejs');
app.use(expressLayouts);

// Direct requests
app.use('/api', apiRateLimiter, authCheck, routes.api);
app.use('/auth', authRateLimiter, routes.auth);
app.use('/u', authCheck, routes.user);
app.use('/', antiAuthCheck, routes.index);

// Catch any errors
app.use((error, req, res, _) => {
	console.log(error);

	const {type} = error;
	const code = error.code ? error.code : 500;
	const name = error.name ? error.name : 'Error';
	const message = error.message ? error.message : 'undefined error';

	if (error.name === 'UserError') {
		res.set('Set-Cookie", "express:sess=deleted; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT');
		res.set('Set-Cookie", "express:sess.sig=deleted; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT');
	}

	return res.status(code).json({
		type,
		name,
		code,
		message
	});
});

app.listen(process.env.SS_PORT, () => {
	console.log(`${process.env.SS_NAME} now listening on port ${process.env.SS_PORT}`);
});
