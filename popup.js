const authButton = document.getElementById("auth-button");
const subscriptionContainer = document.getElementById("subscription-container");
const subscriptionMessage = document.getElementById("subscription-message");
const subscriptionButton = document.getElementById("subscription-button");
const signUpMessage = document.getElementById("signup-message");

function handleToggleChange(event) {
  const isChecked = event.target.checked;
  const toggleId = event.target.id;

  if (isChecked) {
    //console.log(`${toggleId} is ON`);
    chrome.runtime.sendMessage({
      message: "toggleChange",
      toggleId,
      isChecked,
    });
  } else {
    //console.log(`${toggleId} is OFF`);
    chrome.runtime.sendMessage({
      message: "toggleChange",
      toggleId,
      isChecked,
    });
  }
}

// Add event listeners to toggle switches
document
  .getElementById("amazon")
  .addEventListener("change", handleToggleChange);
document
  .getElementById("walmart")
  .addEventListener("change", handleToggleChange);
document
  .getElementById("takealot")
  .addEventListener("change", handleToggleChange);
document.getElementById("bol").addEventListener("change", handleToggleChange);
document.getElementById("temu").addEventListener("change", handleToggleChange);
document
  .getElementById("aliexpress")
  .addEventListener("change", handleToggleChange);
document
  .getElementById("google")
  .addEventListener("change", handleToggleChange);
document.getElementById("bing").addEventListener("change", handleToggleChange);

function updateUI(
  response,
  handleSignIn,
  handleLogout,
  handleSubscribe,
  handleResume,
  handleCancel
) {
  // Disable all toggle switches until UI is updated
  const toggleSwitches = document.querySelectorAll("input[type=checkbox]");
  toggleSwitches.forEach((toggle) => {
    toggle.disabled = true;
  });

  // Function to display/hide the toggle switches
  function displayToggles(display) {
    const style = display ? "inline-block" : "none";
    const leftToggles = Array.from(
      document.getElementsByClassName("left-switch")
    );
    const rightToggles = Array.from(
      document.getElementsByClassName("right-switch")
    );
    const toggles = [...leftToggles, ...rightToggles];
    //console.log(toggles);
    for (let i = 0; i < toggles.length; i++) {
      toggles[i].style.display = style;
    }
  }

  // Function to update the toggle states
  function updateToggleStates(toggleStatuses) {
    console.log("Updating toggle states with:", toggleStatuses);
    // Map of toggle IDs to their corresponding statuses in the response
    const toggleMap = {
      amazon: toggleStatuses.amazon ?? true,
      walmart: toggleStatuses.walmart ?? true,
      takealot: toggleStatuses.takealot ?? true,
      bol: toggleStatuses.bol ?? true,
      temu: toggleStatuses.temu ?? true,
      aliexpress: toggleStatuses.aliexpress ?? true,
      google: toggleStatuses.google ?? true,
      bing: toggleStatuses.bing ?? true,
    };

    // Iterate through each toggle and update its state
    for (const [toggleId, isChecked] of Object.entries(toggleMap)) {
      const toggleElement = document.getElementById(toggleId);
      if (toggleElement) {
        toggleElement.checked = isChecked;
        //console.log(`Set ${toggleId} to ${isChecked ? "ON" : "OFF"}`);
      } else {
        console.error(`Toggle element with ID ${toggleId} not found.`);
      }
    }
  }

  if (response.isUserSignedIn) {
    console.log("User is signed in. Updating UI...");
    authButton.textContent = "Logout";
    authButton.removeEventListener("click", handleSignIn);
    authButton.addEventListener("click", handleLogout);

    subscriptionContainer.style.display = "inline-block";
    signUpMessage.textContent = "";

    displayToggles(true);
    updateToggleStates(response.toggleStatuses);

    if (response.hasSubscription) {
      // Display toggles for premium features
      document.getElementsByClassName("premium-switch")[0].style.display =
        "inline-block";
      document.getElementsByClassName("premium-switch")[1].style.display =
        "inline-block";

      if (response.isSubscriptionCancelled) {
        subscriptionButton.textContent = "Resume Subscription";
        subscriptionMessage.innerHTML =
          "Your subscription has been cancelled and will expire soon.";
        subscriptionButton.removeEventListener("click", handleSubscribe);
        subscriptionButton.removeEventListener("click", handleCancel);
        subscriptionButton.addEventListener("click", handleResume);
      } else {
        subscriptionButton.textContent = "Cancel Subscription 😔";
        subscriptionMessage.innerHTML =
          'Thanks for being a Zifty subscriber! 🎉 <br> Try with Google <a href="https://www.google.com/search?q=buy%20electric%20scooter%20near%20me" target="_blank">now</a>.';
        subscriptionButton.removeEventListener("click", handleSubscribe);
        subscriptionButton.removeEventListener("click", handleResume);
        subscriptionButton.addEventListener("click", handleCancel);
      }
    } else {
      subscriptionButton.textContent = "💳 Subscribe";
      subscriptionMessage.textContent =
        "Zifty is free to use with Amazon/Walmart etc. Subscribe for $1/week to use Zifty with Google/Bing. Cancel anytime.";
      subscriptionButton.removeEventListener("click", handleCancel);
      subscriptionButton.removeEventListener("click", handleResume);
      subscriptionButton.addEventListener("click", handleSubscribe);

      // Hide toggles for premium features
      document.getElementsByClassName("premium-switch")[0].style.display =
        "none";
      document.getElementsByClassName("premium-switch")[1].style.display =
        "none";
    }
  } else {
    authButton.innerHTML =
      '<img src="./assets/google.svg" /> <span id="auth-button-label">Sign in with Google</span>';
    authButton.removeEventListener("click", handleLogout);
    authButton.addEventListener("click", handleSignIn);

    signUpMessage.textContent =
      "Sign in and subscribe to access premium features!";
    subscriptionContainer.style.display = "none";

    // Hide toggle switches if user is not signed in ...
    displayToggles(false);
    // ... and hide toggles for premium features
    document.getElementsByClassName("premium-switch")[0].style.display = "none";
    document.getElementsByClassName("premium-switch")[1].style.display = "none";
  }

  // Enable all toggle switches after UI update
  toggleSwitches.forEach((toggle) => {
    toggle.disabled = false;
  });
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
      return;
    }

    // Proceed to get session details if the browser is supported
    chrome.runtime.sendMessage({ message: "getSessionDetails" }, (response) => {
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
            // No need to update UI here since the user will be redirected to the payment page, and the UI update will be triggered when the user returns
            try {
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
