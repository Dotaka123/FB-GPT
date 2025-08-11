// Import required modules
require("dotenv").config();
const express = require("express");
const request = require("request");
const axios = require("axios");
const { json, urlencoded } = require("body-parser");
const path = require("path");

// Create the Express app
const app = express();

// Middleware to parse request bodies
app.use(urlencoded({ extended: true }));
app.use(json());

// Serve HTML on the root path (for Koyeb and status check)
app.get("/", function (_req, res) {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Webhook verification endpoint
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// Webhook handling endpoint
app.post("/webhook", (req, res) => {
  let body = req.body;

  if (body.object === "page") {
    body.entry.forEach(function (entry) {
      let webhookEvent = entry.messaging[0];
      let senderPsid = webhookEvent.sender.id;
      console.log("Sender PSID:", senderPsid);

      if (webhookEvent.message && webhookEvent.message.text) {
        handlePierreMessage(senderPsid, webhookEvent.message.text);
      }
    });

    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});

// Handles messages with Pierre's personality
async function handlePierreMessage(senderPsid, userMessage) {
  console.log("Received from user:", userMessage);

  const pierrePrompt = `
Tu es Pierre, le disciple de Jésus. Tu parles avec passion, honnêteté brute et un cœur brûlant de foi.
Tu n’es pas parfait, parfois impulsif, mais tu es toujours authentique, courageux et fidèle.
Tu défends la vérité avec ardeur, tu corriges avec amour, et tu encourages avec feu.
Tu as été brisé mais rebâti par le Christ.
Voici ce qu'on te dit : "${userMessage}"
Réponds comme Pierre le ferait, avec intensité, sincérité, foi, et des mots simples mais puissants.
  `.trim();

  const uid = senderPsid;
  const apiUrl = `https://kaiz-apis.gleeze.com/api/gpt-4o?ask=${encodeURIComponent(pierrePrompt)}&uid=${uid}&webSearch=off&apikey=f51ff2be-342c-4c5d-afce-b1bfe52f7fe6`;

  try {
    const response = await axios.get(apiUrl);
    const reply =
      response.data?.response ||
      "Je ressens l’Esprit, mais il me manque des mots.";
    const miandry = "Un instant, je prie pour trouver les mots...";
    await sendText(senderPsid, miandry);
    const message = `✝️ *Parole de Pierre* :\n${reply}`;

    await sendText(senderPsid, message);
  } catch (error) {
    console.error("Erreur API Pierre :", error.message);
    await sendText(
      senderPsid,
      "Même Pierre a douté… mais il n’a jamais abandonné. Garde la foi, frère !"
    );
  }
}

// Sends a text message via Messenger
function sendText(senderPsid, text) {
  const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

  const requestBody = {
    recipient: { id: senderPsid },
    message: { text },
  };

  return new Promise((resolve, reject) => {
    request(
      {
        uri: "https://graph.facebook.com/v2.6/me/messages",
        qs: { access_token: PAGE_ACCESS_TOKEN },
        method: "POST",
        json: requestBody,
      },
      (err, _res, _body) => {
        if (!err) {
          console.log("Message envoyé à l’utilisateur.");
          resolve();
        } else {
          console.error("Erreur envoi message :", err);
          reject(err);
        }
      }
    );
  });
}

// Start the Express server
const listener = app.listen(process.env.PORT || 3000, function () {
  console.log("Votre bot est en ligne sur le port " + listener.address().port);
});
