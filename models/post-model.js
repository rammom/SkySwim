const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const postSchema = new Schema({
	type: { type: String, enum: ['blurb', 'image', 'video'] },
	blurb: { type: String, required: true },
	media: String,
	user: {
		id: { type: ObjectId, ref: 'user', required: true },
		username: String,
		picture: String
	},
	created: { type: Date }
});

// add timestamp
postSchema.pre('save', function() {
	if (!this.created) this.created = new Date();
})

// make search by user quick and set created to -1 to sort by newest
postSchema.index({ "user.id": 1, created: -1 });
postSchema.index({ _id: 1, "user.id": 1 });

const Post = mongoose.model('post', postSchema);

module.exports = Post;