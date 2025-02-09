let listingsData; // Place to store the listings received from background (e.g. Facebook Marketplace API)
let currentSearchDetails = { page: null, query: null }; // Place to store the user's search query and the page they are on
let sendingSearchDetailsToBackground = false; // Flag to prevent multiple, concurrent requests for listings (due to simultaneous URL change and page load)
let ziftyOverlay; // Holds the Zifty overlay element

// Delete the overlay if the user navigates away from a supported site
isSupportedSite().then((supported) => {
  if (!supported) {
    const overlay = document.getElementById("zifty-overlay");
    if (overlay) {
      overlay.style.animation = "hide 0.5s forwards"; // Hides the overlay
    }
  }
});

// When a page loads, send a message to the background script asking for the relevant listings
window.addEventListener("load", () => {
  // Always remove the overlay when the page loads
  const overlay = document.getElementById("zifty-overlay");
    if (overlay) {
      document.body.removeChild(overlay);
    }
  isSupportedSite().then((supported) => {
    if (!supported) {
      return;
    }

    if (!sendingSearchDetailsToBackground) {
      const searchDetails = getSearchDetails();

      // If the search query is null, hide the overlay if it exists and return
      if (searchDetails.query == null) {
        const overlay = document.getElementById("zifty-overlay");
        if (overlay) {
          overlay.style.animation = "hide 0.5s forwards"; // Hides the overlay
        }
        return
      }

      // If the search query is the same as the previous search query (e.g., URL changes due to pagination), return instead of re-fetching listings and re-creating the overlay
      if (searchDetails.query === currentSearchDetails.query) {
        if (!document.getElementById("zifty-overlay")) {
          ziftyOverlay = createZiftyOverlay();
          populateOverlay(
            { data: listingsData, query: searchDetails.query },
            ziftyOverlay
          );
        }
        return;
      }
      currentSearchDetails = sendSearchDetailsToBackground(searchDetails); // Sends search details to background
    } else {
      return;
    }

    ziftyOverlay = createZiftyOverlay();
  });
});

// When the URL changes, send a message to the background script asking for relevant listings
chrome.runtime.onMessage.addListener((request) => {
  if (request.message === "URL changed") {
    // But if the site is not supported, hide the overlay
    isSupportedSite().then((supported) => {
      if (!supported) {
        try {
          const overlay = document.getElementById("zifty-overlay");
          if (overlay) {
            overlay.style.animation = "hide 0.5s forwards"; // Hides the overlay
          }
        } catch (error) {
          console.error("Error removing overlay", error);
        }
        return;
      }

      if (!sendingSearchDetailsToBackground) {
        const searchDetails = getSearchDetails();

        // If the search query is null, hide the overlay if it exists and return
        if (searchDetails.query == null) {
          const overlay = document.getElementById("zifty-overlay");
          if (overlay) {
            overlay.style.animation = "hide 0.5s forwards"; // Hides the overlay
          }
          return
        }

        // If the search query is the same as the previous search query (e.g., URL changes due to pagination), return
        if (searchDetails.query === currentSearchDetails.query) {
          const overlay = document.getElementById("zifty-overlay")
          // If search query is the same as the previous search query but the overlay does not exist, create the overlay
          if (!overlay.style.animation.includes("popUp")) {
            ziftyOverlay = createZiftyOverlay();
            populateOverlay(
              { data: listingsData, query: searchDetails.query },
              ziftyOverlay
            );
          }
          return;
        }

        currentSearchDetails = sendSearchDetailsToBackground(searchDetails); // Sends search details to background
      } else {
        return;
      }

      ziftyOverlay = createZiftyOverlay();
    });
  }
});

// Now listen for when the background script has got the listings from Facebook Marketplace and is ready to send them to content
chrome.runtime.onMessage.addListener(async (request) => {
  if (request.message === "Listings") {
    sendingSearchDetailsToBackground = false; // Set the flag to false after receiving the listings

    // If the listings are the same as the previous listings, return
    if (listingsData === request.data) {
      return;
    }
    listingsData = request.data; // Otherwise update listingsData with the new listings

    // Then populate the Zifty overlay with the listings
    populateOverlay(request, ziftyOverlay);
  }
});

function createZiftyOverlay() {
  if (document.getElementById("zifty-overlay")) {
    const overlay = document.getElementById("zifty-overlay")
    document.body.removeChild(overlay)
  }
  const overlay = createOverlay();
  overlay.style.animation = "popUp 0.5s forwards";
  injectStylesheet();
  return overlay;
}

function sendSearchDetailsToBackground(searchDetails) {
  // Only send the message if it has not been sent already
  if (!sendingSearchDetailsToBackground) {
    const message = { type: "searchDetails", data: searchDetails };
    chrome.runtime.sendMessage(message);
    sendingSearchDetailsToBackground = true; // Set the flag to true after sending the message
  }
  return searchDetails;
}

