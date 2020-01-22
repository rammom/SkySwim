const mongoose = require('mongoose');
const {Schema} = mongoose;
const {ObjectId} = Schema.Types;

// Follower follows the user
const followSchema = new Schema({
	user: {type: ObjectId, ref: 'user', required: true},
	follower: {type: ObjectId, ref: 'user', required: true}
});

// Create index for fast search
followSchema.index({user: 1, follower: 1});

// Create reverse index for follower search capability
followSchema.index({follower: 1, user: 1});

const Follow = mongoose.model('follow', followSchema);

module.exports = Follow;
