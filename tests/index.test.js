const request = require('supertest');
const app = require('../app');

describe('Test the root path', () => {
	test('Should GET status 200, text/html with no redirect', done => {
		request(app).get('/').then(response => {
			expect(response.statusCode).toBe(200);
			expect(response.type).toBe('text/html');
			expect(response.redirect).toBe(false);
			done();
		});
	});
});
