// This content script will only run on pages with URLs as defined in the manifest.json
//console.log("Zifty has injected a content script into this page.");

let sessionDetails = null;
let isSubscribed = null;
let isSupportedBrowser = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForNotNull(variableAccessor, interval = 1000) {
  while (variableAccessor() === null) {
    //console.log("isSubscribed :", isSubscribed);
    await sleep(interval); // sleep for the specified interval (default is 1 second)
  }
  //console.log("Got subscription status");
}

chrome.runtime.onMessage.addListener((request) => {
  if (request.message === "isSubscribed") {
    //console.log("Received subscription status from background");
    //console.log("isSubscribed:", request.isSubscribed);
    //console.log("Received sessionDetails from background");
    //console.log("sessionDetails:", request.sessionDetails);
    sessionDetails = request.sessionDetails;
    isSubscribed = request.isSubscribed;
  } else if (request.message === "isSupportedBrowser") {
    //console.log("Received supported browser status from background");
    //console.log("isSupportedBrowser:", request.isSupportedBrowser);
    isSupportedBrowser = request.isSupportedBrowser;
  }
});

// But the overlay might stay appended to the page so remove it if the user navigates away
if (!isSupportedSite()) {
  const overlay = document.getElementById("zifty-overlay");
  if (overlay) {
    document.body.removeChild(overlay);
  }
}

const ITEMS_PER_OVERLAY_PAGE = 6; // The number of listings to show per page in the Zifty overlay
let currentIndex = 0; // Used to track pagination in the Zifty overlay
let listingsData; // Place to store the listings received from background (e.g. Facebook Marketplace API)
let currentSearchDetails = { page: null, query: null }; // Place to store the user's search query and the page they are on
let sendingSearchDetailsToBackground = false; // Flag to prevent multiple, concurrent requests for listings
let ziftyOverlay; // Holds the Zifty overlay element

// When a page loads, send a message to the background script asking for the relevant listings
window.addEventListener("load", async () => {
  //console.log("Page loaded");
  chrome.runtime.sendMessage({ message: "isUserSubscribed" });
  await waitForNotNull(() => isSubscribed);
  chrome.runtime.sendMessage({ message: "checkBrowser" });
  await waitForNotNull(() => isSupportedBrowser);
  if (!isSupportedSite()) {
    //console.log("This page is not supported by Zifty");
    return;
  }

  if (!sendingSearchDetailsToBackground) {
    const searchDetails = getSearchDetails();

    // If the search query is the same as the previous search query (e.g. URL changes due to pagination), return
    if (searchDetails.query === currentSearchDetails.query) {
      if (!document.getElementById("zifty-overlay")) {
        ziftyOverlay = createZiftyOverlay();
        populateOverlay(
          { data: listingsData, query: searchDetails.query },
          ziftyOverlay
        );
      }
      //console.log("Search details are the same as before, returning");
      return;
    }

    currentSearchDetails = sendSearchDetailsToBackground(searchDetails); // Sends search details to background
  } else {
    return;
  }

  currentIndex = 0; // Clear the index used to track pagination
  ziftyOverlay = createZiftyOverlay();
});

// ... OR when the URL changes (this info comes from background) send a message to the background script asking for the relevant listings
chrome.runtime.onMessage.addListener(async (request) => {
  if (request.message === "URL changed") {
    chrome.runtime.sendMessage({ message: "isUserSubscribed" });
    await waitForNotNull(() => isSubscribed);
    chrome.runtime.sendMessage({ message: "checkBrowser" });
    await waitForNotNull(() => isSupportedBrowser);
    //console.log("URL changed");
    if (!isSupportedSite()) {
      //console.log("This page is not supported by Zifty");
      try {
        const overlay = document.getElementById("zifty-overlay");
        if (overlay) {
          document.body.removeChild(overlay);
        }
      } catch (error) {
        console.error("Error removing overlay", error);
      }
      return;
    }

    if (!sendingSearchDetailsToBackground) {
      const searchDetails = getSearchDetails();

      // If the search query is the same as the previous search query (e.g. URL changes due to pagination), return
      if (searchDetails.query === currentSearchDetails.query) {
        if (!document.getElementById("zifty-overlay")) {
          ziftyOverlay = createZiftyOverlay();
          populateOverlay(
            { data: listingsData, query: searchDetails.query },
            ziftyOverlay
          );
        }
        //console.log("Search details are the same as before, returning");
        return;
      }

      currentSearchDetails = sendSearchDetailsToBackground(searchDetails); // Sends search details to background
    } else {
      return;
    }

    currentIndex = 0; // Clear the index used to track pagination
    ziftyOverlay = createZiftyOverlay();
  } else if (request.message === "Listings") {
    // Once background has the listings data from an external datasource (e.g. Facebook Marketplace API) it sends them to content
    //console.log(`Received ${request.data.length} listings from background`);
    sendingSearchDetailsToBackground = false; // Set the flag to false after receiving the listings

    // If the listings are the same as the previous listings, return
    if (listingsData === request.data) {
      //console.log("Listings are the same as before, returning");
      return;
    }

    listingsData = request.data; // Otherwise update listingsData with the new listings

    // Then populate the Zifty overlay with the listings
    //console.log(
    //   `Populating overlay with ${request.data.length} listings for "${request.query}"`
    // );
    populateOverlay(request, ziftyOverlay);
  }
});

