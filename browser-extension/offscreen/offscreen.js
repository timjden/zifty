// Mostly lifted from https://developer.chrome.com/docs/extensions/how-to/web-platform/geolocation

chrome.runtime.onMessage.addListener(handleMessages);

// Main message handler
function handleMessages(message, sender, sendResponse) {
  // Return early if this message isn't meant for the offscreen document.
  if (message.target !== "offscreen") {
    return false;
  }

  if (message.type === "get-geolocation") {
    handleGeolocationRequest(sendResponse);
  }

  // Returning true to indicate that the response will be sent asynchronously
  return true;
}

// Geolocation handling
function handleGeolocationRequest(sendResponse) {
  getLocation()
    .then((loc) => {
      sendResponse(loc);
    })
    .catch((err) => {
      sendResponse({ error: err.message });
    });
}

async function getLocation() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (loc) => {
        resolve(clone(loc));
      },
      (err) => {
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
