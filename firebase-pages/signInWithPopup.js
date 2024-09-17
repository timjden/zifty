import {
  signInWithPopup,
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
} from "firebase/auth";
import { initializeApp } from "firebase/app";
import firebaseConfig from "../browser-extension/background/firebaseConfig";

console.log("Initializing Firebase app...");
const app = initializeApp(firebaseConfig);
const auth = getAuth();
console.log("Firebase app initialized and Auth instance created.");

// This code runs inside of an iframe in the extension's offscreen document.
// This gives you a reference to the parent frame, i.e. the offscreen document.
// You will need this to assign the targetOrigin for postMessage.
const PARENT_FRAME = document.location.ancestorOrigins[0];
console.log("Parent frame origin determined:", PARENT_FRAME);

// This demo uses the Google auth provider, but any supported provider works.
// Make sure that you enable any provider you want to use in the Firebase Console.
// https://console.firebase.google.com/project/_/authentication/providers
const PROVIDER = new GoogleAuthProvider();
console.log("GoogleAuthProvider created.");

onAuthStateChanged(auth, (user) => {
  console.log("User state changed:", user);

  if (user) {
    console.log("User is signed in:", user);
  } else {
    console.log("User is signed out.");
  }
});

function sendResponse(result) {
  console.log("Sending response back to the parent frame:", result);
  globalThis.parent.self.postMessage(JSON.stringify(result), PARENT_FRAME);
}

globalThis.addEventListener("message", function ({ data }) {
  console.log("Message received in iframe:", data);

  if (data.initAuth) {
    console.log(
      "InitAuth message detected. Starting Google sign-in process..."
    );

    // Opens the Google sign-in page in a popup, inside of an iframe in the
    // extension's offscreen document.
    signInWithPopup(auth, PROVIDER)
      .then((result) => {
        console.log("Sign-in successful:", result);
        sendResponse(result);
      })
      .catch((error) => {
        console.error("Sign-in failed:", error);
        sendResponse({ error: error.message });
      });
  } else {
    console.log("Message does not contain initAuth, ignoring.");
  }
});
