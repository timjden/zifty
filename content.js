const PAGE_URL = window.location.href;
const QUERY_PARAM_NAME = "qsearch";
const ITEMS_PER_OVERLAY_PAGE = 6;

let pageNumber = 0;
let startIndex = 0;

function createOverlay() {
  const overlay = document.createElement("div");
  overlay.id = "zifty-overlay";

  const closeButton = document.createElement("span");
  closeButton.className = "close-button";
  closeButton.textContent = "X";

  closeButton.addEventListener("click", () => {
    document.body.removeChild(overlay);
  });

  overlay.appendChild(closeButton);

  return overlay;
}

function getQuery(url, queryParamName) {
  const urlObj = new URL(url);
  const queryParams = new URLSearchParams(urlObj.search);
  return queryParams.get(queryParamName);
}

function getDetails(url, queryParamName) {
  let details = {
    query: null,
  };

  const query = getQuery(url, queryParamName);
  if (query === null) {
    console.log(`Could not find query ${queryParamName} in URL`);
    details.query = null;
  } else {
    details.query = query;
  }

  return details;
}

async function onPageLoad() {
  // When a page loads, get the search details
  let searchDetails = {};
  if (PAGE_URL.includes("takealot.com")) {
    searchDetails = getDetails(PAGE_URL, "qsearch");
  }
  if (PAGE_URL.includes("amazon.co.za")) {
    searchDetails = getDetails(PAGE_URL, "k");
  }
  console.log(searchDetails);
  return searchDetails;
}

function containsNullValues(result) {
  return !result || Object.values(result).some((x) => x === null);
}

// When the page loads, get the search details and send these to background
window.addEventListener("load", async () => {
  let intervalId = setInterval(async () => {
    let result = await onPageLoad();
    if (!containsNullValues(result)) {
      clearInterval(intervalId);
      chrome.runtime.sendMessage({ type: "searchDetails", data: result });
    }
  }, 1000);
});

// When background sends a message that the URL changed, get the search details and send these to background
chrome.runtime.onMessage.addListener((request) => {
  if (request.message === "URL changed") {
    let intervalId = setInterval(async () => {
      let result = await onPageLoad();
      if (!containsNullValues(result)) {
        clearInterval(intervalId);
        chrome.runtime.sendMessage({ type: "searchDetails", data: result });
      }
    }, 1000);
  } else if (request.message === "Listings") {
    // When the listings are received from background, create the overlay
    if (document.getElementById("zifty-overlay")) {
      document.body.removeChild(document.getElementById("zifty-overlay"));
    }
    injectStylesheet();
    const overlay = createOverlay();

    // If there are no listings, display a message and return
    if (request.data.length === 0) {
      const noListings = document.createElement("span");
      noListings.textContent = "No listings found.";
      overlay.appendChild(noListings);
      document.body.appendChild(overlay);
      return;
    }

    // Otherwise if there are more than ITEMS_PER_OVERLAY_PAGE listings, create a next arrow
    if (request.data.length > ITEMS_PER_OVERLAY_PAGE) {
      createNextArrow(request, overlay);
    }

    // Then populate the overlay with the listings
    populateOverlay(request, overlay);
  }
});

function injectStylesheet() {
  const cssLink = document.createElement("link");
  cssLink.href = chrome.runtime.getURL("styles.css");
  cssLink.type = "text/css";
  cssLink.rel = "stylesheet";
  document.head.appendChild(cssLink);
}

function createNextArrow(request, overlay) {
  const nextArrow = document.createElement("span");
  nextArrow.id = "next-arrow";
  nextArrow.className = "arrow";
  nextArrow.textContent = ">";

  overlay.appendChild(nextArrow);

  nextArrow.addEventListener("click", function () {
    pageNumber += 1;
    startIndex = pageNumber * ITEMS_PER_OVERLAY_PAGE;

    // Don't go to the next page if there are no more listings
    if (startIndex > request.data.length) {
      pageNumber -= 1;
      startIndex = pageNumber * ITEMS_PER_OVERLAY_PAGE;
      return;
    }

    // Remove the next arrow if on the last page
    if (startIndex + ITEMS_PER_OVERLAY_PAGE >= request.data.length) {
      removeNextArrow(overlay);
    }

    // Create a previous arrow if page number is greater than 0 and it does not exist already
    if (pageNumber > 0 && !overlay.querySelector("#previous-arrow")) {
      createPreviousArrow(request, overlay);
    }

    clearOverlay(overlay);
    populateOverlay(request, overlay);
  });
}

function removeNextArrow(overlay) {
  console.log("Removing next arrow");
  const nextArrow = overlay.querySelector("#next-arrow");
  if (nextArrow) {
    nextArrow.parentNode.removeChild(nextArrow);
  }
}

function createPreviousArrow(request, overlay) {
  const previousArrow = document.createElement("span");
  previousArrow.id = "previous-arrow";
  previousArrow.className = "arrow";
  previousArrow.textContent = "<";

  overlay.appendChild(previousArrow);

  previousArrow.addEventListener("click", function () {
    pageNumber -= 1;
    startIndex = pageNumber * ITEMS_PER_OVERLAY_PAGE;

    if (pageNumber === 0) {
      removePreviousArrow(overlay);
    }

    // Next arrow should be created if it doesn't exist
    const nextArrow = overlay.querySelector("#next-arrow");
    if (!nextArrow) {
      createNextArrow(request, overlay);
    }

    if (pageNumber < 0) {
      return;
    }
    clearOverlay(overlay);
    populateOverlay(request, overlay);
  });
}

function removePreviousArrow(overlay) {
  console.log("Removing previous arrow");
  const previousArrow = overlay.querySelector("#previous-arrow");
  if (previousArrow) {
    previousArrow.parentNode.removeChild(previousArrow);
  }
}

function populateOverlay(request, overlay) {
  for (
    let i = startIndex;
    i < request.data.length && i < startIndex + ITEMS_PER_OVERLAY_PAGE;
    i++
  ) {
    const listing = request.data[i];

    // Container div for the listing
    const listingDiv = document.createElement("div");
    listingDiv.className = "listing";

    // Link element
    const linkElement = document.createElement("a");
    linkElement.href = listing.link; // Set the href to the listing's link
    linkElement.target = "_blank"; // Open link in a new tab

    // Image element
    const img = document.createElement("img");
    img.src = listing.imageSrc;

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
    linkElement.appendChild(img);
    linkElement.appendChild(listingDetails);

    // Append the link element to the listing div
    listingDiv.appendChild(linkElement);

    // Append the div to the overlay
    overlay.appendChild(listingDiv);
  }

  // Then append the overlay to the body
  document.body.appendChild(overlay);
}

function clearOverlay(overlay) {
  if (overlay) {
    const childDivs = overlay.getElementsByTagName("div");
    Array.from(childDivs).forEach((childDiv) => {
      childDiv.parentNode.removeChild(childDiv);
    });
  }
}
