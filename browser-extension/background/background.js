import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
} from "firebase/auth/web-extension";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { logLocation } from "./geolocation.js";
import firebaseConfig from "./firebaseConfig.js";
import { firebaseAuth } from "./firebaseAuth.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Send a message to content script if the URL changes
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (tab.url && tab.status === "complete" && tab.active) {
    chrome.tabs.sendMessage(tabId, {
      message: "URL changed",
      url: tab.url,
    });
  }
});

// Handle messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handleSearchDetails = async () => {
    try {
      const location = await logLocation(); // Get location before sending request to Facebook Marketplace

      if (request.data.page === "google" || request.data.page === "bing") {
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
        const completion = data.completion;
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
      chrome.tabs.sendMessage(sender.tab.id, {
        message: "Listings",
        query: request.data.query,
        data: fbListings,
      });
      sendResponse({ success: true });
    } catch (error) {
      console.error("Error during searchDetails processing:", error);
      sendResponse({ success: false, error: error.message });
    }
  };

  const handleIsUserSubscribed = async () => {
    try {
      const sessionDetails = await getSessionFromDatabase();
      const user = auth.currentUser;
      if (user) {
        const response = await isUserSubscribed(user.uid);
        if (sender.tab) {
          chrome.tabs.sendMessage(sender.tab.id, {
            message: "isSubscribed",
            isSubscribed: response,
            sessionDetails,
          });
        }
      } else {
        if (sender.tab) {
          chrome.tabs.sendMessage(sender.tab.id, {
            message: "isSubscribed",
            isSubscribed: false,
            sessionDetails,
          });
        }
      }
      sendResponse({ success: true });
    } catch (error) {
      console.error("Error during isUserSubscribed check:", error);
      sendResponse({ success: false, error: error.message });
    }
  };

  async function getSessionFromDatabase() {
    console.log("Getting session details from database...");
    const sessionDetails = {
      isUserSignedIn: false,
      hasSubscription: false,
      isSubscriptionActive: false,
      expiresAt: null,
      toggleStatuses: {
        amazon: true,
        walmart: true,
        takealot: true,
        bol: true,
        temu: true,
        aliexpress: true,
        google: false,
        bing: false,
      },
    };
    const user = auth.currentUser;
    try {
      if (user) {
        await user.getIdToken(true); // Force refresh the token to ensure it is up-to-date
        sessionDetails.isUserSignedIn = true;
        const isSubscribed = await isUserSubscribed(user.uid);
        sessionDetails.hasSubscription = isSubscribed;
        if (isSubscribed) {
          sessionDetails.isSubscriptionActive = true;
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            sessionDetails.expiresAt = userData.expiresAt || null;
            sessionDetails.toggleStatuses.amazon = userData.amazon || false;
            sessionDetails.toggleStatuses.walmart = userData.walmart || false;
            sessionDetails.toggleStatuses.takealot = userData.takealot || false;
            sessionDetails.toggleStatuses.bol = userData.bol || false;
            sessionDetails.toggleStatuses.temu = userData.temu || false;
            sessionDetails.toggleStatuses.aliexpress =
              userData.aliexpress || false;
            sessionDetails.toggleStatuses.google = userData.google || false;
            sessionDetails.toggleStatuses.bing = userData.bing || false;
          }
        } else {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            sessionDetails.toggleStatuses.amazon = userData.amazon || false;
            sessionDetails.toggleStatuses.walmart = userData.walmart || false;
            sessionDetails.toggleStatuses.takealot = userData.takealot || false;
            sessionDetails.toggleStatuses.bol = userData.bol || false;
            sessionDetails.toggleStatuses.temu = userData.temu || false;
            sessionDetails.toggleStatuses.aliexpress =
              userData.aliexpress || false;
            sessionDetails.toggleStatuses.google = userData.google || false;
            sessionDetails.toggleStatuses.bing = userData.bing || false;
          }
        }
      } else {
      }
    } catch (error) {
      console.error("Error handling session details:", error);
    }

    return sessionDetails;
  }

  const getSessionDetails = async () => {
    console.log("Getting session details");
    const sessionDetails = await getSessionFromDatabase();
    sendResponse(sessionDetails);
    return sessionDetails;
  };

  const handleSignIn = async () => {
    console.log("Signing in to Zifty with Google OAuth...");
    const user = await authenticateWithPopup();
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid,
          paidAt: null,
          subscriptionId: null,
          status: null,
          customerId: null,
          amazon: true,
          walmart: true,
          takealot: true,
          bol: true,
          temu: true,
          aliexpress: true,
          google: false,
          bing: false,
        });
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
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error("Sign out failed:", error.message || error);
        sendResponse({ success: false, error: error.message || error });
      });
  };

  const handleCreateSubscription = async () => {
    if (!auth.currentUser) {
      sendResponse({ success: false, error: "User is not signed in." });
    } else {
      sendResponse({ success: true, currentUser: auth.currentUser });
    }
  };

  const handleToggleChange = async (toggleId, isChecked) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("User is not authenticated.");
      }
      const userDocRef = doc(db, "users", user.uid);
      const updateData = {};
      updateData[toggleId] = isChecked;
      await setDoc(userDocRef, updateData, { merge: true });
      return { success: true };
    } catch (error) {
      console.error(
        `Failed to store toggle status for ${toggleId}:`,
        error.message || error
      );
      return { success: false, error: error.message || error };
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
  } else if (request.message === "createSubscription") {
    handleCreateSubscription();
  } else if (request.message === "toggleChange") {
    const { toggleId, isChecked } = request;
    handleToggleChange(toggleId, isChecked);
  }

  return true; // Keep the message channel open for asynchronous response
});

async function authenticateWithPopup() {
  try {
    const authResponse = await firebaseAuth();
    const accessToken = authResponse._tokenResponse.oauthAccessToken;
    const credential = GoogleAuthProvider.credential(null, accessToken);
    const result = await signInWithCredential(auth, credential);
    const user = result.user;
    return user;
  } catch (error) {
    console.error("Popup authentication failed:", error);
  }
}

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
      const userData = userDoc.data();
      const expiresAt = userData.expiresAt;
      if (expiresAt && new Date(expiresAt).getTime() > Date.now()) {
        return true;
      }
      return false;
    }
    return false;
  } catch (error) {
    console.error(
      "Failed to check subscription status:",
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

export { fetchFromFacebookMarketplace, isUserSubscribed }; // Export this for testing