function createZiftyOverlay() {
  if (document.getElementById("zifty-overlay")) {
    //console.log("Removing existing overlay first");
    document.body.removeChild(document.getElementById("zifty-overlay"));
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
    //console.log("Sending search details to background", message);
    chrome.runtime.sendMessage(message);
    sendingSearchDetailsToBackground = true; // Set the flag to true after sending the message
  }
  return searchDetails;
}

function getSearchDetails() {
  let searchDetails = { page: null, query: null };
  const url = new URL(window.location.href);
  const hostname = url.hostname;
  //console.log("Getting search details for", hostname);

  if (/\.amazon\./.test(hostname)) {
    //console.log("Amazon search page detected");
    searchDetails.page = "amazon";
    searchDetails.query = extractQueryParamValue(url.href, "k");
  } else if (/\.walmart\./.test(hostname)) {
    //console.log("Walmart search page detected");
    searchDetails.page = "walmart";
    searchDetails.query =
      extractQueryParamValue(url.href, "query") ||
      extractQueryParamValue(url.href, "q");
  } else if (/\.takealot\./.test(hostname)) {
    //console.log("Takealot search page detected");
    searchDetails.page = "takealot";
    searchDetails.query = extractQueryParamValue(url.href, "qsearch");
  } else if (/\.temu\./.test(hostname)) {
    searchDetails.page = "temu";
    searchDetails.query = extractQueryParamValue(url.href, "search_key");
  } else if (/\.aliexpress\./.test(hostname)) {
    searchDetails.page = "aliexpress";
    searchDetails.query = extractAliExpressSearchQuery(url);
  } else if (/\.bol\./.test(hostname)) {
    //console.log("Bol search page detected");
    searchDetails.page = "bol";
    searchDetails.query = extractQueryParamValue(url.href, "searchtext");
  } else if (/\.google\./.test(hostname)) {
    //console.log("Google search page detected");
    searchDetails.page = "google";
    searchDetails.query = extractQueryParamValue(url.href, "q");
  } else if (/\.bing\./.test(hostname)) {
    //console.log("Bing search page detected");
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
    //console.log(`Could not find query ${queryParamName} in URL`);
  } else {
    query = query.toLowerCase().trim();
  }
  return query;
}

function extractAliExpressSearchQuery(url) {
  // Create a URL object
  const urlObj = new URL(url);

  // Get the pathname part of the URL
  const pathname = urlObj.pathname;

  // Extract the word or phrase between "wholesale-" and ".html"
  const match = pathname.match(/wholesale-(.*)\.html/);

  // If there's a match, replace dashes with spaces
  if (match && match[1]) {
    return match[1].replace(/-/g, " ");
  } else {
    return null; // Return null if the pattern doesn't match
  }
}

