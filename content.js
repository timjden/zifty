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

    listingsData = request.data; // Update the listingsData with the new listings

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
      noListings.id = "no-listings";
      noListings.textContent = "No listings found.";
      listingsSlider.appendChild(noListings);
      overlay.style.animation = "popUp 0.5s forwards";
      document.body.appendChild(overlay);
      return;
    }

    // Otherwise if there are more than ITEMS_PER_OVERLAY_PAGE listings, create a next arrow
    if (request.data.length > ITEMS_PER_OVERLAY_PAGE) {
      createNextArrow(request, overlay);
    }

    // Then populate the overlay with the listings
    overlay.style.animation = "popUp 0.5s forwards";
    populateOverlay(request, overlay);
  }
});

function createOverlay() {
  const overlay = document.createElement("div");
  overlay.id = "zifty-overlay";

  const ziftyContainer = document.createElement("div");
  ziftyContainer.id = "zifty-container";

  const leftButtonContainer = document.createElement("div");
  leftButtonContainer.className = "left-button-container";

  const listingsContainer = document.createElement("div");
  listingsContainer.className = "listings-container";

  const listingsSlider = document.createElement("div");
  listingsSlider.className = "listings-slider";

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
  listingsContainer.appendChild(listingsSlider);
  ziftyContainer.appendChild(rightButtonContainer);

  return overlay;
}

function getSearchDetails(url, queryParamName) {
  const urlObj = new URL(url);
  const queryParams = new URLSearchParams(urlObj.search);
  const query = queryParams.get(queryParamName);
  if (query === null) {
    console.log(`Could not find query ${queryParamName} in URL`);
    return { query: null };
  } else {
    return { query: query };
  }
}

async function onPageLoad() {
  // Clear the currentIndex on page load
  currentIndex = 0;

  // When a page loads, get the search details
  let searchDetails = {};

  console.log("Zifty is looking for second-hand listings on this page.");

  if (window.location.href.includes("takealot.com")) {
    searchDetails = getSearchDetails(window.location.href, "qsearch");
  }
  if (window.location.href.includes("amazon.co.za")) {
    searchDetails = getSearchDetails(window.location.href, "k");
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
  console.log("Removing next arrow");
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
  console.log("Removing previous arrow");
  const previousArrow = overlay.querySelector("#previous-arrow-container");
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