function getSearchDetails() {
  let searchDetails = { page: null, query: null };
  const url = new URL(window.location.href);
  const hostname = url.hostname;

  // Here we define the rules for extracting the search query from each supported site
  if (/\.amazon\./.test(hostname)) {
    searchDetails.page = "amazon";
    searchDetails.query = extractQueryParamValue(url.href, "k");
  } else if (/\.walmart\./.test(hostname)) {
    searchDetails.page = "walmart";
    searchDetails.query =
      extractQueryParamValue(url.href, "query") ||
      extractQueryParamValue(url.href, "q");
  } else if (/\.takealot\./.test(hostname)) {
    searchDetails.page = "takealot";
    searchDetails.query = extractQueryParamValue(url.href, "qsearch");
  } else if (/\.temu\./.test(hostname)) {
    searchDetails.page = "temu";
    searchDetails.query = extractQueryParamValue(url.href, "search_key");
  } else if (/\.aliexpress\./.test(hostname)) {
    searchDetails.page = "aliexpress";
    searchDetails.query = extractAliExpressSearchQuery(url);
  } else if (/\.bol\./.test(hostname)) {
    searchDetails.page = "bol";
    searchDetails.query = extractQueryParamValue(url.href, "searchtext");
  } else if (/\.google\./.test(hostname)) {
    searchDetails.page = "google";
    searchDetails.query = extractQueryParamValue(url.href, "q");
  } else if (/\.bing\./.test(hostname)) {
    searchDetails.page = "bing";
    searchDetails.query = extractQueryParamValue(url.href, "q");
  }

  return searchDetails;
}

function extractQueryParamValue(url, queryParamName) {
  const urlObj = new URL(url);
  const queryParams = new URLSearchParams(urlObj.search);
  let query = queryParams.get(queryParamName);
  if (query === null) {
    // console.error(`Could not find query ${queryParamName} in URL`);
    return null
  } else {
    query = query.toLowerCase().trim();
    return query;
  }
}

// AliExpress has a different URL structure for search queries
function extractAliExpressSearchQuery(url) {
  const urlObj = new URL(url);
  const pathname = urlObj.pathname;
  const match = pathname.match(/wholesale-(.*)\.html/);
  if (match && match[1]) {
    return match[1].replace(/-/g, " ");
  } else {
    return null;
  }
}

// Check if the user has toggled on the specific site
async function isToggledOn(id) {
  return new Promise((resolve, reject) => {
    // Send a message to retrieve toggle states
    chrome.runtime.sendMessage({ message: "getToggleStates" }, (response) => {
      if (chrome.runtime.lastError || !response) {
        console.error(
          "Error fetching toggle states:",
          chrome.runtime.lastError
        );
        reject(false); // Reject with false if there's an error or no response
      } else {
        const toggleStates = response.data;
        // Check if the specific toggle is on or off
        if (toggleStates && toggleStates[id]) {
          resolve(true);
        } else {
          resolve(false);
        }
      }
    });
  });
}

// Check if we want to show the Zifty overlay on this page
async function isSupportedSite() {
  // Zifty should only pop up on search engines when the results contain product listings
  // Check if this is a Google search page with product listings
  const googleBuyPanelXpath =
    "//div[contains(concat(' ', normalize-space(@class), ' '), ' cu-container ')]";
  const googleBuyPanel = document.evaluate(
    googleBuyPanelXpath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  ).singleNodeValue;
  const googleBuyPanelExists = googleBuyPanel !== null;
  let url = new URL(window.location.href);
  const isGoogleSearchBuyPage =
    /^www\.google\./.test(url.hostname) &&
    url.pathname === "/search" &&
    googleBuyPanelExists &&
    (await isToggledOn("google"));

  // Check if this is a Bing search page with product listings
  const bingBuyPanelXpath = "//*[@class='pa_mlo pa_carousel_mlo']";
  const bingBuyPanel = document.evaluate(
    bingBuyPanelXpath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  ).singleNodeValue;
  const bingBuyPanelExists = bingBuyPanel !== null;
  url = new URL(window.location.href);
  const isBingSearchBuyPage =
    /^www\.bing\./.test(url.hostname) &&
    url.pathname === "/search" &&
    bingBuyPanelExists &&
    (await isToggledOn("bing"));

  // Check if this is a supported store (e.g., Amazon, Walmart, Takealot, Bol, Temu, AliExpress)
  const isSupportedStore =
    (/^www\.amazon\./.test(url.hostname) &&
      url.pathname === "/s" &&
      (await isToggledOn("amazon"))) ||
    (/^www\.walmart\./.test(url.hostname) &&
      url.pathname === "/search/" &&
      (await isToggledOn("walmart"))) ||
    (/^www\.walmart\./.test(url.hostname) &&
      url.pathname === "/search" &&
      (await isToggledOn("walmart"))) ||
    (/^www\.takealot\./.test(url.hostname) &&
      (await isToggledOn("takealot"))) ||
    (/^www\.bol\./.test(url.hostname) &&
      url.pathname === "/nl/nl/s/" &&
      (await isToggledOn("bol"))) ||
    (/^www\.bol\./.test(url.hostname) &&
      url.pathname === "/nl/fr/s/" &&
      (await isToggledOn("bol"))) ||
    (/^www\.bol\./.test(url.hostname) &&
      url.pathname === "/be/nl/s/" &&
      (await isToggledOn("bol"))) ||
    (/^www\.bol\./.test(url.hostname) &&
      url.pathname === "/be/fr/s/" &&
      (await isToggledOn("bol"))) ||
    (/^www\.temu\./.test(url.hostname) &&
      url.pathname === "/search_result.html" &&
      (await isToggledOn("temu"))) ||
    (/^www\.aliexpress\./.test(url.hostname) &&
      /\/wholesale-/.test(url.pathname) &&
      (await isToggledOn("aliexpress")));

  const isSupportedSearchEngine = isGoogleSearchBuyPage || isBingSearchBuyPage;
  const result = isSupportedStore || isSupportedSearchEngine;

  return result;
}