function isSupportedSite() {
  if (!isSupportedBrowser) {
    //console.log("This browser is not supported.");
    isSupportedBrowser = null;
    return false;
  }
  isSupportedBrowser = null;
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
    googleBuyPanelExists;

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
    bingBuyPanelExists;
  //console.log("URL PATHNAME");
  //console.log(url.pathname);
  // If the user is subscribed, they get access to all free tier sites plus Google and Bing
  //console.log("isSubscribed:", isSubscribed);
  const isFreeTierSite =
    (/^www\.amazon\./.test(url.hostname) &&
      url.pathname === "/s" &&
      (sessionDetails.toggleStatuses.amazon ||
        !sessionDetails.isUserSignedIn)) ||
    (/^www\.walmart\./.test(url.hostname) &&
      url.pathname === "/search/" &&
      (sessionDetails.toggleStatuses.walmart ||
        !sessionDetails.isUserSignedIn)) ||
    (/^www\.walmart\./.test(url.hostname) &&
      url.pathname === "/search" &&
      (sessionDetails.toggleStatuses.walmart ||
        !sessionDetails.isUserSignedIn)) ||
    (/^www\.takealot\./.test(url.hostname) &&
      url.pathname === "/all" &&
      (sessionDetails.toggleStatuses.takealot ||
        !sessionDetails.isUserSignedIn)) ||
    (/^www\.bol\./.test(url.hostname) &&
      url.pathname === "/nl/nl/s/" &&
      (sessionDetails.toggleStatuses.bol || !sessionDetails.isUserSignedIn)) ||
    (/^www\.bol\./.test(url.hostname) &&
      url.pathname === "/nl/fr/s/" &&
      (sessionDetails.toggleStatuses.bol || !sessionDetails.isUserSignedIn)) ||
    (/^www\.bol\./.test(url.hostname) &&
      url.pathname === "/be/nl/s/" &&
      (sessionDetails.toggleStatuses.bol || !sessionDetails.isUserSignedIn)) ||
    (/^www\.bol\./.test(url.hostname) &&
      url.pathname === "/be/fr/s/" &&
      (sessionDetails.toggleStatuses.bol || !sessionDetails.isUserSignedIn)) ||
    (/^www\.temu\./.test(url.hostname) &&
      url.pathname === "/search_result.html" &&
      (sessionDetails.toggleStatuses.temu || !sessionDetails.isUserSignedIn)) ||
    (/^www\.aliexpress\./.test(url.hostname) &&
      /\/wholesale-/.test(url.pathname) &&
      (sessionDetails.toggleStatuses.aliexpress ||
        !sessionDetails.isUserSignedIn));
  const isPaidTierSite =
    (isGoogleSearchBuyPage && sessionDetails.toggleStatuses.google) ||
    (isBingSearchBuyPage && sessionDetails.toggleStatuses.bing);
  let result;
  if (isSubscribed) {
    // Return true if the user is on Amazon\Walmart etc. search results or a Google\Bing etc. search page with product listings
    result = isFreeTierSite || isPaidTierSite;
  } else {
    result = isFreeTierSite;
  }

  return result;
}

// The functions below are used to create the Zifty overlay DOM elements

function createOverlay() {
  const overlay = document.createElement("div");
  overlay.id = "zifty-overlay";

  const ziftyContainer = document.createElement("div");
  ziftyContainer.id = "zifty-container";

  const leftButtonContainer = document.createElement("div");
  leftButtonContainer.className = "left-button-container";

  const listingsContainer = document.createElement("div");
  listingsContainer.className = "listings-container";

  const rightButtonContainer = document.createElement("div");
  rightButtonContainer.className = "right-button-container";

  const closeButtonContainer = document.createElement("span");
  closeButtonContainer.className = "close-button-container";
  const closeButton = createCloseButtonSVG();
  closeButtonContainer.appendChild(closeButton);
  rightButtonContainer.appendChild(closeButtonContainer);

  closeButtonContainer.addEventListener("click", () => {
    overlay.style.animation = "hide 0.5s forwards";
  });

  overlay.appendChild(ziftyContainer);
  ziftyContainer.appendChild(leftButtonContainer);
  ziftyContainer.appendChild(listingsContainer);
  ziftyContainer.appendChild(rightButtonContainer);

  // Show a loading spinner
  const loadingSpinner = document.createElement("div");
  loadingSpinner.className = "loading-spinner";
  listingsContainer.appendChild(loadingSpinner);

  if (!document.getElementById("zifty-overlay")) {
    document.body.appendChild(overlay);
  }

  return overlay;
}

function injectStylesheet() {
  const cssLink = document.createElement("link");
  cssLink.href = chrome.runtime.getURL("styles.css");
  cssLink.type = "text/css";
  cssLink.rel = "stylesheet";
  document.head.appendChild(cssLink);
}

