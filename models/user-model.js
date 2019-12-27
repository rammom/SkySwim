const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const userSchema = new Schema({
	username: String,
	picture: String,
	googleId: String,
	facebookId: String,
	posts: [{ type: ObjectId, ref: 'post' }]
});

userSchema.pre('save', function (next) {
	if (!this.posts) this.posts = [];
	if (!this.picture) this.picture = "https://josephwojowski.files.wordpress.com/2016/02/orange-twitter-egg.png?w=400";
	next();
});

const User = mongoose.model('user', userSchema);

module.exports = User;