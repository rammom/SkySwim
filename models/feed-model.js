const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const feedSchema = new Schema({
	user: { type: String, required: true },
	posts: [{ type: ObjectId, required: true }],
	updated: Date
});

// log update
feedSchema.pre('save', function() {
	this.updated = new Date();
})

// set cache to expire after 30 days
feedSchema.index({ updated: 1 }, { expireAfterSeconds: (60 * 60 * 24 * 30) })

const Feed = mongoose.model('feed', feedSchema);

module.exports = Feed;