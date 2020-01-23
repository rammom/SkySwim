const path = require('path');
const winston = require('winston');

const logger = winston.createLogger({
	level: 'info',
	format: winston.format.json(),
	transports: [
		new winston.transports.File({filename: path.join(__dirname, '../log/error.log'), level: 'error'}),
		new winston.transports.File({filename: path.join(__dirname, '../log/out.log')})
	]
});

if (process.env.NODE_ENV === 'development') {
	logger.add(new winston.transports.Console({
		format: winston.format.simple()
	}));
}

module.exports = logger;
