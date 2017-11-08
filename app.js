const express = require('express');
const app = express();
const Twit = require('twit');
const ta = require('time-ago')();
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: false }));

const API_KEYS = require('./config');

const T = new Twit(API_KEYS);
const screenName = 'Alex_Barnett';
const userId = '28107277';
const numberOfInfo = 5;
let dataObj = {};
let messageDates = [];
let data;

function getTweetData() {
    return T.get(`statuses/user_timeline.json?screen_name=${screenName}&count=${numberOfInfo}`)
        .catch(err => {
            console.log('caught error', err.stack);
        })
        .then(result => {
            return result.data;
        });
}

function getProfileData() {
    return T.get(`users/show.json?screen_name=${screenName}&user_id=${userId}`)
        .catch(err => {
            console.log('caught error', err.stack);
        })
        .then(result => {
            return result.data;
        });
}

function getFollowingData() {
    return T.get(`friends/list.json?cursor=-1&screen_name=${screenName}&skip_status=true&include_user_entities=false&count=${numberOfInfo}`)
        .catch(err => {
            console.log('caught error', err.stack);
        })
        .then(result => {
            return result.data;
        });
}

function getDirectMessages() {
    return T.get(`direct_messages.json?count=${numberOfInfo}`)
        .catch(err => {
            console.log('caught error', err.stack);
        })
        .then(result => {
            return result.data;
        });
}
let date = new Date('Thu Aug 23 19:45:07 +0000 2012');
console.log(date.getFullYear());

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


//const tweets = getTwitterData();

app.use('/static', express.static('public'));
app.set('view engine', 'pug');

app.get('/', async function(req, res, next) {
    data = await Promise.all([getProfileData(), getTweetData(), getFollowingData(), getDirectMessages()]);

    if (data !== undefined && data.length === 4) {
        dataObj.profile = data[0];
        let tweets = data[1];
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

app.post('/', (req, res) => {
    const tweet = req.body.tweetEntry;
    T.post('statuses/update', { status: tweet }, async function(err, data, response) {
        data = await Promise.all([getProfileData(), getTweetData(), getFollowingData(), getDirectMessages()]);

        if (data !== undefined && data.length === 4) {
            dataObj.profile = data[0];
            let tweets = data[1];
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
        res.send(dataObj);
    });
});

// Twitter -- GET statuses/user_timeline for latest 5 tweets
// Twitter -- GET friends/ids for latest 5 friends
// Twitter -- GET direct_messages/events/list for latest 5 messages

app.use((req, res, next) => {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
});

app.use((err, req, res, next) => {
    res.locals.error = err;
    res.status(err.status);
    res.render('error', err);
});

app.listen(3000, () => {
    console.log('The application is running on port 3000!');
});

