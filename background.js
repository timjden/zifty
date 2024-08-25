import { logLocation } from "./geolocation.js";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithCredential,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyDgWfdkRTROBGq2JjNzZmRVldgdr8iayLg",
  authDomain: "zifty-4e74a.firebaseapp.com",
  projectId: "zifty-4e74a",
  storageBucket: "zifty-4e74a.appspot.com",
  messagingSenderId: "453820350601",
  appId: "1:453820350601:web:26cc05e968085de657c658",
  measurementId: "G-VEL4KBV88V",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

console.log("Zifty background script is running.");

// Send a message to content script if the URL changes
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (tab.url && tab.status === "complete" && tab.active) {
    chrome.tabs.sendMessage(tabId, {
      message: "URL changed",
      url: tab.url,
    });
  }
});

// Receive the search details from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handleSearchDetails = async () => {
    try {
      console.log("Received result:", request.data);
      const location = await logLocation(); // Get location before sending request to Facebook Marketplace
      console.log("Location:", location);

      if (request.data.page === "google") {
        const headers = {
          "Content-Type": "application/json",
        };
        const body = JSON.stringify({ query: request.data.query });
        const response = await fetch(
          "https://us-central1-zifty-4e74a.cloudfunctions.net/completion",
          {
            method: "POST",
            headers,
            body,
          }
        );
        const data = await response.json();
        console.log("Data:", data);
        const completion = data.completion;
        console.log("Completion:", completion);
        request.data.query = completion.toLowerCase().trim();
      }

      const fbListings = await fetchFromFacebookMarketplace(
        request.data.query,
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        8 // radius
      );
      console.log("Number of listings:", fbListings.length);
      chrome.tabs.sendMessage(sender.tab.id, {
        message: "Listings",
        query: request.data.query,
        data: fbListings,
      });
      sendResponse({ success: true }); // Send a response to indicate completion
    } catch (error) {
      console.error("Error during searchDetails processing:", error);
      sendResponse({ success: false, error: error.message });
    }
  };

  const handleIsUserSubscribed = async () => {
    try {
      console.log("Checking if user is subscribed...");
      const user = auth.currentUser;
      if (user) {
        console.log("User:", user);
        const response = await isUserSubscribed(user.uid);
        console.log("User is subscribed:", response);
        if (sender.tab) {
          chrome.tabs.sendMessage(sender.tab.id, {
            message: "isSubscribed",
            isSubscribed: response,
          });
        }
      } else {
        console.log("User is not signed in.");
        if (sender.tab) {
          chrome.tabs.sendMessage(sender.tab.id, {
            message: "isSubscribed",
            isSubscribed: false,
          });
        }
      }
      sendResponse({ success: true });
    } catch (error) {
      console.error("Error during isUserSubscribed check:", error);
      sendResponse({ success: false, error: error.message });
    }
  };

  const getSessionDetails = async () => {
    const sessionDetails = {
      isUserSignedIn: false,
      hasSubscription: false,
      isSubscriptionActive: false,
      isSubscriptionCancelled: false,
    };

    try {
      const user = await new Promise((resolve, reject) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
          unsubscribe(); // Stop listening once we've got the auth state
          resolve(user);
        }, reject);
      });

      if (user) {
        console.log("User:", user);
        sessionDetails.isUserSignedIn = true;

        const isSubscribed = await isUserSubscribed(user.uid);
        sessionDetails.hasSubscription = isSubscribed;

        if (isSubscribed) {
          const isCancelled = await isUserCancelled(user.uid);
          sessionDetails.isSubscriptionActive = !isCancelled;
          sessionDetails.isSubscriptionCancelled = isCancelled;

          console.log(
            isCancelled
              ? "User has cancelled their subscription but still has access."
              : "User has a subscription and has not cancelled."
          );
        } else {
          console.log("User is not subscribed.");
        }
      } else {
        console.log("User is not signed in.");
      }
    } catch (error) {
      console.error("Error handling session details:", error);
    }

    sendResponse(sessionDetails); // Send the response after all async operations
  };

  const handleSignIn = async () => {
    try {
      chrome.identity.clearAllCachedAuthTokens(function () {});

      const token = await new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
          if (chrome.runtime.lastError || !token) {
            reject(
              "User cancelled the sign-in process or closed the login window."
            );
          } else {
            resolve(token);
          }
        });
      });

      const credential = GoogleAuthProvider.credential(null, token);
      const result = await signInWithCredential(auth, credential);
      const user = result.user;

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          paidAt: null,
          cancelledAt: null,
          subscriptionId: null,
          status: null,
          customerId: null,
        });
        console.log("User added to Firestore:", user.uid);
      }

      sendResponse({ success: true });
    } catch (error) {
      console.error("Firebase Google Sign-In failed:", error);
      sendResponse({ success: false, error: error.message || error });
    }
  };

  const handleSignOut = async () => {
    signOut(auth)
      .then(() => {
        console.log("User signed out successfully.");
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error("Sign out failed:", error.message || error);
        sendResponse({ success: false, error: error.message || error });
      });
  };

  const handleResume = async () => {
    try {
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const subscriptionId = userData.subscriptionId;

        if (!subscriptionId) {
          throw new Error("No subscription ID found for this user.");
        }

        const resumeSubscription = httpsCallable(
          functions,
          "resumeSubscription"
        );

        await resumeSubscription({ subscriptionId })
          .then(async (result) => {
            console.log("Subscription resumed:", result.data);

            // Start polling to check for the updated renewedAt timestamp
            await pollForUpdate(userDocRef, "renewedAt", (renewedAt) => {
              if (renewedAt) {
                const renewedAtTime = new Date(renewedAt).getTime();
                const currentTime = Date.now();
                const threshold = 5000; // 10 seconds threshold
                return currentTime - renewedAtTime <= threshold;
              }
              return false;
            });

            sendResponse({ success: true });
          })
          .catch((error) => {
            sendResponse({ success: false, error: error.message });
            console.error("Error resuming subscription:", error.message);
            throw new Error("Failed to resume the subscription.");
          });
      } else {
        sendResponse({
          success: false,
          error: "User document does not exist.",
        });
        throw new Error("User document does not exist.");
      }
    } catch (error) {
      console.error("Failed to resume subscription:", error.message || error);
      sendResponse({ success: false, error: error.message || error });
    }
  };

  const handleCancel = async () => {
    try {
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const subscriptionId = userData.subscriptionId;

        if (!subscriptionId) {
          sendResponse({
            success: false,
            error: "No subscription ID found for this user.",
          });
          throw new Error("No subscription ID found for this user.");
        }

        const cancelSubscription = httpsCallable(
          functions,
          "cancelSubscription"
        );

        await cancelSubscription({ subscriptionId })
          .then(async (result) => {
            console.log("Subscription cancelled:", result.data);

            // Start polling to check for the updated cancelledAt timestamp
            await pollForUpdate(userDocRef, "cancelledAt", (cancelledAt) => {
              if (cancelledAt) {
                const cancelledAtTime = new Date(cancelledAt).getTime();
                const currentTime = Date.now();
                const threshold = 5000; // 10 seconds threshold
                return currentTime - cancelledAtTime <= threshold;
              }
              return false;
            });

            sendResponse({ success: true });
          })
          .catch((error) => {
            console.error("Error canceling subscription:", error.message);
            sendResponse({ success: false, error: error.message });
            throw new Error("Failed to cancel the subscription.");
          });
      } else {
        sendResponse({
          success: false,
          error: "User document does not exist.",
        });
        throw new Error("User document does not exist.");
      }
    } catch (error) {
      console.error("Failed to cancel subscription:", error.message || error);
      sendResponse({ success: false, error: error.message || error });
    }
  };

  const handleCreateSubscription = async () => {
    if (!auth.currentUser) {
      sendResponse({ success: false, error: "User is not signed in." });
    } else {
      sendResponse({ success: true, currentUser: auth.currentUser });
    }
  };

  if (request.type === "searchDetails") {
    handleSearchDetails();
  } else if (request.message === "isUserSubscribed") {
    handleIsUserSubscribed();
  } else if (request.message === "getSessionDetails") {
    getSessionDetails();
  } else if (request.message === "signIn") {
    handleSignIn();
  } else if (request.message === "signOut") {
    handleSignOut();
  } else if (request.message === "resumeSubscription") {
    handleResume();
  } else if (request.message === "cancelSubscription") {
    handleCancel();
  } else if (request.message === "createSubscription") {
    handleCreateSubscription();
  }

  return true; // Keep the message channel open for asynchronous response
});

