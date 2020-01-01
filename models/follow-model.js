const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

// follower follows the user
const followSchema = new Schema({
	user: { type: ObjectId, ref: 'user', required: true },
	follower: { type: ObjectId, ref: 'user', required: true }
});

// create index for fast search
followSchema.index({ user: 1, follower: 1});

// create reverse index for follower search capability
followSchema.index({ follower: 1, user: 1 });

const Follow = mongoose.model('follow', followSchema);

module.exports = Follow;