const QUERY_PARAM_NAME = "qsearch";

const LOCATION_XPATH = null;

function createOverlay() {
  const overlay = document.createElement("div");
  overlay.id = "zifty-overlay";
  overlay.style.position = "fixed";
  overlay.style.bottom = "1%";
  overlay.style.left = "0";
  overlay.style.right = "0";
  overlay.style.width = "75%";
  overlay.style.height = "20%";
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  overlay.style.borderColor = "black";
  overlay.style.zIndex = "9999";
  overlay.style.display = "flex";
  overlay.style.justifyContent = "center";
  overlay.style.alignItems = "center";
  overlay.style.color = "white";
  overlay.style.margin = "auto";

  const closeButton = document.createElement("span");
  closeButton.style.position = "absolute";
  closeButton.style.top = "5px";
  closeButton.style.right = "5px";
  closeButton.style.color = "white";
  closeButton.style.cursor = "pointer";
  closeButton.textContent = "X";

  closeButton.addEventListener("click", () => {
    document.body.removeChild(overlay);
  });

  overlay.appendChild(closeButton);

  return overlay;
}

function getQuery(queryParamName) {
  const url = window.location.href;
  const urlObj = new URL(url);
  const queryParams = new URLSearchParams(urlObj.search);
  return queryParams.get(queryParamName);
}

function getDetails(queryParamName) {
  let details = {
    query: null,
  };

  const query = getQuery(queryParamName);
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
  const searchDetails = getDetails(QUERY_PARAM_NAME);
  console.log(searchDetails);
  return searchDetails;
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

    const overlay = createOverlay();

    // If there are no listings, display a message and return
    if (request.data.length === 0) {
      const noListings = document.createElement("span");
      noListings.textContent = "No listings found.";
      overlay.appendChild(noListings);
      document.body.appendChild(overlay);
      return;
    }

    // Otherwise, populate the overlay with the listings
    for (let i = 0; i < request.data.length && i < 3; i++) {
      const listing = request.data[i];

      // Container div for the listing
      const listingDiv = document.createElement("div");
      listingDiv.style.display = "inline-block";
      listingDiv.style.margin = "1%";
      listingDiv.style.width = "calc(30% - 1%)";
      listingDiv.style.height = "95%"; // Explicit height for each listing div
      listingDiv.style.verticalAlign = "center";
      listingDiv.style.boxSizing = "border-box";
      listingDiv.style.overflow = "hidden"; // This will clip off any overflowing parts
      listingDiv.style.border = "1px solid white";
      listingDiv.style.position = "relative";

      // Link element
      const linkElement = document.createElement("a");
      linkElement.href = listing.link; // Set the href to the listing's link
      linkElement.target = "_blank"; // Open link in a new tab
      linkElement.style.width = "100%";
      linkElement.style.height = "100%";
      linkElement.style.display = "block"; // Make sure it takes up the whole div

      // Image element
      const img = document.createElement("img");
      img.src = listing.imageSrc;
      img.style.maxHeight = "100%"; // Reduce max height to allow text space at the bottom
      img.style.maxWidth = "100%";
      img.style.objectFit = "contain";
      img.style.display = "block";
      img.style.margin = "auto";

      // Span element for the title, to overlay on the image
      const titleSpan = document.createElement("span");
      titleSpan.textContent = `${listing.title}\n${listing.location}\n${listing.price}`;
      titleSpan.style.position = "absolute";
      titleSpan.style.bottom = "0%"; // Adjusted position to leave more space for location and price
      titleSpan.style.left = "0";
      titleSpan.style.width = "100%";
      titleSpan.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
      titleSpan.style.color = "white";
      titleSpan.style.padding = "1%"; // Increased padding for better separation
      titleSpan.style.textAlign = "center";
      titleSpan.style.fontSize = "1rem";
      titleSpan.style.whiteSpace = "pre-line"; // Adjust font size if necessary

      // Append the image and spans to the link element
      linkElement.appendChild(img);
      linkElement.appendChild(titleSpan);

      // Append the link element to the listing div
      listingDiv.appendChild(linkElement);

      // Append the div to the overlay
      overlay.appendChild(listingDiv);
    }

    // Then append the overlay to the body
    document.body.appendChild(overlay);
  }
});

function containsNullValues(result) {
  return !result || Object.values(result).some((x) => x === null);
}
