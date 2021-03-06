const mongoose = require('mongoose');
const {Schema} = mongoose;
const {ObjectId} = Schema.Types;

const feedSchema = new Schema({
	user: {type: String, required: true, unique: true},
	posts: [{type: ObjectId, ref: 'post', required: true}],
	updated: Date
});

// Log update
feedSchema.pre('save', function () {
	if (!this.posts) {
		this.posts = [];
	}

	this.updated = new Date();
});

// User index for quick query
feedSchema.index({user: 1, updated: -1});

// Set cache to expire after 30 days
feedSchema.index({updated: 1}, {expireAfterSeconds: (60 * 60 * 24 * 30)});

const Feed = mongoose.model('feed', feedSchema);

module.exports = Feed;
