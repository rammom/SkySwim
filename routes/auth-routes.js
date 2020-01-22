const express = require('express');
const router = new express.Router();
const authController = require('../controllers/auth-controller');

router.get('/logout', authController.logout);
router.get('/google', authController.authenticateWithGoogle);
router.get('/google/redirect', authController.authenticateWithGoogle, authController.redirectToHome);
router.get('/facebook', authController.authenticateWithFacebook);
router.get('/facebook/redirect', authController.authenticateWithFacebook, authController.redirectToHome);

module.exports = router;
