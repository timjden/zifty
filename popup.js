const authButton = document.getElementById("auth-button");
const subscriptionContainer = document.getElementById("subscription-container");
const subscriptionMessage = document.getElementById("subscription-message");
const subscriptionButton = document.getElementById("subscription-button");
const signUpMessage = document.getElementById("signup-message");

function updateUI(
  response,
  handleSignIn,
  handleLogout,
  handleSubscribe,
  handleResume,
  handleCancel
) {
  console.log("Updating UI with response:", response);
  if (response.isUserSignedIn) {
    console.log("User is signed in. Updating UI...");
    authButton.textContent = "Logout";
    authButton.removeEventListener("click", handleSignIn);
    authButton.addEventListener("click", handleLogout);

    subscriptionContainer.style.display = "inline-block";
    signUpMessage.textContent = "";

    if (response.hasSubscription) {
      console.log("Subscription found. Updating UI...");
      // Display toggles for Chrome and Bing
      console.log("Hiding toggles...");
      document.getElementsByClassName("premium-switch")[0].style.display =
        "inline-block";
      document.getElementsByClassName("premium-switch")[1].style.display =
        "inline-block";
      if (response.isSubscriptionCancelled) {
        console.log("Subscription is cancelled. Updating UI...");
        subscriptionButton.textContent = "Resume Subscription";
        subscriptionMessage.innerHTML =
          "Your subscription has been cancelled and will expire soon.";
        subscriptionButton.removeEventListener("click", handleSubscribe);
        subscriptionButton.removeEventListener("click", handleCancel);
        subscriptionButton.addEventListener("click", handleResume);
      } else {
        console.log("Subscription is active. Updating UI...");
        subscriptionButton.textContent = "Cancel Subscription 😔";
        subscriptionMessage.innerHTML =
          'Thanks for being a Zifty subscriber! 🎉 <br> Try with Google <a href="https://www.google.com/search?q=buy%20electric%20scooter%20near%20me" target="_blank">now</a>.';
        subscriptionButton.removeEventListener("click", handleSubscribe);
        subscriptionButton.removeEventListener("click", handleResume);
        subscriptionButton.addEventListener("click", handleCancel);
      }
    } else {
      console.log("No subscription found. Updating UI...");
      subscriptionButton.textContent = "💳 Subscribe";
      subscriptionMessage.textContent =
        "Zifty is free to use with Amazon/Walmart etc. Subscribe for $1/week to use Zifty with Google/Bing. Cancel anytime.";
      subscriptionButton.removeEventListener("click", handleCancel);
      subscriptionButton.removeEventListener("click", handleResume);
      subscriptionButton.addEventListener("click", handleSubscribe);

      // Also remove toggles for Chrome and Bing
      console.log("No subscription found. Hiding toggles...");
      document.getElementsByClassName("premium-switch")[0].style.display =
        "none";
      document.getElementsByClassName("premium-switch")[1].style.display =
        "none";
    }
  } else {
    console.log("User is not signed in. Updating UI...");
    authButton.innerHTML =
      '<img src="./assets/google.svg" /> <span id="auth-button-label">Sign in with Google</span>';
    authButton.removeEventListener("click", handleLogout);
    authButton.addEventListener("click", handleSignIn);

    signUpMessage.textContent =
      "Sign in and subscribe to access premium features!";
    subscriptionContainer.style.display = "none";

    // Also remove toggles for Chrome and Bing
    console.log("Hiding toggles...");
    document.getElementsByClassName("premium-switch")[0].style.display = "none";
    document.getElementsByClassName("premium-switch")[1].style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const loadingDotsHTML =
    '<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span>';

  // Check if the browser is Chrome
  chrome.runtime.sendMessage({ message: "checkBrowser" }, function (response) {
    if (!response.isChrome) {
      // Display a message and stop further execution if the browser is not supported
      document.body.innerHTML =
        '<p style="font-size: large;">🚫 This browser is not supported. Currently, Zifty only works with Google Chrome.</p>';
      return; // Exit the callback to prevent further code execution
    }

    // Proceed with the rest of the code if the browser is supported
    chrome.runtime.sendMessage({ message: "getSessionDetails" }, (response) => {
      console.log("Response from background:", response);
      updateUI(
        response,
        handleSignIn,
        handleLogout,
        handleSubscribe,
        handleResume,
        handleCancel
      );
    });

    function handleSignIn() {
      authButton.innerHTML = loadingDotsHTML;

      chrome.runtime.sendMessage({ message: "signIn" }, (response) => {
        if (response.success) {
          chrome.runtime.sendMessage(
            { message: "getSessionDetails" },
            (response) => {
              updateUI(
                response,
                handleSignIn,
                handleLogout,
                handleSubscribe,
                handleResume,
                handleCancel
              );
            }
          );
        }
      });
    }

    const handleLogout = () => {
      authButton.innerHTML = loadingDotsHTML;

      chrome.runtime.sendMessage({ message: "signOut" }, (response) => {
        if (response.success) {
          chrome.runtime.sendMessage(
            { message: "getSessionDetails" },
            (response) => {
              updateUI(
                response,
                handleSignIn,
                handleLogout,
                handleSubscribe,
                handleResume,
                handleCancel
              );
            }
          );
        }
      });
    };

    const handleSubscribe = () => {
      subscriptionButton.innerHTML = loadingDotsHTML;

      chrome.runtime.sendMessage(
        { message: "createSubscription" },
        (response) => {
          if (response.success) {
            try {
              console.log("Redirecting to payment page...");
              chrome.tabs.create({
                url:
                  "https://zifty.lemonsqueezy.com/buy/fa2ee847-27be-4cab-88f8-09ff3b8d6890?checkout[custom][user_id]=" +
                  response.currentUser.uid,
              });
            } catch (error) {
              console.error("Failed to subscribe:", error.message || error);
            }
          }
        }
      );
    };

    const handleResume = () => {
      subscriptionButton.innerHTML = loadingDotsHTML;

      chrome.runtime.sendMessage(
        { message: "resumeSubscription" },
        (response) => {
          if (response.success) {
            chrome.runtime.sendMessage(
              { message: "getSessionDetails" },
              (response) => {
                updateUI(
                  response,
                  handleSignIn,
                  handleLogout,
                  handleSubscribe,
                  handleResume,
                  handleCancel
                );
              }
            );
          }
        }
      );
    };

    const handleCancel = () => {
      subscriptionButton.innerHTML = loadingDotsHTML;

      chrome.runtime.sendMessage(
        { message: "cancelSubscription" },
        (response) => {
          if (response.success) {
            chrome.runtime.sendMessage(
              { message: "getSessionDetails" },
              (response) => {
                updateUI(
                  response,
                  handleSignIn,
                  handleLogout,
                  handleSubscribe,
                  handleResume,
                  handleCancel
                );
              }
            );
          }
        }
      );
    };
  });
});