function createNextArrow(request, overlay) {
  const nextArrowContainer = document.createElement("span");
  nextArrowContainer.id = "next-arrow-container";
  nextArrowContainer.className = "arrow";
  const nextArrow = createNextArrowSVG();
  nextArrowContainer.appendChild(nextArrow);

  const rightButtonContainer = overlay.querySelector(".right-button-container");
  rightButtonContainer.appendChild(nextArrowContainer);

  nextArrowContainer.addEventListener("click", function () {
    currentIndex += ITEMS_PER_OVERLAY_PAGE;

    // Don't go to the next page if there are no more listings
    if (currentIndex >= request.data.length) {
      currentIndex = 0;
      return;
    }

    // Remove the next arrow if on the last page
    if (currentIndex + ITEMS_PER_OVERLAY_PAGE >= request.data.length) {
      removeNextArrow(overlay);
    }

    // Create a previous arrow if page number is greater than 0 and it does not exist already
    if (
      currentIndex > 0 &&
      !overlay.querySelector("#previous-arrow-container")
    ) {
      createPreviousArrow(request, overlay);
    }
    const listingsSlider = overlay.querySelector(".listings-slider");
    listingsSlider.style.transform = `translateX(-${
      (100 / ITEMS_PER_OVERLAY_PAGE) * currentIndex
    }%)`;
  });
}

function removeNextArrow(overlay) {
  //console.log("Removing next arrow");
  const nextArrow = overlay.querySelector("#next-arrow-container");
  if (nextArrow) {
    nextArrow.parentNode.removeChild(nextArrow);
  }
}

function createPreviousArrow(request, overlay) {
  const previousArrowContainer = document.createElement("span");
  previousArrowContainer.id = "previous-arrow-container";
  previousArrowContainer.className = "arrow";
  const previousArrow = createBackArrowSVG();
  previousArrowContainer.appendChild(previousArrow);

  const leftButtonContainer = overlay.querySelector(".left-button-container");
  leftButtonContainer.appendChild(previousArrowContainer);

  previousArrowContainer.addEventListener("click", function () {
    currentIndex -= ITEMS_PER_OVERLAY_PAGE;

    if (currentIndex === 0) {
      removePreviousArrow(overlay);
    }

    // Next arrow should be created if it doesn't exist
    const nextArrow = overlay.querySelector("#next-arrow-container");
    if (!nextArrow) {
      createNextArrow(request, overlay);
    }

    if (currentIndex < 0) {
      currentIndex = Math.max(request.data.length - ITEMS_PER_OVERLAY_PAGE, 0);
      return;
    }

    const listingsSlider = overlay.querySelector(".listings-slider");
    listingsSlider.style.transform = `translateX(-${
      (100 / ITEMS_PER_OVERLAY_PAGE) * currentIndex
    }%)`;
  });
}

function removePreviousArrow(overlay) {
  //console.log("Removing previous arrow");
  const previousArrow = overlay.querySelector("#previous-arrow-container");
  if (previousArrow) {
    previousArrow.parentNode.removeChild(previousArrow);
  }
}

function populateOverlay(request, overlay) {
  const imageLoadPromises = [];

  const listingsSlider = document.createElement("div");
  listingsSlider.className = "listings-slider";

  for (let i = currentIndex; i < request.data.length; i++) {
    const listing = request.data[i];

    // Container div for the listing
    const listingDiv = document.createElement("div");
    listingDiv.className = "listing";

    // Link element
    const linkElement = document.createElement("a");
    linkElement.href = listing.link;
    linkElement.target = "_blank";

    // Image container
    const imgContainer = document.createElement("div");
    imgContainer.className = "img-container";

    // Image
    const img = document.createElement("img");
    img.src = listing.imageSrc;

    // Create a promise for each image load
    const imgLoadPromise = new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    imageLoadPromises.push(imgLoadPromise);

    imgContainer.appendChild(img);

    // Span element for the title, to overlay on the image
    const listingDetails = document.createElement("div");
    listingDetails.className = "listing-details";

    const listingDescription = document.createElement("span");
    listingDescription.textContent = listing.title;
    listingDescription.className = "listing-title";

    const listingPrice = document.createElement("span");
    listingPrice.textContent = listing.price;
    listingPrice.className = "listing-price";

    const listingLocation = document.createElement("span");
    listingLocation.textContent = listing.location;
    listingLocation.className = "listing-location";

    listingDetails.appendChild(listingDescription);
    listingDetails.appendChild(listingLocation);
    listingDetails.appendChild(listingPrice);

    // Append the image and spans to the link element
    linkElement.appendChild(imgContainer);
    imgContainer.appendChild(listingDetails);

    // Append the link element to the listing div
    listingDiv.appendChild(linkElement);

    // Append the div to the listings container in the overlay
    listingsSlider.appendChild(listingDiv);
  }

  const listingsContainer = overlay.querySelector(".listings-container");
  const loadingSpinner = listingsContainer.querySelector(".loading-spinner");

  // Wait for all images to load before removing the spinner
  Promise.all(imageLoadPromises)
    .then(() => {
      listingsContainer.removeChild(loadingSpinner);
      // If there are no listings, display a message and return
      if (request.data.length === 0) {
        const noListings = document.createElement("span");
        noListings.id = "no-listings";
        noListings.innerHTML = `No listings found for "${request.query}".<br>Refine your search query. Ensure your VPN is disabled.`;
        listingsSlider.appendChild(noListings);
        listingsContainer.appendChild(listingsSlider);
        return;
      }
      // If there are more than ITEMS_PER_OVERLAY_PAGE listings, create a next arrow
      if (request.data.length > ITEMS_PER_OVERLAY_PAGE) {
        createNextArrow(request, overlay);
      }
      listingsSlider.classList.add("fade-in");
      listingsContainer.appendChild(listingsSlider);
    })
    .catch((error) => {
      console.error("One or more images failed to load", error);
      listingsContainer.removeChild(loadingSpinner);
    });
}

