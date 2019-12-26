const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
	username: String,
	picture: String,
	googleId: String,
	facebookId: String
});

const User = mongoose.model('user', userSchema);

module.exports = User;