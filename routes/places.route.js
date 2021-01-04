const express = require('express');
const { check } = require('express-validator');
const checkAuth = require('../middleware/check-auth');
const placesController = require('../controllers/places-controller');

const router = express.Router();
const fileUpload = require('../middleware/file-upload');


/**
 * Get a particular place
 */
router.get('/:pid', placesController.getPlaceById);

/**
 * Get places belonging to a user
 */
router.get('/user/:uid', placesController.getPlacesByUserId);

/**
 * Middleware to verify token. (ROUTE GUARD)
 */
router.use(checkAuth);

router.post(
    '/', 
    fileUpload.single('image'),
    [
        check('title').not().isEmpty(), 
        check('description').isLength({ min: 5 }),
        check('address').not().isEmpty()
    ],
    placesController.createPlace);

router.patch(
    '/:pid',
    [
        check('title').not().isEmpty(), 
        check('description').isLength({ min: 5 }),
    ], 
    placesController.updatePlace);

router.delete('/:pid', placesController.deletePlace);


module.exports = router;