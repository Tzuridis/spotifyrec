var unirest = require('unirest');
var express = require('express');
var events = require('events');

var getFromApi = function (endpoint, args) {
    var emitter = new events.EventEmitter();
    unirest.get('https://api.spotify.com/v1/' + endpoint)
        .qs(args)
        .end(function (response) {
            if (response.ok) {
                emitter.emit('end', response.body);
            }
            else {
                emitter.emit('error', response.code);
            }
        });
    return emitter;
};

var app = express();
app.use(express.static('public'));

app.get('/search/:name', function (req, res) {
    var searchReq = getFromApi('search', {
        q: req.params.name,
        limit: 1,
        type: 'artist'
    });

    searchReq.on('end', function (item) {
        var artist = item.artists.items[0];
        // console.log(artist);
        var getRelatedArtists = getRelated(artist.id);
        getRelatedArtists.on('end', function (item) {
            artist.related = item.artists;
            var record = artist.related.length;
            var count = 0;
            for (var i = 0; i < artist.related.length; i++) {
                var getTopTracks = getTracks(artist.related[i].id);
                // console.log('Artist related', artist.related[i]);
                getTopTracks.on('end', function (item) {
                    if(item.tracks != undefined) {
                        console.log(item.tracks)
                        
                    artist.related[i].tracks = item.tracks;
                    }
                    count++;
                    if (count == record) {
                        res.json(artist);
                    }
                });
                getTopTracks.on('error', function (code) {
                //    console.log(code)
                });
            }

        });
        getRelatedArtists.on('error', function (code) {
            res.sendStatus(code);
        });

    });

    searchReq.on('error', function (code) {
        res.sendStatus(code);
    });


});

var getRelated = function (id) {
    var emitter = new events.EventEmitter();

    unirest.get('https://api.spotify.com/v1/artists/' + id + '/related-artists')
        .end(function (response) {
            if (response.ok) {
                emitter.emit('end', response.body);
            }
            else {
                emitter.emit('error', response.code);
            }
        });
    return emitter;
};


var getTracks = function (id) {
    var emitter = new events.EventEmitter();
    unirest.get('https://api.spotify.com/v1/artists/' + id + '/top-tracks?country=US')
        .end(function (response) {
            if (response.ok) {
                emitter.emit('end', response.body);
            } else {
                emitter.emit('error', response.code);
            }
        });
    return emitter;
}





app.listen(process.env.PORT || 8080);