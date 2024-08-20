import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithCredential,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

console.log("Popup popped up!");

const firebaseConfig = {
  apiKey: "AIzaSyDgWfdkRTROBGq2JjNzZmRVldgdr8iayLg",
  authDomain: "zifty-4e74a.firebaseapp.com",
  projectId: "zifty-4e74a",
  storageBucket: "zifty-4e74a.appspot.com",
  messagingSenderId: "453820350601",
  appId: "1:453820350601:web:26cc05e968085de657c658",
  measurementId: "G-VEL4KBV88V",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const googleSigninButton = document.createElement("button");
googleSigninButton.id = "google-signin-button";
googleSigninButton.textContent = "Login with Google";
const logoutButton = document.createElement("button");
logoutButton.id = "logout-button";
logoutButton.textContent = "Logout";
const subscribeButton = document.createElement("button");
subscribeButton.id = "subscribe-button";
subscribeButton.textContent = "Subscribe";
const cancelButton = document.createElement("button");
cancelButton.id = "cancel-button";
cancelButton.textContent = "Cancel";
const buttonContainer = document.getElementById("button-container");

document.addEventListener("DOMContentLoaded", () => {
  // Define the sign-in and logout event listeners once
  const handleSignIn = () => {
    chrome.identity.getAuthToken({ interactive: true }, async (token) => {
      const credential = GoogleAuthProvider.credential(null, token);
      try {
        const result = await signInWithCredential(auth, credential);
        const user = result.user;
        const userDocRef = doc(db, "users", user.uid);

        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          // User doesn't exist, add to Firestore
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            paidAt: null, // Initialize paidAt as null until payment is received
          });
          console.log("User added to Firestore:", user.uid);
        } else {
          console.log("User already exists in Firestore:", user.uid);
        }

        console.log("User signed in successfully:", user);
      } catch (error) {
        console.error(
          "Firebase Google Sign-In failed:",
          error.message || error
        );
      }
    });
  };

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        console.log("User signed out successfully.");
      })
      .catch((error) => {
        console.error("Sign out failed:", error.message || error);
      });
  };

  const handleSubscribe = async () => {
    try {
      // Mock subscription logic
      console.log("User subscribed.");

      // Update Firestore with new paidAt value
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(
        userDocRef,
        {
          paidAt: new Date(), // Set current timestamp
        },
        { merge: true }
      );

      // Change the Subscribe button to Cancel
      buttonContainer.removeChild(subscribeButton);
      buttonContainer.appendChild(cancelButton);

      cancelButton.removeEventListener("click", handleCancel);
      cancelButton.addEventListener("click", handleCancel);

      console.log("Button changed to Cancel.");
    } catch (error) {
      console.error("Failed to subscribe:", error.message || error);
    }
  };

  const handleCancel = async () => {
    try {
      // Mock cancel logic
      console.log("User cancelled subscription.");

      // Optionally, clear the paidAt value or handle cancellation logic in Firestore
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(
        userDocRef,
        {
          paidAt: null, // Clear the paidAt timestamp
        },
        { merge: true }
      );

      // Change the Cancel button back to Subscribe
      buttonContainer.removeChild(cancelButton);
      buttonContainer.appendChild(subscribeButton);

      subscribeButton.removeEventListener("click", handleSubscribe);
      subscribeButton.addEventListener("click", handleSubscribe);

      console.log("Button changed back to Subscribe.");
    } catch (error) {
      console.error("Failed to cancel subscription:", error.message || error);
    }
  };

  // Check if the user is already signed in
  onAuthStateChanged(auth, async (user) => {
    // Clear any existing buttons
    buttonContainer.innerHTML = "";

    if (user) {
      // User is signed in, show the logout button
      buttonContainer.appendChild(logoutButton);
      logoutButton.removeEventListener("click", handleLogout); // Prevent duplicate listeners
      logoutButton.addEventListener("click", handleLogout);

      // Fetch user data from Firestore
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const paidAt = userData.paidAt ? userData.paidAt.toDate() : null;
        const now = new Date();

        // Determine which button to show based on paidAt
        if (!paidAt || now - paidAt > 30 * 24 * 60 * 60 * 1000) {
          // Either paidAt is null or more than 30 days ago, show Subscribe button
          buttonContainer.appendChild(subscribeButton);
        } else {
          // paidAt is less than 30 days ago, show Cancel button
          buttonContainer.appendChild(cancelButton);
        }

        subscribeButton.removeEventListener("click", handleSubscribe);
        subscribeButton.addEventListener("click", handleSubscribe);

        cancelButton.removeEventListener("click", handleCancel);
        cancelButton.addEventListener("click", handleCancel);
      }
    } else {
      // User is not signed in, show the login button
      buttonContainer.appendChild(googleSigninButton);
      googleSigninButton.removeEventListener("click", handleSignIn); // Prevent duplicate listeners
      googleSigninButton.addEventListener("click", handleSignIn);
    }
  });
});