const pollForUpdate = async (
  docRef,
  fieldName,
  checkUpdateCondition,
  interval = 1000,
  maxAttempts = 10
) => {
  let attempts = 0;

  while (attempts < maxAttempts) {
    const docSnapshot = await getDoc(docRef);
    if (docSnapshot.exists()) {
      const docData = docSnapshot.data();
      const fieldValue = docData[fieldName];

      if (checkUpdateCondition(fieldValue)) {
        // If the field satisfies the condition, stop polling
        return;
      }
    }

    // Wait for the specified interval before checking again
    await new Promise((resolve) => setTimeout(resolve, interval));

    attempts++;
  }

  // If maxAttempts is reached and the condition is not met, throw an error
  throw new Error(`Timeout: ${fieldName} was not updated in time.`);
};

async function fetchFromFacebookMarketplace(query, coordinates, radius) {
  let listings = [];
  try {
    const url = "https://www.facebook.com/api/graphql/";

    const headers = {
      "sec-fetch-site": "same-origin",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36 Edg/116.0.1938.62",
      "content-type": "application/x-www-form-urlencoded",
    };

    const variables = {
      buyLocation: {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      },
      contextual_data: null,
      count: 24,
      cursor: null,
      params: {
        bqf: { callsite: "COMMERCE_MKTPLACE_WWW", query: query },
        browse_request_params: {
          commerce_enable_local_pickup: true,
          commerce_enable_shipping: true,
          commerce_search_and_rp_category_id: [],
          commerce_search_and_rp_condition: null,
          commerce_search_and_rp_ctime_days: null,
          filter_location_latitude: coordinates.latitude,
          filter_location_longitude: coordinates.longitude,
          filter_price_lower_bound: 0,
          filter_price_upper_bound: 214748364700,
          filter_radius_km: radius,
        },
        custom_request_params: {
          browse_context: null,
          contextual_filters: [],
          referral_code: null,
          saved_search_strid: null,
          search_vertical: "C2C",
          seo_url: null,
          surface: "SEARCH",
          virtual_contextual_filters: [],
        },
      },
      savedSearchID: null,
      savedSearchQuery: query,
      scale: 1,
      shouldIncludePopularSearches: false,
      topicPageParams: {
        location_id: "",
        url: null,
      },
    };

    const payload = `variables=${encodeURIComponent(
      JSON.stringify(variables)
    )}&doc_id=7897349150275834&server_timestamps=true&fb_dtsg=`;

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: payload,
      credentials: "omit",
    });
    const data = await response.json();

    if (
      !data.data?.marketplace_search?.feed_units?.edges[0]?.node?.listing?.id
    ) {
      listings = [];
    } else {
      listings = data.data.marketplace_search.feed_units.edges.map((edge) => {
        return {
          id: edge.node.listing.id,
          imageSrc:
            edge.node.listing.primary_listing_photo?.image?.uri ||
            "https://i.imgur.com/buvAnZH.png",
          link: `https://www.facebook.com/marketplace/item/${edge.node.listing.id}`,
          title: edge.node.listing.marketplace_listing_title,
          price: convertCurrencyCode(
            edge.node.listing.listing_price.formatted_amount
          ),
          location: edge.node.listing.location.reverse_geocode.city,
        };
      });
    }

    return listings;
  } catch (error) {
    console.error("Error fetching from Marketplace:", error);
    listings = [];
    return listings;
  }
}

