const HttpError = require('../models/http-error');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const getUsers = async (req, res, next) => {
    let users;
    try{
        users = await User.find({}, '-password');//exclude password from fetch
    }catch(err){
        return next(new HttpError('Fetching users failed.', 500));
    }

    res.json({users: users.map(user => user.toObject({ getters: true }))});
}


const signup = async (req, res, next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        console.log(errors);
        return next(new HttpError('Invalid inputs passed, please check your data', 422));
    }
    const { name, email, password } = req.body;

    let existingUser;
    try{
        existingUser = await User.findOne({ email: email });
    }catch(err){
        return next(new HttpError('Signup failed. Please try again later', 500));
    }

    if(existingUser){
        return next(new HttpError("Could not create user, Email already exists", 422));
    }

    let hashedPassword;
    try{
        hashedPassword = await bcrypt.hash(password, 12);
    }catch(err){
        const error = new HttpError('Could not create user, please try again', 500);
        return next(error);
    }
    const createdUser = new User({
        name,
        email,
        image: req.file.path,
        password: hashedPassword,
        places: []
    });

    try{
        await createdUser.save();
    }catch(err){
        return next(new HttpError('Sign up failed', 500));
    }

    let token;
    try{
        token = jwt.sign({ 
            userId: createdUser.id, 
            email: createdUser.email }, 
            process.env.JWT_KEY, 
            { expiresIn: '1h'});
    }catch(err){
        return next(new HttpError('Sign up failed', 500));
    }
    res.status(201).json({ userid: createdUser.id, email: createdUser.email, token: token });
}

const login = async (req, res, next) => {
    const {email, password } = req.body;
    let existingUser;
    try{
        existingUser = await User.findOne({ email: email });
    }catch(err){
        return next(new HttpError('Login failed. Please try again later', 500));
    }

    if(!existingUser){
        return next(new HttpError('Invalid credentials', 401)); 
    }

    let isValidPassword = false;
    try{
        isValidPassword = await bcrypt.compare(password, existingUser.password);

    }catch(err){
        return next(new HttpError("Could not log in, please check your credentials and try again", 500));
    }

    if(!isValidPassword){
        return next(new HttpError('Invalid credentials', 401)); 
    }

    let token;
    try{
        token = jwt.sign({ 
            userId: existingUser.id, 
            email: existingUser.email }, 
            process.env.JWT_KEY, 
            { expiresIn: '1h'});
    }catch(err){
        return next(new HttpError('Sign up failed', 500));
    }
    res.json({
        userId: existingUser.id,
        email: existingUser.email,
        token: token
    });
}

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;