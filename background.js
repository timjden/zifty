import { logLocation } from "./geolocation.js";

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
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.type === "searchDetails") {
    console.log("Received result:", request.data);
    const location = await logLocation(); // Get location before sending request to Facebook Marketplace
    console.log("Location:", location);
    if (request.data.page === "google") {
      const headers = {
        "Content-Type": "application/json",
      };
      const body = JSON.stringify({ query: request.data.query });
      const response = await fetch(
        "https://faas-lon1-917a94a7.doserverless.co/api/v1/web/fn-34b67a07-1799-4dd9-9c70-2fa0b30b4db9/default/completion",
        {
          method: "POST",
          headers,
          body,
        }
      );
      const data = await response.json();
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
  }
  return true;
});

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

function convertCurrencyCode(price) {
  let formattedPrice = price;

  if (price.includes("ZAR")) {
    formattedPrice = price.replace("ZAR", "R ");
  }

  return formattedPrice;
}

export { fetchFromFacebookMarketplace }; // Export this for testing
