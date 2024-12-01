// Import required modules
require('dotenv').config();
const express = require('express');
const request = require('request');
const axios = require('axios');
const { json, urlencoded } = require('body-parser');

// Create the Express app
const app = express();

// Middleware to parse request bodies
app.use(urlencoded({ extended: true }));
app.use(json());

// Respond with 'Hello World' for GET requests to the homepage
app.get('/', function (_req, res) {
  res.send('Hello World');
});

// Webhook verification endpoint
app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// Webhook handling endpoint
app.post('/webhook', (req, res) => {
  let body = req.body;

  if (body.object === 'page') {
    body.entry.forEach(function (entry) {
      let webhookEvent = entry.messaging[0];
      let senderPsid = webhookEvent.sender.id;
      console.log('Sender PSID:', senderPsid);

      if (webhookEvent.message) {
        handleMessage(senderPsid, webhookEvent.message);
      }
    });
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

// Handles messages events
async function handleMessage(senderPsid, receivedMessage) {
  // Log the received message
  console.log('Received message:', receivedMessage);

  // If the message contains text, search Pinterest for images
  if (receivedMessage.text) {
    console.log('Handling text message:', receivedMessage.text);
    const images = await getPinterestImages(receivedMessage.text);

    if (images && images.length > 0) {
      for (const imageUrl of images) {
        await sendImage(senderPsid, imageUrl);
      }
    } else {
      await sendText(senderPsid, 'Désolé, aucune image trouvée pour votre recherche.');
    }
  }
}

// Sends response messages via the Send API
function sendText(senderPsid, text) {
  const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

  const requestBody = {
    recipient: {
      id: senderPsid,
    },
    message: {
      text,
    },
  };

  return new Promise((resolve, reject) => {
    request(
      {
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: PAGE_ACCESS_TOKEN },
        method: 'POST',
        json: requestBody,
      },
      (err, _res, _body) => {
        if (!err) {
          console.log('Text message sent!');
          resolve();
        } else {
          console.error('Unable to send text message:', err);
          reject(err);
        }
      }
    );
  });
}

function sendImage(senderPsid, imageUrl) {
  const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

  const requestBody = {
    recipient: {
      id: senderPsid,
    },
    message: {
      attachment: {
        type: 'image',
        payload: {
          url: imageUrl,
          is_reusable: true,
        },
      },
    },
  };

  return new Promise((resolve, reject) => {
    request(
      {
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: PAGE_ACCESS_TOKEN },
        method: 'POST',
        json: requestBody,
      },
      (err, _res, _body) => {
        if (!err) {
          console.log('Image sent!');
          resolve();
        } else {
          console.error('Unable to send image:', err);
          reject(err);
        }
      }
    );
  });
}

// Function to get images from Pinterest using an external API
async function getPinterestImages(query) {
  const apiEndpoint = `https://api.kenliejugarap.com/pinterestbymarjhun/?search=${encodeURIComponent(query)}`;

  try {
    const response = await axios.get(apiEndpoint);
    console.log('API response:', response.data);

    if (response.data.status && response.data.data && response.data.data.length > 0) {
      // Return up to 10 image URLs
      return response.data.data.slice(0, 10);
    }
    return null;
  } catch (error) {
    console.error('Error calling Pinterest API:', error);
    return null;
  }
}

// Start the Express server
const listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
