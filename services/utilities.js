module.exports = {
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
	antiAuthCheck: (req, res, next) => {
		if (req.user) {
			// if user logged in
			res.redirect('/u/home');
		}
		else {
			// if not logged in
			next();
		}
	}
}