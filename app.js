const express = require('express');
const app = express();
const Twit = require('twit');

const API_KEYS = require('./config');

const T = new Twit(API_KEYS);
const screenName = 'Alex_Barnett';
const userId = '28107277';
const numberOfInfo = 5;

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



//const tweets = getTwitterData();

app.use('/static', express.static('public'));
app.set('view engine', 'pug');

app.get('/', async function(req, res) {
    let dataObj = {};
    const data = await Promise.all([getProfileData(), getTweetData(), getFollowingData(), getDirectMessages()]);
    dataObj.profile = data[0];
    dataObj.tweets = data[1];
    dataObj.followers = data[2];
    dataObj.messages = data[3];
    console.log(dataObj.messages[1].text);
    res.render('index', {dataObj});
});

// Twitter -- GET statuses/user_timeline for latest 5 tweets
// Twitter -- GET friends/ids for latest 5 friends
// Twitter -- GET direct_messages/events/list for latest 5 messages

app.listen(3000, () => {
    console.log('The application is running on port 3000!');
});

