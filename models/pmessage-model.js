const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const pmessageSchema = new Schema({
	from: { type: ObjectId, ref: 'user', required: true },
	to: { type: ObjectId, ref: 'user', required: true },
	post: { type: ObjectId, ref: 'post', required: true }
});

// create index for fast search
pmessageSchema.index({ from: 1 });
pmessageSchema.index({ to: 1 });

const Pmessage = mongoose.model('pmessage', pmessageSchema);

module.exports = Pmessage;