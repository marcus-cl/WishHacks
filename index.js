'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()


let Wit = null;
try {
  // if running from repo
  Wit = require('../').Wit;
} catch (e) {
  Wit = require('node-wit').Wit;
}


const WIT_TOKEN = "AQ6ICT7N5ERNKVZEUAHD6VUKNTKUBG6N"

const actions = {
  send(request, response) {
    // const {sessionId, context, entities} = request;
    // const {text, quickreplies} = response;
    // return new Promise(function(resolve, reject) {
    //   console.log('sending...', JSON.stringify(response));
    //   return resolve();
    // });
    return Promise.resolve();
  },
  search(context, entities) {
    // console.log(entities);
    return new Promise(function(resolve, reject) {
      console.log('entities');
      console.log(entities);
      var query = entities['search_query'][0]['value'];  // firstEntityValue(entities, 'search_query');
      context.products = query;
      console.log(context);
      return resolve(context);
    });
  },
};

// const client = new Wit({WIT_TOKEN, actions});

app.set('port', (process.env.PORT || 5000))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// Process application/json
app.use(bodyParser.json())

// Index route
app.get('/', function (req, res) {
    res.send('Hello world')
})

// for Facebook verification
app.get('/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] === 'wish_chatbot_auth') {
        res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong token')
})

// Spin up the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})

app.post('/webhook/', function (req, res) {
    let messaging_events = req.body.entry[0].messaging
    for (let i = 0; i < messaging_events.length; i++) {
      let event = req.body.entry[0].messaging[i]
      let sender = event.sender.id
      if (event.message && event.message.text) {
        let text = event.message.text
        if (text === 'Generic') {
            sendGenericMessage(sender)
            continue
        }
        // WIT AI TESTING ZONE

        client.message(text, {})
        .then((data) => {
          console.log('Yay, got Wit.ai response: ' + JSON.stringify(data) + " from originally " + text);
          search_query = text;
        })
        .catch(console.error);





        // search_query = client.message(text, {});
        console.log("Search Query " + search_query);
        let url = 'https://wish.com/api/search?query=' + text
        request(url, function (error, response, body) {
            console.log('In request function')
            if (!error && response.statusCode == 200) {
                let body_json = JSON.parse(body)
                let data = body_json['data']['results'][0]
                let product = {}
                product['img_url'] = data['img_url']
                product['id'] = data['id']
                sendProductCards(sender, product)
            }
        })

      }
      if (event.postback) {
        let text = JSON.stringify(event.postback)
        sendTextMessage(sender, "Postback received: "+text.substring(0, 200), token)
        continue
      }
    }
    res.sendStatus(200)
})

const token = "EAAEVbUy97soBAKZAzNylDk2oMymBZBVbxcf1IF9ZBNFZAZBvMOleC7w0kx3StHCZAZBYxWNpgugnuVdEqIiNVG65HZCIK41PutZBjirvjWj4WYALZAxBAZC1eXO6Fd9GsiMse3RRZAToY7SO3LxMfnYGZCyNhGCg6cZB1eOScEXs5KWRiVBAZDZD"

function sendTextMessage(sender, text) {
    let messageData = { text:text }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

function sendProductCards(sender, product) {
    let messageData = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": "First Product",
                    "subtitle": "ID: " + product['id'],
                    "image_url": product['img_url'],
                    "buttons": [{
                        "type": "web_url",
                        "url": "https://www.messenger.com",
                        "title": "web url"
                    }, {
                        "type": "postback",
                        "title": "Postback",
                        "payload": "Payload for first element in a generic bubble",
                    }],
                }]
            }
        }
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}


function sendGenericMessage(sender) {
    let messageData = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": "First card",
                    "subtitle": "Element #1 of an hscroll",
                    "image_url": "http://messengerdemo.parseapp.com/img/rift.png",
                    "buttons": [{
                        "type": "web_url",
                        "url": "https://www.messenger.com",
                        "title": "web url"
                    }, {
                        "type": "postback",
                        "title": "Postback",
                        "payload": "Payload for first element in a generic bubble",
                    }],
                }, {
                    "title": "Second card",
                    "subtitle": "Element #2 of an hscroll",
                    "image_url": "http://messengerdemo.parseapp.com/img/gearvr.png",
                    "buttons": [{
                        "type": "postback",
                        "title": "Postback",
                        "payload": "Payload for second element in a generic bubble",
                    }],
                }]
            }
        }
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

