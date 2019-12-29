module.exports = {
	// Check if user sending request is logged in
	authCheck: (req, res, next) => {
		if (!req.user) {
			// if user not logged in
			res.redirect('/');
		}
		else {
			// if logged in
			next();
		}
	},
	// Check if user sending request is not logged in
	antiAuthCheck: (req, res, next) => {
		if (req.user) {
			// if user logged in
			res.redirect('/u/home');
		}
		else {
			// if not logged in
			next();
		}
	},
	wrapAsync: (fn) => {
		return function (req, res, next) {
			fn(req, res, next).catch(next);
		};
	}
}