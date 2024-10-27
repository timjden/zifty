import { logLocation } from "./geolocation.js";

// Supported site id's with default toggle states
const defaultToggles = {
  amazon: true,
  walmart: true,
  takealot: true,
  bol: true,
  temu: true,
  aliexpress: true,
  google: true,
  bing: true,
};

// Function to set default toggle states
function setDefaultToggleStates() {
  chrome.storage.sync.set(defaultToggles, function () {
    if (chrome.runtime.lastError) {
      console.error(
        "Error setting default toggle states:",
        chrome.runtime.lastError
      );
    }
  });
}

// Initialize toggles to default toggle state (e.g. 'true') upon installation
chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason === "install") {
    setDefaultToggleStates();
  }
});

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
  // Handle the search query from the content script, send it to Facebook Marketplace, and return the results
  const handleSearchDetails = async () => {
    try {
      const location = await logLocation(); // Get user location before sending request to Facebook Marketplace

      // If the search query comes from a search engine, it typically will be something like "buy [item] near me"
      // This query is too verbose for Facebook Marketplace, so we need to simplify it
      if (request.data.page === "google" || request.data.page === "bing") {
        const headers = {
          "Content-Type": "application/json",
        };
        const body = JSON.stringify({ query: request.data.query });
        // The query is simplified by sending it to a Firebase Function that uses OpenAI's API to generate a completion
        // It will simplify the query from "buy [item] near me" to "[item]", for example
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

      // Fetch Facebook Marketplace listings
      const fbListings = await fetchFromFacebookMarketplace(
        request.data.query,
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        8 // radius
      );

      // After fetching listings from Facebook Marketplace, send them to the content script
      chrome.tabs.sendMessage(sender.tab.id, {
        message: "Listings",
        query: request.data.query,
        data: fbListings,
      });
      sendResponse({ success: true });
    } catch (error) {
      // Or if an error occurs, send the error message to the content script
      console.error("Error fetching listings:", error);
      sendResponse({ success: false, error: error.message });
    }
  };

  // If the user toggles an online store on/off, then the toggle state needs to be updated in local storage
  const handleToggleChange = async (toggleId, isChecked) => {
    // Create an object to store the toggle state
    const toggleState = {};
    toggleState[toggleId] = isChecked;

    // Use Chrome's local storage with sync option
    chrome.storage.sync.set(toggleState, function () {
      if (chrome.runtime.lastError) {
        console.error("Error saving toggle state:", chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError });
        return { success: false, error: chrome.runtime.lastError };
      } else {
        sendResponse({ success: true });
        return { success: true };
      }
    });
  };

  // Handle the request to get the toggle states from local storage
  const handleGetToggleStates = async () => {
    try {
      // Use a promise to fetch all the toggle states from chrome.storage.sync to ensure the data is fetched before returning
      const toggleStates = await new Promise((resolve, reject) => {
        chrome.storage.sync.get(null, function (items) {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(items);
          }
        });
      });

      // Return the fetched toggle states
      sendResponse({ success: true, data: toggleStates });
      return { success: true, data: toggleStates };
    } catch (error) {
      console.error("Error fetching toggle states:", error);
      sendResponse({ success: false, error: error.message });
      return { success: false, error: error.message };
    }
  };

  // Call the appropriate handler based on the message type
  if (request.type === "searchDetails") {
    handleSearchDetails();
  } else if (request.message === "toggleChange") {
    const { toggleId, isChecked } = request;
    handleToggleChange(toggleId, isChecked);
  } else if (request.message === "getToggleStates") {
    handleGetToggleStates();
  }

  return true; // Keep the message channel open for asynchronous response
});

// Function to send search query to Facebook Marketplace API
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
            "https://i.imgur.com/buvAnZH.png", // publicly available image to use as a placeholder if no image is available
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
    console.error("Error fetching listings from Facebook Marketplace:", error);
    listings = [];
    return listings;
  }
}

// Function to convert ZAR currency code to R
function convertCurrencyCode(price) {
  let formattedPrice = price;
  if (price.includes("ZAR")) {
    formattedPrice = price.replace("ZAR", "R ");
  }
  return formattedPrice;
}