function createCloseButtonSVG() {
  // Create the SVG element
  const closeButtonSVG = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  closeButtonSVG.setAttribute("class", "zifty-button");
  closeButtonSVG.setAttribute("width", "20");
  closeButtonSVG.setAttribute("height", "20");
  closeButtonSVG.setAttribute("viewBox", "0 0 24 24");
  closeButtonSVG.setAttribute("fill", "none");
  closeButtonSVG.setAttribute("stroke", "white");
  closeButtonSVG.setAttribute("stroke-width", "4");
  closeButtonSVG.setAttribute("stroke-linecap", "round");
  closeButtonSVG.setAttribute("stroke-linejoin", "round");

  // Create the lines for the "X"
  const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line1.setAttribute("x1", "18");
  line1.setAttribute("y1", "6");
  line1.setAttribute("x2", "6");
  line1.setAttribute("y2", "18");

  const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line2.setAttribute("x1", "6");
  line2.setAttribute("y1", "6");
  line2.setAttribute("x2", "18");
  line2.setAttribute("y2", "18");

  // Append the lines to the SVG
  closeButtonSVG.appendChild(line1);
  closeButtonSVG.appendChild(line2);

  // Return the SVG element
  return closeButtonSVG;
}

function createNextArrowSVG() {
  // Create the SVG element
  const nextArrowSVG = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  nextArrowSVG.setAttribute("class", "zifty-button");
  nextArrowSVG.setAttribute("viewBox", "0 0 24 24");
  nextArrowSVG.setAttribute("fill", "none");
  nextArrowSVG.setAttribute("stroke", "white");
  nextArrowSVG.setAttribute("stroke-width", "4");
  nextArrowSVG.setAttribute("stroke-linecap", "round");
  nextArrowSVG.setAttribute("stroke-linejoin", "round");

  // Create the polyline for the arrow
  const polyline = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "polyline"
  );
  polyline.setAttribute("points", "6 22 12 12 6 2");

  // Append the polyline to the SVG
  nextArrowSVG.appendChild(polyline);

  // Return the SVG element
  return nextArrowSVG;
}

function createBackArrowSVG() {
  // Create the SVG element
  const backArrowSVG = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  backArrowSVG.setAttribute("class", "zifty-button");
  backArrowSVG.setAttribute("viewBox", "0 0 24 24");
  backArrowSVG.setAttribute("fill", "none");
  backArrowSVG.setAttribute("stroke", "white");
  backArrowSVG.setAttribute("stroke-width", "4");
  backArrowSVG.setAttribute("stroke-linecap", "round");
  backArrowSVG.setAttribute("stroke-linejoin", "round");

  // Create the polyline for the arrow
  const polyline = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "polyline"
  );
  polyline.setAttribute("points", "18 22 12 12 18 2");

  // Append the polyline to the SVG
  backArrowSVG.appendChild(polyline);

  // Return the SVG element
  return backArrowSVG;
}
