/**
 * Copyright 2021-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Messenger Platform Quick Start Tutorial
 *
 * This is the completed code for the Messenger Platform quick start tutorial
 *
 * https://developers.facebook.com/docs/messenger-platform/getting-started/quick-start/
 *
 * To run this code, you must do the following:
 *
 * 1. Deploy this code to a server running Node.js
 * 2. Run `yarn install`
 * 3. Add your VERIFY_TOKEN and PAGE_ACCESS_TOKEN to your environment vars
 */

'use strict';

// Use dotenv to read .env vars into Node
require('dotenv').config();

// Imports dependencies and set up http server
const request = require('request');
const express = require('express');
const { urlencoded, json } = require('body-parser');
const axios = require('axios');
const app = express();

// Parse application/x-www-form-urlencoded
app.use(urlencoded({ extended: true }));

// Parse application/json
app.use(json());

// Respond with 'Hello World' when a GET request is made to the homepage
app.get('/', function (_req, res) {
  res.send('Hello World');
});

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

  // Your verify token. Should be a random string.
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  // Parse the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  // Checks if a token and mode are in the query string of the request
  if (mode && token) {

    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {

      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);

    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});

// Creates the endpoint for your webhook
app.post('/webhook', (req, res) => {
  let body = req.body;

  // Checks if this is an event from a page subscription
  if (body.object === 'page') {

    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function (entry) {

      // Gets the body of the webhook event
      let webhookEvent = entry.messaging[0];
      console.log('Webhook Event:', webhookEvent);

      // Get the sender PSID
      let senderPsid = webhookEvent.sender.id;
      console.log('Sender PSID: ' + senderPsid);

      // Check if the event is a message or postback and
      // pass the event to the appropriate handler function
      if (webhookEvent.message) {
        handleMessage(senderPsid, webhookEvent.message);
      } else if (webhookEvent.postback) {
        handlePostback(senderPsid, webhookEvent.postback);
      }
    });

    // Returns a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED');
  } else {

    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }
});

// Handles messages events
async function handleMessage(senderPsid, receivedMessage) {
  let response;

  // Log the received message to check if the bot is receiving the message correctly
  console.log('Received message:', receivedMessage);

  // Check if the message contains text
  if (receivedMessage.text) {
    console.log('Handling text message:', receivedMessage.text);
    response = await askPinterest(receivedMessage.text);
    
    console.log('Response from Pinterest API:', response);  // Log the response from Pinterest API
  } else if (receivedMessage.attachments) {
    // If the message contains attachments, handle it
    let attachmentUrl = receivedMessage.attachments[0].payload.url;
    response = {
      'attachment': {
        'type': 'template',
        'payload': {
          'template_type': 'generic',
          'elements': [{
            'title': "Sorry, I can't read images.",
            'image_url': attachmentUrl
          }]
        }
      }
    };
  }

  // Send the response message
  if (response) {
    callSendAPI(senderPsid, response);
  } else {
    console.error('No response generated.');
  }
}

// Handles messaging_postbacks events
function handlePostback(senderPsid, receivedPostback) {
  let response;

  // Get the payload for the postback
  let payload = receivedPostback.payload;

  // Set the response based on the postback payload
  if (payload === 'yes') {
    response = { 'text': 'Thanks!' };
  } else if (payload === 'no') {
    response = { 'text': 'Oops, try sending another image.' };
  }
  // Send the message to acknowledge the postback
  callSendAPI(senderPsid, response);
}

// Sends response messages via the Send API
function callSendAPI(senderPsid, response) {
  // The page access token we have generated in your app settings
  const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

  // Construct the message body
  let requestBody = {
    'recipient': {
      'id': senderPsid
    },
    'message': response
  };

  // Send the HTTP request to the Messenger Platform
  request({
    'uri': 'https://graph.facebook.com/v2.6/me/messages',
    'qs': { 'access_token': PAGE_ACCESS_TOKEN },
    'method': 'POST',
    'json': requestBody
  }, (err, _res, _body) => {
    if (!err) {
      console.log('Message sent!');
    } else {
      console.error('Unable to send message:', err);
    }
  });
}

// New function to interact with the external Pinterest API
async function askPinterest(query) {
  const apiEndpoint = `https://api.kenliejugarap.com/pinterestbymarjhun/?search=${encodeURIComponent(query)}`;

  try {
    // Sending a GET request to the Pinterest API
    const response = await axios.get(apiEndpoint);

    // Log the API response to check the structure
    console.log('API response:', response.data);

    // Check if the response is valid and has the data
    if (response.data.status && response.data.data && response.data.data.length > 0) {
      // Prepare a response with a list of image URLs
      let imageUrls = response.data.data.slice(0, 5).map(url => ({
        'title': 'Image',
        'image_url': url,
        'buttons': [{
          'type': 'postback',
          'title': 'Show More',
          'payload': 'more_images'
        }]
      }));

      return {
        'attachment': {
          'type': 'template',
          'payload': {
            'template_type': 'generic',
            'elements': imageUrls
          }
        }
      };
    } else {
      return 'Sorry, no images found for your search.';
    }
  } catch (error) {
    console.error('Error while calling Pinterest API:', error);
    return 'Sorry, there was an error while fetching images.';
  }
}

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
