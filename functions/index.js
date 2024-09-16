const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const crypto = require("crypto"); // Import crypto for signature verification
require("dotenv").config(); // Load environment variables from .env file

const LEMON_SQUEEZY_API_KEY = process.env.LEMON_SQUEEZY_API_KEY;
const LEMON_SQUEEZY_EVENT_SECRET = process.env.LEMON_SQUEEZY_EVENT_SECRET;

admin.initializeApp();

function verifyLemonSqueezySignature(req) {
  const secret = LEMON_SQUEEZY_EVENT_SECRET;
  const hmac = crypto.createHmac("sha256", secret);
  const digest = Buffer.from(hmac.update(req.rawBody).digest("hex"), "utf8");
  const signature = Buffer.from(req.get("X-Signature") || "", "utf8");

  if (!crypto.timingSafeEqual(digest, signature)) {
    throw new Error("Invalid signature.");
  }
}

exports.completion = functions.https.onRequest(async (req, res) => {
  console.log("Received completion request");
  const payload = req.body;
  const query = payload.query || "tongue scraper near me";
  const apiKey = process.env.OPENAI_SECRET;
  const url = "https://api.openai.com/v1/chat/completions";

  const requestHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  const data = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "I want to buy something. I will give you a search query that " +
          "I am using to find that thing. Respond only with the name of the " +
          "thing I want to buy. Discard descriptive information. Discard " +
          "place names (e.g. cities, suburbs etc.). Do not add words that " +
          "are not in the original query.",
      },
      {
        role: "user",
        content: query,
      },
    ],
    temperature: 1,
    max_tokens: 256,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  };

  try {
    const response = await axios.post(url, data, { headers: requestHeaders });
    const completion = response.data;
    console.log("Completion:", completion.choices[0].message.content);

    return res.status(200).json({
      completion: completion.choices[0].message.content,
      args: req.body,
    });
  } catch (error) {
    return res.status(500).json({
      error: `An error occurred: ${error.message}`,
    });
  }
});

exports.handleSubscriptionCreated = functions.https.onRequest(
  async (req, res) => {
    try {
      verifyLemonSqueezySignature(req);

      console.log("Received subscription_created event");
      const body = req.body;
      const event = body.meta.event_name;

      if (event === "subscription_created") {
        const userId = body.meta.custom_data.user_id;
        const paymentDate = body.data.attributes.created_at;
        const subscriptionId = body.data.id;
        const customerId = body.data.attributes.customer_id;
        const expiresAt = body.data.attributes.ends_at;
        const renewsAt = body.data.attributes.renews_at;

        const userDocRef = admin.firestore().collection("users").doc(userId);
        const userDoc = await userDocRef.get();

        if (!userDoc.exists) {
          console.error("No matching user found for uid:", userId);
          return res.status(404).send("No matching user found");
        }

        await userDocRef.set(
          {
            paidAt: paymentDate,
            subscriptionId: subscriptionId,
            customerId: customerId,
            status: "active",
            expiresAt: expiresAt,
            renewsAt: renewsAt,
          },
          { merge: true }
        );

        console.log("Subscription created successfully");
        res.status(200).send("Subscription created successfully");
      } else {
        console.error("Unhandled event type");
        res.status(400).send("Unhandled event type");
      }
    } catch (error) {
      console.error("Error processing event:", error.message || error);
      res.status(500).send("Internal Server Error");
    }
  }
);

exports.handleSubscriptionExpired = functions.https.onRequest(
  async (req, res) => {
    try {
      verifyLemonSqueezySignature(req);

      console.log("Received subscription_expired event");
      if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
      }

      const body = req.body;
      console.log("Body: ", body);
      const event = body.meta.event_name;
      console.log("Event: ", event);

      if (event !== "subscription_expired") {
        return res
          .status(400)
          .send("Bad Request: Event type is not subscription_expired");
      }

      const userId = body.meta.custom_data.user_id;
      const paymentDate = body.data.attributes.created_at;
      const customerId = body.data.attributes.customer_id;

      const userDocRef = admin.firestore().collection("users").doc(userId);
      const userDoc = await userDocRef.get();

      if (!userDoc.exists) {
        console.error("No matching user found for uid:", userId);
        return res.status(404).send("No matching user found");
      }

      await userDocRef.set(
        {
          paidAt: paymentDate,
          customerId: customerId,
          status: "expired",
        },
        { merge: true }
      );

      return res
        .status(200)
        .send("User subscription status updated to expired successfully");
    } catch (error) {
      console.error(
        "Error handling subscription_expired event:",
        error.message || error
      );
      return res.status(500).send("Internal Server Error");
    }
  }
);

function formatDateToCustomISOString(date) {
  const isoString = date.toISOString().split(".")[0];
  const microseconds = "000000";
  const formattedDate = `${isoString}.${microseconds}Z`;
  return formattedDate;
}
