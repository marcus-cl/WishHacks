'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()

console.log("Starting!!!")


let Wit = null;
let log = null;
try {
  // if running from repo
  console.log("try")
  Wit = require('../').Wit;
  log = require('../').log;
} catch (e) {
    console.log("catch")
  Wit = require('node-wit').Wit;
  log = require('node-wit').log;
}


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
      console.log(JSON.stringify(entities, null, 2));
      console.log(entities['search_query'])

      var query = entities['search_query'][0]['value'];  // firstEntityValue(entities, 'search_query');
      context.products = query;
      console.log(context);
      return resolve(context);
    });
  },
};

console.log("Creating WITAI client");


var WIT_TOKEN = "LXMANMMFUEL5PH3S4YTZ2RVFZX3S6B5P"
WIT_TOKEN = WIT_TOKEN.split('').reverse().join('');

const client = new Wit({
  accessToken: WIT_TOKEN,
  actions,
  logger: new log.Logger(log.INFO)
});
console.log("Created WITAI client successfully");

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

function makeWishRequest(sender, search_query) {
    // is called inside wit.ai callback?
    console.log("makeWishRequest")
    let url = 'https://wish.com/api/search?query=' + search_query
    url += "&count=" + MAX_PRODUCTS
    url += "&picture_size=original"

        try{
            request(url, function (error, response, body) {
                console.log('In request function')
                console.log(error);
                console.log(response.statusCode);
                console.log(url);
                if (!error && response.statusCode == 200) {
                    // console.log(body);
                    let body_json = JSON.parse(body)
                    console.log("Parsed Json");
                    var pretty_json = JSON.stringify(body_json, null, 2);
                    // console.log(pretty_json)

                    let data = body_json['data']['results']
                    var products = []
                    for (var i=0; i < data.length; i++) {
                    	var item = {
							img_url: data[i]['img_url'],
							id:	data[i]['id']
						};
						products.push(item);
                        // products[i]['img_url'] = data['img_url']
                        // products[i]['id'] = data['id']
                        console.log("products that are blank")
                       	console.log(JSON.stringify(products, null, 2));
                    }
                    console.log(data.length + " items to be shown");
                    console.log("sending_message");
                    if (data.length  > 0) {
                        sendTextMessage(sender, "Here, take a look at our " + search_query, token);
                        sendProductCards(sender, products);
                    } else {
                        sendTextMessage(sender, "I'm afraid we don't have any " + search_query, token);
                    }
                }
            })
        } catch(e) {
            console.log('Errored out ' + e)
            sendTextMessage(sender, "Sorry, I didn't understand your request", token)
        }
}

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
          console.log('Yay, got Wit.ai response: \n' + JSON.stringify(data['entities']['search_query'], null, 2) + " from originally " + text);
          var search_query = data['entities']['search_query'][0].value;
          console.log("query: " + search_query);
          makeWishRequest(sender, search_query)
        })
        .catch(console.error);

      }
      if (event.postback) {
        let text = JSON.stringify(event.postback)
        sendTextMessage(sender, "Postback received: "+text.substring(0, 200), token)
        continue
      }
    }
    res.sendStatus(200)
})



var token = "DZDZABViRWK5sXEcSOe1BZc6gCGhNyCZGYnfMxL3OS7YoTAZRR3esMisG9dF6OXe1CZABxAZLAYW4jWjvrijBZtuP14KICZH56GVNiIqEdVungugpNWxYBZAZCHtS3xk0w7CelOMvBZAZFNBZ9FI1fcxbVBZBmyMo2kDlyNzAZKABos79yUbVEAAE"
token = token.split('').reverse().join('');

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

function sendProductCards(sender, products) {
    console.log(JSON.stringify(products, null, 2));
    let elements = []
    for (var i=0; i<products.length; i++) {
        var product = products[i];
        elements[i] = {
            // "title": "First Product",
            "subtitle": "ID: " + product['id'],
            "image_url": product['img_url'],
            "buttons": [{
                "type": "web_url",
                "url": "https://www.wish.com/c/" + product['id'],
                "title": "Product Link"
            }, {
                "type": "postback",
                "title": "Details",
                "payload": "TODO: show details for  " + product['id'],
            }]
        }
    }
    let messageData = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": elements,
                
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

