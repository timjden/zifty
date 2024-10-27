// Mostly lifted from https://developer.chrome.com/docs/extensions/how-to/web-platform/geolocation

chrome.runtime.onMessage.addListener(handleMessages);

// Main message handler
function handleMessages(message, sender, sendResponse) {
  console.log("Received message:", message);

  // Return early if this message isn't meant for the offscreen document.
  if (message.target !== "offscreen") {
    console.log("Message target is not 'offscreen'. Ignoring message.");
    return false;
  }

  if (message.type === "get-geolocation") {
    console.log("Handling geolocation request...");
    handleGeolocationRequest(sendResponse);
  }

  // Returning true to indicate that the response will be sent asynchronously
  return true;
}

// Geolocation handling
function handleGeolocationRequest(sendResponse) {
  console.log("Starting geolocation retrieval...");
  getLocation()
    .then((loc) => {
      console.log("Geolocation retrieved:", loc);
      sendResponse(loc);
    })
    .catch((err) => {
      console.error("Error retrieving geolocation:", err);
      sendResponse({ error: err.message });
    });
}

async function getLocation() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (loc) => {
        console.log("Geolocation success:", loc);
        resolve(clone(loc));
      },
      (err) => {
        console.error("Geolocation error:", err);
        reject(err);
      }
    );
  });
}

function clone(obj) {
  const copy = {};
  if (obj === null || !(obj instanceof Object)) {
    return obj;
  } else {
    for (const p in obj) {
      copy[p] = clone(obj[p]);
    }
  }
  return copy;
}
