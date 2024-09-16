// Geolocation and Auth combined offscreen.js
chrome.runtime.onMessage.addListener(handleMessages);

// The public URL for the authentication iframe
const _URL = "https://zifty-4e74a.web.app/pages/sign-in-with-popup.html";
console.log("Using URL:", _URL);
const iframe = document.createElement("iframe");
console.log("Iframe created:", iframe);
iframe.src = _URL;
console.log("Iframe source set to URL:", _URL);
document.documentElement.appendChild(iframe);
console.log("Iframe appended to document.");

console.log("Iframe created and appended with URL:", _URL);

// Main message handler
function handleMessages(message, sender, sendResponse) {
  console.log("Received message:", message);

  // Return early if this message isn't meant for the offscreen document.
  if (message.target !== "offscreen") {
    console.log("Message target is not 'offscreen'. Ignoring message.");
    return false;
  }

  switch (message.type) {
    case "get-geolocation":
      console.log("Handling geolocation request...");
      handleGeolocationRequest(sendResponse);
      break;
    case "firebase-auth":
      console.log("Handling Firebase auth request...");
      handleAuthRequest(sendResponse);
      break;
    default:
      console.warn(`Unexpected message type received: '${message.type}'.`);
      return false;
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

// Firebase Auth handling
function handleAuthRequest(sendResponse) {
  console.log("Setting up message listener for iframe communication...");

  globalThis.addEventListener("message", handleIframeMessage, false);

  console.log("Sending 'initAuth' message to iframe...");

  // Start the authentication flow in the iframe
  iframe.contentWindow.postMessage({ initAuth: true }, new URL(_URL).origin);

  function handleIframeMessage({ data }) {
    console.log("Received message from iframe:", data);

    try {
      if (data.startsWith("!_{")) {
        console.log("Ignoring non-auth related message from Firebase.");
        return;
      }
      data = JSON.parse(data);
      console.log("Parsed iframe data:", data);

      // Remove the event listener after receiving the response
      globalThis.removeEventListener("message", handleIframeMessage);
      console.log("Iframe message listener removed.");

      // Send the parsed data as a response
      sendResponse(data);
    } catch (e) {
      console.error(`Failed to parse JSON from iframe message: ${e.message}`);
    }
  }
}
