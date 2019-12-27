const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const postSchema = new Schema({
	type: { type: String, enum: ['blurb', 'image', 'video'] },
	blurb: String,
	image: String,
	video: String,
	user: { type: ObjectId, ref: 'user', required: true },
	createdAt: Date
});

postSchema.pre('save', function(next) {
	if (!this.createdAt) this.createdAt = new Date();
	next();
});

const Post = mongoose.model('post', postSchema);

module.exports = Post;