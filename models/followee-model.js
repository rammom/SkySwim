const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const followeeSchema = new Schema({
	user: { type: ObjectId, ref: 'user', required: true },
	followee: { type: ObjectId, ref: 'user', required: true }
});


// create index for fast search
followeeSchema.index({ user: 1, followee: 1});

// create reverse index for follower search capability
followeeSchema.index({ followee: 1, user: 1 });

const Followee = mongoose.model('followee', followeeSchema);

module.exports = Followee;