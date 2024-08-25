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
  console.log("Received completion request");
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

exports.resumeSubscription = functions.https.onCall(async (data, context) => {
  console.log("Received resumeSubscription request");
  // Check if the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to resume a subscription.",
    );
  }

  const {subscriptionId} = data;

  console.log("Subscription ID:", subscriptionId);
  console.log(typeof subscriptionId);

  if (!subscriptionId) {
    console.log("Subscription ID is required.");
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Subscription ID is required.",
    );
  }

  try {
    const response = await axios.patch(
        `https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionId}`,
        {
          data: {
            type: "subscriptions",
            id: subscriptionId.toString(),
            attributes: {
              cancelled: false,
            },
          },
        },
        {
          headers: {
            "Accept": "application/vnd.api+json",
            "Content-Type": "application/vnd.api+json",
            "Authorization": `Bearer ${LEMON_SQUEEZY_API_KEY}`,
          },
        },
    );

    console.log("Subscription resumed successfully.");

    return {
      success: true,
      message: "Subscription resumed successfully.",
      data: response.data,
    };
  } catch (error) {
    console.log("Error resuming subscription:", error.response.status);
    // Handle errors
    if (error.response) {
      throw new functions.https.HttpsError(
          "failed-precondition",
          `Failed to resume subscription: ${error.response.data.message}`,
      );
    } else {
      console.log("Unknown error occurred:", error.response.status);
      throw new functions.https.HttpsError(
          "unknown",
          `Unknown error occurred: ${error.message}`,
      );
    }
  }
});

exports.handleSubscriptionCreated = functions.https.onRequest(
    async (req, res) => {
      console.log("Received subscription_created event");
      const body = req.body;
      const event = body.meta.event_name;

      console.log(body);

      // Ensure we're handling the correct type of event
      if (event === "subscription_created") {
        const userEmail = body.data.attributes.user_email;
        const paymentDate = body.data.attributes.created_at;
        const subscriptionId = body.data.id;
        const customerId = body.data.attributes.customer_id;
        const expiresAt = body.data.attributes.ends_at;
        const renewsAt = body.data.attributes.renews_at;
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
                expiresAt: expiresAt,
                renewsAt: renewsAt,
              },
              {merge: true},
          );

          console.log("Subscription created successfully");
          res.status(200).send("Subscription created successfully");
        } catch (error) {
          console.error("Error updating Firestore:", error);
          res.status(500).send("Failed to create subscription");
        }
      } else {
        console.error("Unhandled event type");
        res.status(400).send("Unhandled event type");
      }
    },
);

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
        const expiresAt = body.data.attributes.ends_at;
        const renewsAt = body.data.attributes.renews_at;
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
              customerId: customerId,
              status: "cancelled",
              cancelledAt: formatDateToCustomISOString(new Date()),
              expiresAt: expiresAt,
              renewsAt: renewsAt,
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

exports.handleSubscriptionResumed = functions.https.onRequest(
    async (req, res) => {
      console.log("Received subscription_resumed event");
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

        // Check if the event type is 'subscription_resumed'
        if (event !== "subscription_resumed") {
          return res
              .status(400)
              .send("Bad Request: Event type is not subscription_resumed");
        }

        const userEmail = body.data.attributes.user_email;
        const resumedDate = body.data.attributes.created_at;
        const customerId = body.data.attributes.customer_id;
        const expiresAt = body.data.attributes.ends_at;
        const renewedAt = body.data.attributes.updated_at;
        const renewsAt = body.data.attributes.renews_at;
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
              paidAt: resumedDate,
              customerId: customerId,
              status: "active",
              expiresAt: expiresAt,
              renewsAt: renewsAt,
              renewedAt: renewedAt,
            },
            {merge: true},
        );

        // Respond with success
        return res
            .status(200)
            .send("User subscription status updated to active successfully");
      } catch (error) {
        console.error(
            "Error handling subscription_resumed event:",
            error.message || error,
        );
        return res.status(500).send("Internal Server Error");
      }
    },
);

function formatDateToCustomISOString(date) {
  const isoString = date.toISOString().split(".")[0];
  const microseconds = "000000";
  const formattedDate = `${isoString}.${microseconds}Z`;
  return formattedDate;
}
