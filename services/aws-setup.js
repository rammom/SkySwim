const AWS = require('aws-sdk');

const s3 = new AWS.S3({
	accessKeyId: process.env.SS_AWS_ID,
	secretAccessKey: process.env.SS_AWS_SECRET
});

module.exports = s3;