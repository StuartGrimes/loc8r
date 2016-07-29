var mongoose = require('mongoose');
var Loc = mongoose.model('Location');

var sendJsonResponse = function(res, status, content) {
    res.status(status);
    res.json(content);
};

var doAddReview = function(req, res, location) {
    if (!location) {
        sendJsonResponse(res, 404, {
            "message": "locationID not found"
        });
    } else {
        location.reviews.push({
            author: req.body.author,
            rating: req.body.rating,
            reviewText: req.body.reviewText
        });
        location.save(function(err, location) {
            var thisReview;
            if (err) {
                console.log(err);
                sendJsonResponse(res, 400, err);
            } else {
                updateAverageRating(location._id);
                thisReview = location.reviews[location.reviews.length - 1];
                sendJsonResponse(res, 201, thisReview);
            }
        });
    }
};

var updateAverageRating = function(locationid) {
    Loc
        .findById(locationid)
        .select('rating reviews')
        .exec(
            function(err, location) {
                if (!err) {
                    doSetAverageRating(location);
                }
            });
};

var doSetAverageRating = function(location) {
    var i, reviewCount, ratingAverage, ratingTotal;
    if (location.reviews && location.reviews.length > 0) {
        reviewCount = location.reviews.length;
        ratingTotal = 0;
        for (i = 0; i < reviewCount; i++) {
            ratingTotal = ratingTotal + location.reviews[i].rating;
        }
        ratingAverage = parseInt(ratingTotal / reviewCount, 10);
        location.rating = ratingAverage;
        location.save(function(err) {
            if (err) {
                console.log(err)
            } else {
                console.log("Average rating updated to " + ratingAverage);
            }
        });
    }
};

module.exports.reviewsCreate = function(req, res) {
    var locationid = req.params.locationid;
    if (locationid) {
        Loc
            .findById(locationid)
            .select('reviews')
            .exec(
                function(err, location) {
                    if (err) {
                        sendJsonResponse(res, 400, err);
                    } else {
                        doAddReview(req, res, location);
                    }
                }
            );
    } else {
        sendJsonResponse(res, 404, {
            "message": "Not found, location ID required"
        })
    }
};

module.exports.reviewsReadOne = function(req, res) {
    if (req.params && req.params.locationid && req.params.reviewid) {
        Loc
            .findById(req.params.locationid)
            .select('name reviews')
            .exec(function(err, location) {
                var response, review;
                if (!location) {
                    sendJsonResponse(res, 404, {
                        "Message": "Location ID not found"
                    });
                    return;
                } else if (err) {
                    sendJsonResponse(res, 400, err);
                    return;
                }
                if (location.reviews && location.reviews.length > 0) {
                    review = location.reviews.filter(function() {
                        return req.params.reviewid
                    });
                    if (!review) {
                        sendJsonResponse(res, 404, {
                            "Message": "review ID not found",
                            "Requested": review
                        });
                    } else {
                        response = {
                            location: {
                                name: location.name,
                                id: req.params.locationid
                            },
                            review: review
                        };
                        sendJsonResponse(res, 200, response);
                    }
                } else {
                    sendJsonResponse(res, 404, {
                        "Message": "No reviews found"
                    });
                }
            });
    } else {
        sendJsonResponse(res, 404, {
            "Message": "Not found location Id and review Id both required."
        });
    }
};

module.exports.reviewsUpdateOne = function(req, res) {
    if (!req.params.locationid || !req.params.reviewid) {
        sendJsonResponse(res, 404, {
            "message": "Not Found, location id and review id are both required."
        });
        return;
    }
    Loc
        .findById(req.params.locationid)
        .select('reviews')
        .exec(function(err, location) {
            var thisReview;
            if (!location) {
                sendJsonResponse(res, 404, {
                    "message": "location id not found"
                });
                return;
            } else if (err) {
                sendJsonResponse(res, 400, err);
                return;
            }
            if (location.reviews && location.reviews.length > 0) {
                thisReview = location.reviews.filter(function() {
                    return req.params.reviewid
                });
                if (!thisReview) {
                    sendJsonResponse(res, 404, {
                        "message": "Review ID not found"
                    });
                } else {
                    thisReview.author = req.body.author;
                    thisReview.rating = req.body.rating;
                    thisReview.reviewText = req.body.reviewText;
                    location.save(function(err, location) {
                        if (err) {
                            sendJsonResponse(res, 404, err);
                        } else {
                            updateAverageRating(location._id);
                            sendJsonResponse(res, 200, thisReview);
                        }
                    });
                }
            }
        });

};

module.exports.reviewsDeleteOne = function(req, res) {
    if(!req.params.locationid || !req.params.reviewid){
        sendJsonResponse(res, 404, {"message": "Not found, both location ID and review ID are required."});
        return;
    }
    Loc
        .findById(req.params.locationid)
        .select('reviews')
        .exec(function(err, location){
            if(!location){
                sendJsonResponse(res, 404, {"message":"location id not found"});
                return;
            } else if(err){
                sendJsonResponse(res, 400, err);
                return;
            }
            if(location.reviews && location.reviews.length > 0){
                if(!location.reviews.filter(function(){return req.params.reviewid;})){
                    sendJsonResponse(res, 404, {"message":"Review not found"});
                } else {
                    location.reviews.filter(function(){return req.params.reviewid}).remove();
                    location.save(function(err){
                        if(err){
                            sendJsonResponse(res, 404, err);
                        } else {
                            updateAverageRating(location._id);
                            sendJsonResponse(res, 204, null);
                        }
                    });
                }

            } else {
                sendJsonResponse(res, 404, {"message":"No reviews to delete"});
            }
        });
};