async function isUserSubscribed(uid) {
  try {
    const userDocRef = doc(db, "users", uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      console.log("User exists in Firestore:", uid);
      const userData = userDoc.data();
      const status = userData.status;

      console.log("Subscription status:", status);

      if (status === "active" || status === "cancelled") {
        return true; // User is a subscriber
      } else if (status === "expired") {
        return false; // User is not a subscriber
      }
    }

    return false; // User does not exist or no status field
  } catch (error) {
    console.error(
      "Failed to check subscription status:",
      error.message || error
    );
    return false;
  }
}

async function isUserCancelled(uid) {
  try {
    const userDocRef = doc(db, "users", uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      console.log("User exists in Firestore:", uid);
      const userData = userDoc.data();
      const status = userData.status;

      console.log("Subscription status:", status);

      if (status === "cancelled") {
        return true; // User has cancelled their subscription
      }
    }

    return false; // User has not cancelled or does not exist
  } catch (error) {
    console.error(
      "Failed to check cancellation status:",
      error.message || error
    );
    return false;
  }
}

function convertCurrencyCode(price) {
  let formattedPrice = price;

  if (price.includes("ZAR")) {
    formattedPrice = price.replace("ZAR", "R ");
  }

  return formattedPrice;
}

export { fetchFromFacebookMarketplace, isUserSubscribed, isUserCancelled }; // Export this for testing
