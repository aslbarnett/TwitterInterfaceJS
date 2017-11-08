/* -+-+-+--------------------------------------------+-+-+-
* Main Imports
 -+-+-+--------------------------------------------+-+-+- */

const express = require('express');
const app = express();
const Twit = require('twit');
const ta = require('time-ago')();
const bodyParser = require('body-parser');
const server = require('http').createServer(app);
const io = require('socket.io').listen(server);

app.use(bodyParser.urlencoded({ extended: false }));

const API_KEYS = require('./config');

/* -+-+-+--------------------------------------------+-+-+-
* Variable Declarations
 -+-+-+--------------------------------------------+-+-+- */

const T = new Twit(API_KEYS);
const numberOfInfo = 5;
let dataObj = {};
let messageDates = [];
let data;
let tweets;
let dataArray = [];

app.use('/static', express.static('public'));
app.set('view engine', 'pug');

/* -+-+-+--------------------------------------------+-+-+-
* Get the user
 -+-+-+--------------------------------------------+-+-+- */

getAuthenticatedUser();

/* -+-+-+--------------------------------------------+-+-+-
* GET / -- index
 -+-+-+--------------------------------------------+-+-+- */

app.get('/', async function(req, res, next) {
    data = await Promise.all(dataArray);
    if (data !== undefined && data.length === 4) {
        dataObj.profile = data[0];
        tweets = data[1];
        dataObj.followers = data[2];
        dataObj.messages = data[3];

        tweets.forEach(tweet => {
            tweet.timelineDate = formatDate(tweet.created_at);
        });
        dataObj.tweets = tweets;
        // message date
        dataObj.messages.forEach(message => {
            messageDates.push(formatDate(message.created_at));
        });
        dataObj.messageDates = messageDates;
    } else {
        next();
    }
    res.render('index',{dataObj});
});

/* -+-+-+--------------------------------------------+-+-+-
* Socket connection for tweet update
 -+-+-+--------------------------------------------+-+-+- */

io.on('connection', client => {
    console.log('Client connected...');

    client.on('refreshData', data => {
        T.post('statuses/update', { status: data })
            .catch(err => {
                console.log('caught error', err.stack);
            })
            .then(result => {
                result.data.timelineDate = formatDate(result.data.created_at);
                client.emit('messages', result.data);
            });
    });
});

/* -+-+-+--------------------------------------------+-+-+-
* Error Middleware -- 404
 -+-+-+--------------------------------------------+-+-+- */

app.use((req, res, next) => {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/* -+-+-+--------------------------------------------+-+-+-
* Error Middleware
 -+-+-+--------------------------------------------+-+-+- */

app.use((err, req, res, next) => {
    res.locals.error = err;
    res.status(err.status);
    res.render('error', err);
});

/* -+-+-+--------------------------------------------+-+-+-
* Server listening on port 3000
 -+-+-+--------------------------------------------+-+-+- */

server.listen(3000, () => {
    console.log('The application is running on port 3000!');
});

/* -+-+-+--------------------------------------------+-+-+-
* Helper Methods
 -+-+-+--------------------------------------------+-+-+- */

// get user data
function getAuthenticatedUser() {
    T.get('account/verify_credentials', { skip_status: true })
        .catch(err => {
            console.log('caught error', err.stack);
        })
        .then(result => {
            if (result.data) {
                dataArray.push(getProfileData(result.data.screen_name, result.data.id));
                dataArray.push(getTweetData(result.data.screen_name));
                dataArray.push(getFollowingData(result.data.screen_name));
                dataArray.push(getDirectMessages());
            }
        });
}

// get most recent 5 tweets
function getTweetData(screenName) {
    return T.get(`statuses/user_timeline.json?screen_name=${screenName}&count=${numberOfInfo}`)
        .catch(err => {
            console.log('caught error', err.stack);
        })
        .then(result => {
            return result.data;
        });
}

// get profile data
function getProfileData(screenName, userId) {
    return T.get(`users/show.json?screen_name=${screenName}&user_id=${userId}`)
        .catch(err => {
            console.log('caught error', err.stack);
        })
        .then(result => {
            return result.data;
        });
}

// get 5 most recent follows
function getFollowingData(screenName) {
    return T.get(`friends/list.json?cursor=-1&screen_name=${screenName}&skip_status=true&include_user_entities=false&count=${numberOfInfo}`)
        .catch(err => {
            console.log('caught error', err.stack);
        })
        .then(result => {
            return result.data;
        });
}

// get 5 most recent direct messages
function getDirectMessages() {
    return T.get(`direct_messages.json?count=${numberOfInfo}`)
        .catch(err => {
            console.log('caught error', err.stack);
        })
        .then(result => {
            return result.data;
        });
}

// format timestamps
function formatDate(date) {
    const properDate = new Date(date);
    const currentDate = new Date();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    if (properDate.getFullYear() < currentDate.getFullYear()) {
        let days = properDate.getDate();
        let month = months[properDate.getMonth()].slice(0, 3);
        let year = properDate.getFullYear();
        return `${days} ${month} ${year}`;
    } else if (properDate.getFullYear() === currentDate.getFullYear()) {
        return ta.ago(properDate);
    }
}

