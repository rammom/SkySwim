const mongoose = require('mongoose');
const {Schema} = mongoose;

const userSchema = new Schema({
	username: String,
	picture: {type: String, default: 'https://josephwojowski.files.wordpress.com/2016/02/orange-twitter-egg.png?w=400'},
	googleId: String,
	facebookId: String
});

// Make search quick
userSchema.index({username: 1});
userSchema.index({googleId: 1});
userSchema.index({facebookId: 1});

const User = mongoose.model('user', userSchema);

module.exports = User;
