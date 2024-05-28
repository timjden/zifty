import { logLocation } from "./geolocation.js";

// Send a message to content.ts if the URL changes
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (tab.url && tab.status === "complete" && tab.active) {
    chrome.tabs.sendMessage(tabId, {
      message: "URL changed",
      url: tab.url,
    });
  }
});

// Receive the search details from content.js
chrome.runtime.onMessage.addListener(async (request, sender) => {
  if (request.type === "searchDetails") {
    console.log("Received result:", request.data);
    const location = await logLocation();
    console.log("Location:", location);
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
      data: fbListings,
    });
  }
  return true;
});

async function fetchFromFacebookMarketplace(query, coordinates, radius) {
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
    let listings = [];

    if (
      !data.data?.marketplace_search?.feed_units?.edges[0]?.node?.listing?.id
    ) {
      listings = [];
    } else {
      listings = data.data.marketplace_search.feed_units.edges.map((edge) => {
        return {
          id: edge.node.listing.id,
          imageSrc: edge.node.listing.primary_listing_photo.image.uri,
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
  }
}

function convertCurrencyCode(price) {
  let formattedPrice = price;

  if (price.includes("ZAR")) {
    formattedPrice = price.replace("ZAR", "R ");
  }

  return formattedPrice;
}

// Geolocation stuff
let creating = null;

async function getGeolocation() {
  await setupOffscreenDocument("/offscreen.html");
  const geolocation = await chrome.runtime.sendMessage({
    type: "get-geolocation",
    target: "offscreen",
  });
  await closeOffscreenDocument();
  return geolocation;
}

async function hasDocument() {
  // Check if the offscreen document already exists
  return await chrome.offscreen.hasDocument();
}

async function setupOffscreenDocument(path) {
  // If the document exists, we skip creation
  if (await hasDocument()) {
    return;
  }

  // Create offscreen document if not already creating one
  if (creating) {
    await creating;
  } else {
    creating = chrome.offscreen.createDocument({
      url: path,
      reasons: [chrome.offscreen.Reason.GEOLOCATION],
      justification: "geolocation access",
    });

    await creating;
    creating = null;
  }
}

async function closeOffscreenDocument() {
  if (!(await hasDocument())) {
    return;
  }
  await chrome.offscreen.closeDocument();
}

export { fetchFromFacebookMarketplace };
