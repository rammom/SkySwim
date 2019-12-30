class ValidationError extends Error {
	constructor(message) {
		super(message)
	}
}
class ServerError extends Error {
	constructor(message) {
		super(message)
	}
}

module.exports = {
	ValidationError,
	ServerError
}