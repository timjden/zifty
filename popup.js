import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithCredential,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { isUserSubscribed, isUserCancelled } from "./background.js";

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
const functions = getFunctions(app);

const authButton = document.getElementById("auth-button");
const subscriptionContainer = document.getElementById("subscription-container");
const subscriptionMessage = document.getElementById("subscription-message");
const subscriptionButton = document.getElementById("subscription-button");
const signUpMessage = document.getElementById("signup-message");

document.addEventListener("DOMContentLoaded", () => {
  const loadingDotsHTML =
    '<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span>';

  const handleSignIn = () => {
    authButton.innerHTML = loadingDotsHTML;

    chrome.identity.clearAllCachedAuthTokens(function () {});

    chrome.identity.getAuthToken({ interactive: true }, async (token) => {
      if (chrome.runtime.lastError || !token) {
        // User closed the login screen or canceled the process
        console.log(
          "User canceled the sign-in process or closed the login window."
        );
        authButton.innerHTML =
          '<img src="./assets/google.svg" /> <span id="auth-button-label">Sign in with Google</span>'; // Revert if canceled
        return;
      }

      const credential = GoogleAuthProvider.credential(null, token);

      try {
        const result = await signInWithCredential(auth, credential);
        const user = result.user;
        const userDocRef = doc(db, "users", user.uid);

        const userDoc = await getDoc(userDocRef);

        // Save the user to Firestore
        if (!userDoc.exists()) {
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            paidAt: null,
            cancelledAt: null,
          });
          console.log("User added to Firestore:", user.uid);
        }

        authButton.textContent = "Logout";
        authButton.removeEventListener("click", handleSignIn);
        authButton.addEventListener("click", handleLogout);
      } catch (error) {
        console.error(
          "Firebase Google Sign-In failed:",
          error.message || error
        );
        authButton.innerHTML =
          '<img src="./assets/google.svg" /> <span id="auth-button-label">Sign in with Google</span>'; // Revert if failed
      }
    });
  };

  const handleLogout = () => {
    authButton.innerHTML = loadingDotsHTML;

    signOut(auth)
      .then(() => {
        console.log("User signed out successfully.");
        authButton.innerHTML =
          '<img src="./assets/google.svg" /> <span id="auth-button-label">Sign in with Google</span>'; // Update button text
        subscriptionContainer.style.display = "none"; // Hide subscription UI
      })
      .catch((error) => {
        console.error("Sign out failed:", error.message || error);
        authButton.textContent = "Logout"; // Revert if failed
      });
  };

  const handleSubscribe = async () => {
    subscriptionButton.innerHTML = loadingDotsHTML;

    try {
      console.log("Redirecting to payment page...");
      chrome.tabs.create({
        url:
          "https://zifty.lemonsqueezy.com/buy/108ac084-c9a0-4c10-bd31-0a2f4552c7bf?userId=" +
          auth.currentUser.uid,
      });
    } catch (error) {
      console.error("Failed to subscribe:", error.message || error);
      subscriptionButton.textContent = "💳 Subscribe"; // Revert if failed
      subscriptionMessage.textContent =
        "Zifty is free to use with Amazon. Subscribe for $1/week to use Zifty with Google. Cancel anytime.";
    }
  };

  const handleResume = async () => {
    subscriptionButton.innerHTML = loadingDotsHTML;

    try {
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const subscriptionId = userData.subscriptionId;

        if (!subscriptionId) {
          throw new Error("No subscription ID found for this user.");
        }

        // Call the resumeSubscription function using Firebase Functions
        // This Firebase Function will call the Lemon Squeezy API to resume the subscription, and update the user's document in Firestore
        const resumeSubscription = httpsCallable(
          functions,
          "resumeSubscription"
        );

        await resumeSubscription({ subscriptionId })
          .then((result) => {
            console.log("Subscription resumed:", result.data);
          })
          .catch((error) => {
            console.error("Error resuming subscription:", error.message);
            throw new Error("Failed to resume the subscription.");
          });

        // Update the UI to reflect the subscription status
        subscriptionButton.textContent = "Cancel Subscription";
        subscriptionMessage.innerHTML =
          'Thanks for being a Zifty subscriber! 🎉 Try <a href="https://www.google.com/search?q=buy+a+kettle+near+me" target="_blank">now</a>.';
        subscriptionButton.removeEventListener("click", handleResume);
        subscriptionButton.addEventListener("click", handleCancel);
      } else {
        throw new Error("User document does not exist.");
      }
    } catch (error) {
      console.error("Failed to resume subscription:", error.message || error);
      subscriptionButton.textContent = "Resume Subscription"; // Revert if failed
      subscriptionMessage.innerHTML =
        "Your subscription has been cancelled and will expire soon.";
    }
  };

  const handleCancel = async () => {
    subscriptionButton.innerHTML = loadingDotsHTML;

    try {
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const subscriptionId = userData.subscriptionId;

        if (!subscriptionId) {
          throw new Error("No subscription ID found for this user.");
        }

        // Call the cancelSubscription function using Firebase Functions
        // This Firebase Function will call the Lemon Squeezy API to cancel the subscription, and update the user's document in Firestore
        const cancelSubscription = httpsCallable(
          functions,
          "cancelSubscription"
        );

        await cancelSubscription({ subscriptionId })
          .then((result) => {
            console.log("Subscription canceled:", result.data);
          })
          .catch((error) => {
            console.error("Error canceling subscription:", error.message);
            throw new Error("Failed to cancel the subscription.");
          });

        // Update the UI to reflect the subscription status
        subscriptionButton.textContent = "Resume Subscription";
        subscriptionMessage.innerHTML =
          "Your subscription has been cancelled and will expire soon.";
        subscriptionButton.removeEventListener("click", handleCancel);
        subscriptionButton.addEventListener("click", handleResume);
      } else {
        throw new Error("User document does not exist.");
      }
    } catch (error) {
      console.error("Failed to cancel subscription:", error.message || error);
      subscriptionButton.textContent = "Cancel Subscription 😔"; // Revert if failed
      subscriptionMessage.innerHTML =
        'Thanks for being a Zifty subscriber! 🎉 Try <a href="https://www.google.com/search?q=buy+a+kettle+near+me" target="_blank">now</a>.';
    }
  };

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // If a user is signed in change the functionality of the button to logout
      // If the user is not signed in, change the functionality of the button to sign in
      authButton.textContent = "Logout";
      authButton.removeEventListener("click", handleSignIn);
      authButton.addEventListener("click", handleLogout);

      subscriptionContainer.style.display = "inline-block";
      signUpMessage.textContent = "";

      // Then check if that user is subscribed
      const isSubscribed = await isUserSubscribed(user.uid);

      if (isSubscribed) {
        const isCancelled = await isUserCancelled(user.uid);
        // If the user is subscribed but has cancelled, show the renew button, otherwise show the cancel button
        // If the user is not subscribed, show the subscribe button
        if (isCancelled) {
          subscriptionButton.textContent = "Resume Subscription";
          subscriptionMessage.innerHTML =
            "Your subscription has been cancelled and will expire soon.";
          subscriptionButton.removeEventListener("click", handleSubscribe);
          subscriptionButton.addEventListener("click", handleResume);
        } else {
          subscriptionButton.textContent = "Cancel Subscription 😔";
          subscriptionMessage.innerHTML =
            'Thanks for being a Zifty subscriber! 🎉 Try <a href="https://www.google.com/search?q=buy+a+kettle+near+me" target="_blank">now</a>.';
          subscriptionButton.removeEventListener("click", handleSubscribe);
          subscriptionButton.addEventListener("click", handleCancel);
        }
      } else {
        subscriptionButton.textContent = "💳 Subscribe";
        subscriptionMessage.textContent =
          "Zifty is free to use with Amazon. Subscribe for $1/week to use Zifty with Google. Cancel anytime.";
        subscriptionButton.removeEventListener("click", handleCancel);
        subscriptionButton.removeEventListener("click", handleResume);
        subscriptionButton.addEventListener("click", handleSubscribe);
      }
    } else {
      authButton.innerHTML =
        '<img src="./assets/google.svg" /> <span id="auth-button-label">Sign in with Google</span>';
      authButton.removeEventListener("click", handleLogout);
      authButton.addEventListener("click", handleSignIn);

      signUpMessage.textContent =
        "Sign up and subscribe to access premium features!";
      subscriptionContainer.style.display = "none";
    }
  });
});
