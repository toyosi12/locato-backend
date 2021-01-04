const HttpError = require('../models/http-error');
const { validationResult} = require('express-validator');
const getCoordsForAddress = require('../util/location');
const mongoose = require('mongoose');
const fs  = require('fs');
const Place = require('../models/place');
const User = require('../models/user');


const getPlaceById = async (req, res, next) => {
    const placeId = req.params.pid;

    let place;
    try{
        place = await Place.findById(placeId);
    }catch(err){
        const error = new HttpError('Something went wrong, could not find a place', 500);
        return next(error);
    }

    if(!place){
        return next(new HttpError("Could not find a place for the provided id.", 404));
    }
    
    //convert _id to id
    res.json({ place: place.toObject({ getters: true }) });
}

const getPlacesByUserId = async (req, res, next) => {
    const userId = req.params.uid;
    let places;
    try{
        places = await Place.find({ creator: userId });
       
    }catch(err){
       
        return next(new HttpError("Something went wrong", 500));
    }


    if(!places || places.length === 0){
        return next(new HttpError("Could not find places for the provided user id.", 404));

    }

    res.json({ places: places.map(place => place.toObject({ getters: true })) });
}

/**
 * When working with async function, throw will
 * not work correctly, use next instead
 */
const createPlace = async (req, res, next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        console.log(errors);
        return next(
            new HttpError('Invalid inputs passed, please check your data', 422)
        );
    }
    const { title, description, address } = req.body;
    let coordinates;
    try{
        coordinates = await getCoordsForAddress(address);
    }catch(error){
        return next(error);
    }

    const createdPlace = new Place({
        title,
        description,
        address,
        location: coordinates,
        image: req.file.path,
        creator: req.userData.userId
    });

    let user;

    try{
        user = await User.findById(req.userData.userId);
    }catch(err){
        return next(new HttpError('Creating place failed', 500));
    }

    if(!user){
        return next(new HttpError('Could not find user for provided id', 404)); 
    }

    try{
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await createdPlace.save({ session: sess });
        user.places.push(createdPlace);
        await user.save({ session: sess });
        await sess.commitTransaction();

    }catch(err){
        const error = new HttpError('Creating place failed.', 500);
        return next(error);
    }

    res.status(201).json({place: createdPlace });
}

const updatePlace = async (req,res, next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        console.log(errors);
        return next(new HttpError('Invalid inputs passed, please check your data', 422));
    }

    const { title, description } = req.body;
    const placeId = req.params.pid;

    let place;
    try{
        place = await Place.findById(placeId);
    }catch(err){
        return next(new HttpError("Something went wrong. Could not update. ", 500));
    }

    if(place.creator.toString() !== req.userData.userId){
        return next(new HttpError("You are not allowed to edit this place", 403));
    }

    place.title = title;
    place.description = description;

    try{
        await place.save();
    }catch(err){
        return next(new HttpError("Something went wrong. Could not update. ", 500));
    }

    res.status(200).json({place: place.toObject( { getters: true })});

}

const deletePlace = async (req, res, next) => {
    const placeId = req.params.pid;

    let place;
    try{
        place = await Place.findById(placeId).populate('creator')
    }catch(err){
        return next(new HttpError("Something went wrong. Could not delete place. ", 500));
    }

    if(!place){
        return next(new HttpError('Could not find place for this id. ', 404));
    }

    if(place.creator.id !== req.userData.userId){
        return next(new HttpError('You are not allowed to delete this place', 403));
    }

    const imagePath = place.image;

    try{
        const sess = await mongoose.startSession();
        sess.startTransaction();
        place.remove({ session: sess });
        place.creator.places.pull(place);
        await place.creator.save({ session: sess });
        await sess.commitTransaction();
    }catch(err){
        return next(new HttpError("Something went wrong. Could not delete place. ", 500));
    }

    fs.unlink(imagePath, err => {
        console.log(err);
    })

    res.status(200).json({message: 'Deleted place.'});
}

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;