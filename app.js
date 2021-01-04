const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const HttpError = require('./models/http-error');
const placesRoutes = require('./routes/places.route');
const usersRoutes = require('./routes/users.route');
const app = express();
const fs = require('fs');
const path = require('path');

/**
 * this will parse the body of post requests
 */
app.use(bodyParser.json());

/**
 * Make uploaded images accessible
 */
app.use('/uploads/images', express.static(path.join('uploads', 'images')));

/**
 * Handlr CORS
 */
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
    next();
})
app.use('/api/places', placesRoutes);
app.use('/api/users', usersRoutes);

/**
 * Middleware to handle unknown routes.
 * There is no nexts() in the previous middleware.
 * Hence, any request that reaches here, has not 
 * been handle. Therefore the error will be thrown
 */
app.use((req, res, next) => {
    const error = new HttpError("Could not find this route.", 404);
    throw error;
})


/**
 * middleware function, express will apply on every incoming request.
 * If there are four parameters, as is , express will treat it
 * as an error handling function
 */
app.use((error, req, res, next) => {
    /**
     * Rollback saved image during upload, if error occurs
     */
    if(req.file){
        fs.unlink(req.file.path, (err) => {
            console.log(err);
        });
    }
    if(res.headerSent){
        return next(error);
    }

    res.status(error.code || 500);
    res.json({message: error.message || 'An unknow error occured!'});
})
console.log(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ppck6.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`)
mongoose.connect(`mongodb+srv://toyosi:toyosi@cluster0.ppck6.mongodb.net/mern?retryWrites=true&w=majority`).then(() => {
    app.listen(5000);
}).catch(err => {
    console.log(err);
});
