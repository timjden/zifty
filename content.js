const ITEMS_PER_OVERLAY_PAGE = 6;

let currentIndex = 0;
let listingsData;

console.log("Zifty has injected a content script into this page.");

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
    console.log(`Received listings from background: ${request.data.length}`);

    // If the listingsData is the same as the previous listingsData, return
    if (listingsData === request.data) {
      return;
    }

    listingsData = request.data;

    // When the listings are received from background, create the overlay
    if (document.getElementById("zifty-overlay")) {
      document.body.removeChild(document.getElementById("zifty-overlay"));
    }
    injectStylesheet();
    const overlay = createOverlay();
    const listingsSlider = overlay.querySelector(".listings-slider");

    // If there are no listings, display a message and return
    if (request.data.length === 0) {
      const noListings = document.createElement("span");
      noListings.textContent = "No listings found.";
      listingsSlider.appendChild(noListings);
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

function createOverlay() {
  const overlay = document.createElement("div");
  overlay.id = "zifty-overlay";

  const leftButtonContainer = document.createElement("div");
  leftButtonContainer.className = "left-button-container";

  const listingsContainer = document.createElement("div");
  listingsContainer.className = "listings-container";

  const listingsSlider = document.createElement("div");
  listingsSlider.className = "listings-slider";

  const rightButtonContainer = document.createElement("div");
  rightButtonContainer.className = "right-button-container";

  const closeButton = document.createElement("span");
  closeButton.className = "close-button";
  closeButton.textContent = "\u2715";
  rightButtonContainer.appendChild(closeButton);

  closeButton.addEventListener("click", () => {
    overlay.style.animation = "hide 0.5s forwards";
  });

  overlay.appendChild(leftButtonContainer);
  overlay.appendChild(listingsContainer);
  listingsContainer.appendChild(listingsSlider);
  overlay.appendChild(rightButtonContainer);

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
  // Clear the currentIndex on page load
  currentIndex = 0;

  // When a page loads, get the search details
  let searchDetails = {};

  console.log("Zifty is looking for second-hand listings on this page.");

  if (window.location.href.includes("takealot.com")) {
    searchDetails = getDetails(window.location.href, "qsearch");
  }
  if (window.location.href.includes("amazon.co.za")) {
    searchDetails = getDetails(window.location.href, "k");
  }
  if (window.location.href.includes("temu.com")) {
    searchDetails = getDetails(window.location.href, "search_key");
  }
  if (window.location.href.includes("loot.co.za")) {
    searchDetails = getDetails(window.location.href, "terms");
  }

  console.log(searchDetails);
  return searchDetails;
}

function containsNullValues(result) {
  return !result || Object.values(result).some((x) => x === null);
}

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
  nextArrow.textContent = "\u276F";

  const rightButtonContainer = overlay.querySelector(".right-button-container");
  rightButtonContainer.appendChild(nextArrow);

  nextArrow.addEventListener("click", function () {
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
    if (currentIndex > 0 && !overlay.querySelector("#previous-arrow")) {
      createPreviousArrow(request, overlay);
    }
    const listingsSlider = overlay.querySelector(".listings-slider");
    listingsSlider.style.transform = `translateX(-${
      (100 / ITEMS_PER_OVERLAY_PAGE) * currentIndex
    }%)`;
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
  previousArrow.textContent = "\u276E";

  const leftButtonContainer = overlay.querySelector(".left-button-container");
  leftButtonContainer.appendChild(previousArrow);

  previousArrow.addEventListener("click", function () {
    currentIndex -= ITEMS_PER_OVERLAY_PAGE;

    if (currentIndex === 0) {
      removePreviousArrow(overlay);
    }

    // Next arrow should be created if it doesn't exist
    const nextArrow = overlay.querySelector("#next-arrow");
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
  console.log("Removing previous arrow");
  const previousArrow = overlay.querySelector("#previous-arrow");
  if (previousArrow) {
    previousArrow.parentNode.removeChild(previousArrow);
  }
}

function populateOverlay(request, overlay) {
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
    imgContainer.appendChild(img);
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
    linkElement.appendChild(imgContainer);
    imgContainer.appendChild(listingDetails);

    // Append the link element to the listing div
    listingDiv.appendChild(linkElement);

    // Append the div to the listings container in the overlay
    const listingsSlider = overlay.querySelector(".listings-slider");

    listingsSlider.appendChild(listingDiv);
  }

  // If the overlay is not attached to the body, then attach it
  if (!document.getElementById("zifty-overlay")) {
    document.body.appendChild(overlay);
  }
}
