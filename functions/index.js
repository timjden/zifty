const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
require("dotenv").config(); // Load environment variables from .env file

// Get the API key from the .env file
const LEMON_SQUEEZY_API_KEY = process.env.LEMON_SQUEEZY_API_KEY;

// Initialize the Firebase Admin SDK
admin.initializeApp();
// const db = admin.firestore();

exports.completion = functions.https.onRequest(async (req, res) => {
  const payload = req.body;
  const query = payload.query || "tongue scraper near me";
  const apiKey = process.env.OPENAI_SECRET;
  const url = "https://api.openai.com/v1/chat/completions";

  const requestHeaders = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`,
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
    const response = await axios.post(url, data, {headers: requestHeaders});
    const completion = response.data;

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

exports.handleLemonSqueezyWebhook = functions.https.onRequest(
    async (req, res) => {
      console.log("Received subscription_payment_success event");
      const body = req.body;
      const event = body.meta.event_name;

      // Ensure we're handling the correct type of event
      if (event === "subscription_payment_success") {
        const userEmail = body.data.attributes.user_email;
        const paymentDate = body.data.attributes.created_at;
        const subscriptionId = body.data.attributes.subscription_id;
        const customerId = body.data.attributes.customer_id;
        // const status = body.data.attributes.status;

        try {
        // Query Firestore to find the user document by email
          const usersCollection = admin.firestore().collection("users");
          const querySnapshot = await usersCollection
              .where("email", "==", userEmail)
              .limit(1)
              .get();

          if (querySnapshot.empty) {
            console.error("No matching user found for email:", userEmail);
            return res.status(404).send("No matching user found");
          }

          const userDocRef = querySnapshot.docs[0].ref;

          await userDocRef.set(
              {
                paidAt: paymentDate,
                subscriptionId: subscriptionId,
                customerId: customerId,
                status: "active",
              },
              {merge: true},
          );

          console.log("Payment recorded successfully");
          res.status(200).send("Payment recorded successfully");
        } catch (error) {
          console.error("Error updating Firestore:", error);
          res.status(500).send("Failed to record payment");
        }
      } else {
        console.error("Unhandled event type or invalid payment status");
        res.status(400).send("Unhandled event type or invalid payment status");
      }
    },
);

exports.cancelSubscription = functions.https.onCall(async (data, context) => {
  // Check if the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to cancel a subscription.",
    );
  }

  const {subscriptionId} = data;

  if (!subscriptionId) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Subscription ID is required.",
    );
  }

  try {
    const response = await axios.delete(
        `https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionId}`,
        {
          headers: {
            "Accept": "application/vnd.api+json",
            "Content-Type": "application/vnd.api+json",
            "Authorization": `Bearer ${LEMON_SQUEEZY_API_KEY}`,
          },
        },
    );

    console.log("Subscription cancelled successfully.");
    console.log(response.data);

    return {
      success: true,
      message: "Subscription cancelled successfully.",
      data: response.data,
    };
  } catch (error) {
    // Handle errors
    if (error.response) {
      throw new functions.https.HttpsError(
          "failed-precondition",
          `Failed to cancel subscription: ${error.response.data.message}`,
      );
    } else {
      throw new functions.https.HttpsError(
          "unknown",
          `Unknown error occurred: ${error.message}`,
      );
    }
  }
});

exports.handleSubscriptionCancelled = functions.https.onRequest(
    async (req, res) => {
      console.log("Received subscription_cancelled event");
      try {
      // Verify that the request is a POST request
        if (req.method !== "POST") {
          return res.status(405).send("Method Not Allowed");
        }

        // Signature verification logic removed

        const body = req.body;
        console.log("Body: ", body);
        const event = body.meta.event_name;
        console.log("Event: ", event);
        // const status = body.data.attributes.status;
        // console.log("Status: ", status);

        // Check if the event type is 'subscription_cancelled'
        if (event !== "subscription_cancelled") {
          return res
              .status(400)
              .send("Bad Request: Event type is not subscription_cancelled");
        }

        const userEmail = body.data.attributes.user_email;
        const paymentDate = body.data.attributes.created_at;
        const customerId = body.data.attributes.customer_id;
        const usersCollection = admin.firestore().collection("users");
        const querySnapshot = await usersCollection
            .where("email", "==", userEmail)
            .limit(1)
            .get();

        if (querySnapshot.empty) {
          console.error("No matching user found for email:", userEmail);
          return res.status(404).send("No matching user found");
        }

        const userDocRef = querySnapshot.docs[0].ref;

        await userDocRef.set(
            {
              paidAt: paymentDate,
              subscriptionId: null,
              customerId: customerId,
              status: "cancelled",
            },
            {merge: true},
        );

        // Respond with success
        res.status(200).send("User subscription status updated successfully");
      } catch (error) {
        console.error(
            "Error handling subscription_cancelled event:",
            error.message || error,
        );
        res.status(500).send("Internal Server Error");
      }
    },
);

exports.handleSubscriptionExpired = functions.https.onRequest(
    async (req, res) => {
      console.log("Received subscription_expired event");
      try {
      // Verify that the request is a POST request
        if (req.method !== "POST") {
          return res.status(405).send("Method Not Allowed");
        }

        // Signature verification logic removed

        const body = req.body;
        console.log("Body: ", body);
        const event = body.meta.event_name;
        console.log("Event: ", event);
        // const status = body.data.attributes.status;
        // console.log("Status: ", status);

        // Check if the event type is 'subscription_expired'
        if (event !== "subscription_expired") {
          return res
              .status(400)
              .send("Bad Request: Event type is not subscription_expired");
        }

        const userEmail = body.data.attributes.user_email;
        const paymentDate = body.data.attributes.created_at;
        const customerId = body.data.attributes.customer_id;
        const usersCollection = admin.firestore().collection("users");
        const querySnapshot = await usersCollection
            .where("email", "==", userEmail)
            .limit(1)
            .get();

        if (querySnapshot.empty) {
          console.error("No matching user found for email:", userEmail);
          return res.status(404).send("No matching user found");
        }

        const userDocRef = querySnapshot.docs[0].ref;

        await userDocRef.set(
            {
              paidAt: paymentDate,
              subscriptionId: null,
              customerId: customerId,
              status: "expired",
            },
            {merge: true},
        );

        // Respond with success
        return res
            .status(200)
            .send("User subscription status updated to expired successfully");
      } catch (error) {
        console.error(
            "Error handling subscription_expired event:",
            error.message || error,
        );
        return res.status(500).send("Internal Server Error");
      }
    },
);
