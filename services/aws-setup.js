const AWS = require('aws-sdk');
AWS.config.update({
	accessKeyId: process.env.SS_AWS_ID,
	secretAccessKey: process.env.SS_AWS_SECRET,
	region: 'us-east-2',
	signatureVersion: 'v4'
})

module.exports = AWS;