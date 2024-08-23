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

const authButton = document.getElementById("auth-button");
const subscriptionContainer = document.getElementById("subscription-container");
const subscriptionMessage = document.getElementById("subscription-message");
const subscriptionButton = document.getElementById("subscription-button");

document.addEventListener("DOMContentLoaded", () => {
  const loadingDotsHTML =
    '<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span>';

  const handleSignIn = () => {
    // Show loading dots immediately
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

        // Save the user email to Firestore
        if (!userDoc.exists()) {
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email, // Add the email here
            paidAt: null,
            cancelledAt: null,
          });
          console.log("User added to Firestore:", user.uid);
        } else {
          // If the document exists, ensure the email is up-to-date
          await setDoc(
            userDocRef,
            {
              email: user.email, // Update email if necessary
            },
            { merge: true }
          );
          console.log(
            "User already exists in Firestore, email updated:",
            user.uid
          );
        }

        authButton.textContent = "Logout";
        authButton.removeEventListener("click", handleSignIn);
        authButton.addEventListener("click", handleLogout);

        console.log("User signed in successfully:", user);
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
    // Show loading dots immediately
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
    // Show loading dots immediately
    subscriptionButton.innerHTML = loadingDotsHTML;

    try {
      console.log("Redirecting to payment page...");

      // Open a new tab with the Lemon Squeezy subscription link
      chrome.tabs.create({
        url:
          "https://zifty.lemonsqueezy.com/buy/108ac084-c9a0-4c10-bd31-0a2f4552c7bf?userId=" +
          auth.currentUser.uid,
      });

      // No need to update Firestore here, as it will be handled by the webhook
    } catch (error) {
      console.error("Failed to subscribe:", error.message || error);
      subscriptionButton.textContent = "Subscribe"; // Revert if failed
      subscriptionMessage.textContent =
        "Zifty is free to use with Amazon. Subscribe for $1/week to use Zifty with Google. Cancel anytime.";
    }
  };

  const handleCancel = async () => {
    // Show loading dots immediately
    subscriptionButton.innerHTML = loadingDotsHTML;

    try {
      console.log("User cancelled subscription.");
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(
        userDocRef,
        {
          cancelledAt: formatDateToCustomISOString(new Date()),
        },
        { merge: true }
      );

      subscriptionButton.textContent = "Subscribe";
      subscriptionMessage.textContent =
        "Zifty is free to use with Amazon. Subscribe for $1/week to use Zifty with Google. Cancel anytime.";
      subscriptionButton.removeEventListener("click", handleCancel);
      subscriptionButton.addEventListener("click", handleSubscribe);
      console.log("Button changed back to Subscribe.");
    } catch (error) {
      console.error("Failed to cancel subscription:", error.message || error);
      subscriptionButton.textContent = "Cancel Subscription"; // Revert if failed
      subscriptionMessage.innerHTML =
        'Thanks for being a Zifty subscriber! Try <a href="https://www.google.com/search?q=buy+a+kettle+near+me" target="_blank">now</a> 🎉';
    }
  };

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      authButton.textContent = "Logout";
      authButton.removeEventListener("click", handleSignIn);
      authButton.addEventListener("click", handleLogout);

      subscriptionContainer.style.display = "inline-block";

      const isSubscribed = await isUserSubscribed(user.uid);

      if (isSubscribed) {
        subscriptionButton.textContent = "Cancel Subscription";
        subscriptionMessage.innerHTML =
          'Thanks for being a Zifty subscriber! Try <a href="https://www.google.com/search?q=buy+a+kettle+near+me" target="_blank">now</a> 🎉';
        subscriptionButton.removeEventListener("click", handleSubscribe);
        subscriptionButton.addEventListener("click", handleCancel);
      } else {
        subscriptionButton.textContent = "Subscribe";
        subscriptionMessage.textContent =
          "Zifty is free to use with Amazon. Subscribe for $1/week to use Zifty with Google. Cancel anytime.";
        subscriptionButton.removeEventListener("click", handleCancel);
        subscriptionButton.addEventListener("click", handleSubscribe);
      }
    } else {
      authButton.innerHTML =
        '<img src="./assets/google.svg" /> <span id="auth-button-label">Sign in with Google</span>';
      authButton.removeEventListener("click", handleLogout);
      authButton.addEventListener("click", handleSignIn);

      subscriptionContainer.style.display = "none";
    }
  });
});

async function isUserSubscribed(uid) {
  try {
    const userDocRef = doc(db, "users", uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      console.log("User exists in Firestore:", uid);
      const userData = userDoc.data();
      let paidAt = userData.paidAt;

      // Check if paidAt is a Firestore Timestamp
      if (paidAt && typeof paidAt.toDate === "function") {
        paidAt = paidAt.toDate(); // Convert Firestore Timestamp to Date
      } else if (typeof paidAt === "string" || paidAt instanceof String) {
        paidAt = new Date(paidAt); // Convert string to Date
      }

      console.log("Paid at:", paidAt);
      const now = new Date();

      // Check if paidAt is within the last 30 days
      if (
        paidAt &&
        now.getTime() - paidAt.getTime() <= 30 * 24 * 60 * 60 * 1000
      ) {
        return true; // User is a subscriber
      }
    }

    return false; // User is not a subscriber or subscription has expired
  } catch (error) {
    console.error(
      "Failed to check subscription status:",
      error.message || error
    );
    return false;
  }
}

function formatDateToCustomISOString(date) {
  // Get the ISO string without milliseconds
  let isoString = date.toISOString().split(".")[0];

  // Add microseconds
  let microseconds = "000000";

  // Construct the final string with microseconds and 'Z'
  let formattedDate = `${isoString}.${microseconds}Z`;

  return formattedDate;
}

let formattedDate = formatDateToCustomISOString(new Date());
console.log(formattedDate);
