const AWS = require('aws-sdk');

exports.getSignedUrl = (fileName, contentType) => {
	const params = {
		Bucket: process.env.SS_AWS_BUCKET,
		Key: fileName,
		ContentType: contentType,
	};
	const options = {
		accessKeyId: process.env.SS_AWS_ID,
		secretAccessKey: process.env.SS_AWS_SECRET,
		signatureVersion: 'v4'
	};
	const s3 = new AWS.S3(options);
	return new Promise((resolve, reject) => {
		s3.getSignedUrl('putObject', params, (err, url) => {
			if (err) 
				return reject(err);
			return resolve(url);
		});
	});
}

exports.deleteObject = (fileName) => {
	const params = {
		Bucket: process.env.SS_AWS_BUCKET,
		Key: fileName
	};
	const options = {
		accessKeyId: process.env.SS_AWS_ID,
		secretAccessKey: process.env.SS_AWS_SECRET,
		signatureVersion: 'v4'
	};
	const s3 = new AWS.S3(options);
	return new Promise((resolve, reject) => {
		s3.deleteObject(params, (err, data) => {
			if (err)
				return reject(err);
			return resolve(data);
		})
	});
}