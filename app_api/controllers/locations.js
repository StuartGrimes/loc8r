var mongoose = require('mongoose');
var Loc = mongoose.model('Location');

var theEarth = (function() {
    var earthRadius = 6371; //km miles is 3959
    var getDistanceFromRads = function(rads) {
        //convert radians to distance
        return parseFloat(rads * earthRadius);
    };
    var getRadsFromDistance = function(distance) {
        //convert distance to radians
        return parseFloat(distance / earthRadius);
    };
    return {
        getDistanceFromRads: getDistanceFromRads,
        getRadsFromDistance: getRadsFromDistance
    };

})();

var sendJsonResponse = function(res, status, content) {
    res.status(status);
    res.json(content);
};

module.exports.locationsListByDistance = function(req, res) {
    var lng = parseFloat(req.query.lng);
    var lat = parseFloat(req.query.lat);
    var maxDistance = parseFloat(req.query.maxDistance);
    var geoOptions = {
        spherical: true,
        maxDistance: maxDistance,//theEarth.getRadsFromDistance(maxDistance),
        num: 10
    };
    if ((!lng && lng !== 0) || (!lat && lat !== 0) || !maxDistance) {
        console.log('locationsListByDistance missing params');
        sendJsonResponse(res, 404, {
            "message": "lng, lat and maxDistance query parameters are all required"
        });
        return;
    }
    Loc.geoNear({type: "Point", coordinates: [lng,lat]}, geoOptions, function(err, results, stats) {
        var locations;
        console.log('Geo Results', results);
        if (err) {
            console.log('geoNear error:', err);
            sendJsonResponse(res, 404, err);
        } else {
            console.log("At fecking last...");
            locations = buildLocationList(req, res, results, stats);
            sendJsonResponse(res, 200, locations);
        }
    });
};

var buildLocationList = function(req, res, results, stats) {
  var locations = [];
  results.forEach(function(doc) {
    locations.push({
      distance: doc.dis,
      name: doc.obj.name,
      address: doc.obj.address,
      rating: doc.obj.rating,
      facilities: doc.obj.facilities,
      _id: doc.obj._id
    });
  });
  return locations;
};

module.exports.locationsCreate = function(req, res) {
    Loc.create({
        name: req.body.name,
        address: req.body.address,
        facilities: req.body.facilities.split(","),
        coords: [parseFloat(req.body.lng), parseFloat(req.body.lat)],
        openingTimes: [{
            days: req.body.days1,
            opening: req.body.opening1,
            closing: req.body.closing1,
            closed: req.body.closed1,
        }, {
            days: req.body.days2,
            opening: req.body.opening2,
            closing: req.body.closing2,
            closed: req.body.closed2,
        }]
    }, function(err, location) {
        if (err) {
            sendJsonResponse(res, 400, err);
        } else {
            sendJsonResponse(res, 200, location);
        }
    });

};

module.exports.locationsReadOne = function(req, res) {
    console.log("Finding location details", req.params);
    if (req.params && req.params.locationid) {
        Loc
            .findById(req.params.locationid)
            .exec(function(err, location) {
                if (!location) {
                    sendJsonResponse(res, 404, {
                        "message": "locationID not Found"
                    });
                    return;
                } else if (err) {
                    sendJsonResponse(res, 404, err);
                    return;
                }
                sendJsonResponse(res, 200, location);
            });
    } else {
        sendJsonResponse(res, 404, {
            "message": "No locationId in request"
        });
    }
};

module.exports.locationsUpdateOne = function(req, res) {
    //check you have params and locationid
    if (!req.params.locationid) {
        sendJsonResponse(res, 404, {
            "message": "Not found, location id required"
        });
    }
    //find relevant document
    Loc
        .findById(req.params.locationid)
        .select('-reviews -rating')
        .exec(function(err, location) {
            if (!location) {
                sendJsonResponse(res, 404, {
                    "message": "Location ID not found"
                });
                return;
            } else if (err) {
                sendJsonResponse(res, 400, err);
                return;
            }
            location.name = req.body.name;
            location.address = req.body.address;
            location.facilities = req.body.facilities.split(",");
            location.coords = [parseFloat(req.body.lng), parseFloat(req.body.lat)];
            location.openingTimes = [{
                days: req.body.days1,
                opening: req.body.opening1,
                closing: req.body.closing1,
                closed: req.body.closed1,
            }, {
                days: req.body.days2,
                opening: req.body.opening2,
                closing: req.body.closing2,
                closed: req.body.closed2,
            }];
            location.save(function(err, location) {
                if (err) {
                    sendJsonResponse(res, 404, err);
                } else {
                    sendJsonResponse(res, 200, location);
                }
            });
        });
};

module.exports.locationsDeleteOne = function(req, res) {
    if (!req.params.locationid) {
        sendJsonResponse(res, 404, {
            "message": "Not found, location id is required"
        });
        return;
    }
    var locationid = req.params.locationid;
    if (locationid) {
        Loc
            .findByIdAndRemove(locationid)
            .exec(function(err, location) {
                if (err) {
                    sendJsonResponse(res, 404, err);
                    return;
                }
                sendJsonResponse(res, 204, null);
            });
    }
};
