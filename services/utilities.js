
// Middleware for authenticated users
exports.authCheck = (req, res, next) => {
	if (!req.user) {
		// if user not logged in
		res.redirect('/');
	}
	else {
		// if logged in
		next();
	}
};

// Middleware for unauthenticated users
exports.antiAuthCheck = (req, res, next) => {
	if (req.user) {
		// if user logged in
		res.redirect('/u/home');
	}
	else {
		// if not logged in
		next();
	}
};

// SSError
class SSError extends Error {
	constructor(name = 'ValidationError', message = 'Bad Request', code = 400) {
		super(message);
		this.name = name;
		this.code = String(code);
	}
}
exports.SSError = SSError;
