// The functions below are used to create the Zifty overlay DOM elements

const ITEMS_PER_OVERLAY_PAGE = 6; // The number of listings to show per page in the Zifty overlay
let currentIndex = 0; // Used to track pagination in the Zifty overlay

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
  cssLink.href = chrome.runtime.getURL("content/styles.css");
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
