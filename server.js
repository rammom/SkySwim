const app = require('./app');
const logger = require('./services/log-setup');

app.listen(process.env.SS_PORT, () => {
	logger.info(`${process.env.SS_NAME} now listening on port ${process.env.SS_PORT}`);
});
