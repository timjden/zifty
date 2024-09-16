const OFFSCREEN_DOCUMENT_PATH = "browser-extension/offscreen/offscreen.html";

let creating;

async function hasDocument() {
  const matchedClients = await clients.matchAll();
  return matchedClients.some(
    (c) => c.url === chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)
  );
}

async function setupOffscreenDocument(path) {
  console.log("In setupOffscreenDocument");
  if (!(await hasDocument())) {
    console.log("Creating offscreen document...");
    if (creating) {
      console.log("Waiting for existing offscreen document to be created...");
      await creating;
    } else {
      console.log("Creating new offscreen document...");
      console.log(path);
      console.log("Full offscreen document URL:", chrome.runtime.getURL(path));
      creating = chrome.offscreen.createDocument({
        url: path,
        reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
        justification: "authentication",
      });
      await creating;
      creating = null;
    }
  }
}

async function closeOffscreenDocument() {
  if (!(await hasDocument())) {
    return;
  }
  await chrome.offscreen.closeDocument();
}

function getFirebaseAuth() {
  return new Promise(async (resolve, reject) => {
    const auth = await chrome.runtime.sendMessage({
      type: "firebase-auth",
      target: "offscreen",
    });
    auth?.name !== "FirebaseError" ? resolve(auth) : reject(auth);
  });
}

async function firebaseAuth() {
  console.log("Setting up offscreen document...");
  await setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH);
  console.log("Offscreen document setup");

  const auth = await getFirebaseAuth()
    .then((auth) => {
      console.log("User Authenticated", auth);
      return auth;
    })
    .catch((err) => {
      if (err.code === "auth/operation-not-allowed") {
        console.error(
          "You must enable an OAuth provider in the Firebase" +
            " console in order to use signInWithPopup. This sample" +
            " uses Google by default."
        );
      } else {
        console.error(err);
        return err;
      }
    })
    .finally(closeOffscreenDocument);

  return auth;
}

export { firebaseAuth };
