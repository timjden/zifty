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
const subscriptionButton = document.getElementById("subscription-button");

document.addEventListener("DOMContentLoaded", () => {
  const loadingDotsHTML =
    '<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span>';

  const handleSignIn = () => {
    // Show loading dots immediately
    authButton.innerHTML = loadingDotsHTML;

    chrome.identity.getAuthToken({ interactive: true }, async (token) => {
      const credential = GoogleAuthProvider.credential(null, token);
      try {
        const result = await signInWithCredential(auth, credential);
        const user = result.user;
        const userDocRef = doc(db, "users", user.uid);

        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            paidAt: null,
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
        authButton.textContent = "Sign in with Google"; // Revert if failed
      }
    });
  };

  const handleLogout = () => {
    // Show loading dots immediately
    authButton.innerHTML = loadingDotsHTML;

    signOut(auth)
      .then(() => {
        console.log("User signed out successfully.");
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
      console.log("User subscribed.");
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(
        userDocRef,
        {
          paidAt: new Date(),
        },
        { merge: true }
      );

      subscriptionButton.textContent = "Cancel";
      subscriptionButton.removeEventListener("click", handleSubscribe);
      subscriptionButton.addEventListener("click", handleCancel);
      console.log("Button changed to Cancel.");
    } catch (error) {
      console.error("Failed to subscribe:", error.message || error);
      subscriptionButton.textContent = "Subscribe"; // Revert if failed
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
          paidAt: null,
        },
        { merge: true }
      );

      subscriptionButton.textContent = "Subscribe";
      subscriptionButton.removeEventListener("click", handleCancel);
      subscriptionButton.addEventListener("click", handleSubscribe);
      console.log("Button changed back to Subscribe.");
    } catch (error) {
      console.error("Failed to cancel subscription:", error.message || error);
      subscriptionButton.textContent = "Cancel"; // Revert if failed
    }
  };

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      authButton.textContent = "Logout";
      authButton.removeEventListener("click", handleSignIn);
      authButton.addEventListener("click", handleLogout);

      subscriptionButton.style.display = "inline-block";

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const paidAt = userData.paidAt ? userData.paidAt.toDate() : null;
        const now = new Date();

        if (!paidAt || now - paidAt > 30 * 24 * 60 * 60 * 1000) {
          subscriptionButton.textContent = "Subscribe";
          subscriptionButton.removeEventListener("click", handleCancel);
          subscriptionButton.addEventListener("click", handleSubscribe);
        } else {
          subscriptionButton.textContent = "Cancel";
          subscriptionButton.removeEventListener("click", handleSubscribe);
          subscriptionButton.addEventListener("click", handleCancel);
        }
      }
    } else {
      authButton.textContent = "Sign in with Google";
      authButton.removeEventListener("click", handleLogout);
      authButton.addEventListener("click", handleSignIn);

      subscriptionButton.style.display = "none";
    }
  });
});
