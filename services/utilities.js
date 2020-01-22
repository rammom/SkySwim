
// Middleware for authenticated users
exports.authCheck = (req, res, next) => {
	if (req.user) {
		// Logged in
		next();
	} else {
		// User not logged in
		res.redirect('/');
	}
};

// Middleware for unauthenticated users
exports.antiAuthCheck = (req, res, next) => {
	if (req.user) {
		// User logged in
		res.redirect('/u/home');
	} else {
		// Not logged in
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
