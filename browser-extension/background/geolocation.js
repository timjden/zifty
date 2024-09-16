const OFFSCREEN_DOCUMENT_PATH = "browser-extension/offscreen/offscreen.html";
let creating = null; // A global promise to avoid concurrency issues

export async function getGeolocation() {
  await setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH);
  const geolocation = await chrome.runtime.sendMessage({
    type: "get-geolocation",
    target: "offscreen",
  });
  await closeOffscreenDocument();
  return geolocation;
}

async function hasDocument() {
  // Check if the offscreen document already exists
  return await chrome.offscreen.hasDocument();
}

async function setupOffscreenDocument(path) {
  // If the document exists, we skip creation
  if (await hasDocument()) {
    return;
  }

  // Create offscreen document if not already creating one
  if (creating) {
    await creating;
  } else {
    creating = chrome.offscreen.createDocument({
      url: path,
      reasons: [chrome.offscreen.Reason.GEOLOCATION],
      justification: "geolocation access",
    });

    await creating;
    creating = null;
  }
}

async function closeOffscreenDocument() {
  if (!(await hasDocument())) {
    return;
  }
  await chrome.offscreen.closeDocument();
}

export async function logLocation() {
  const location = await getGeolocation();
  return location;
}
