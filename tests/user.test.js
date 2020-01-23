const request = require('supertest');
const app = require('../app');

describe('Test home page', () => {
	test('Should GET status 200, text/html with no redirect', done => {
		request(app).get('/u/home').then(response => {
			expect(response.statusCode).toBe(302);
			expect(response.redirect).toBe(true);
			expect(response.type).toBe('text/plain');
			expect(response.text).toBe('Found. Redirecting to /');
			done();
		});
	});
});
