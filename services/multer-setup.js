const multer = require('multer');
const path = require('path');

// multer config
const storage = multer.diskStorage({
	destination: './public/uploads/',
	filename: function (req, file, cb) {
		cb(null, '' + Date.now() + path.extname(file.originalname))
	}
});

const upload = multer({ storage });

module.exports = upload;