const authButton = document.getElementById("auth-button");
const subscriptionContainer = document.getElementById("subscription-container");
const subscriptionMessage = document.getElementById("subscription-message");
const subscriptionButton = document.getElementById("subscription-button");
const signUpMessage = document.getElementById("signup-message");

// Function to handle the toggle state change
function handleToggleChange(event) {
  const isChecked = event.target.checked; // true if "on", false if "off"
  const toggleId = event.target.id; // Get the ID of the toggle switch

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
  //console.log("Updating UI with response:", response);

  // Function to update the toggle states
  function updateToggleStates(toggleStatuses) {
    console.log("Updating toggle states with:", toggleStatuses);
    // Map of toggle IDs to their corresponding statuses in the response
    const toggleMap = {
      amazon: toggleStatuses.amazon ?? true, // Default to "on"
      walmart: toggleStatuses.walmart ?? true, // Default to "on"
      takealot: toggleStatuses.takealot ?? true, // Default to "on"
      bol: toggleStatuses.bol ?? true, // Default to "on"
      temu: toggleStatuses.temu ?? true, // Default to "on"
      aliexpress: toggleStatuses.aliexpress ?? true, // Default to "on"
      google: toggleStatuses.google ?? true, // Default to "on"
      bing: toggleStatuses.bing ?? true, // Default to "on"
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

    // Update toggle states based on response
    updateToggleStates(response.toggleStatuses);

    const leftToggles = Array.from(
      document.getElementsByClassName("left-switch")
    );
    const rightToggles = Array.from(
      document.getElementsByClassName("right-switch")
    );
    const toggles = [...leftToggles, ...rightToggles];
    console.log(toggles);
    for (let i = 0; i < toggles.length; i++) {
      toggles[i].style.display = "inline-block";
    }

    if (response.hasSubscription) {
      //console.log("Subscription found. Updating UI...");
      // Display toggles for Google and Bing
      //console.log("Displaying toggles for premium features...");
      document.getElementsByClassName("premium-switch")[0].style.display =
        "inline-block";
      document.getElementsByClassName("premium-switch")[1].style.display =
        "inline-block";

      if (response.isSubscriptionCancelled) {
        //console.log("Subscription is cancelled. Updating UI...");
        subscriptionButton.textContent = "Resume Subscription";
        subscriptionMessage.innerHTML =
          "Your subscription has been cancelled and will expire soon.";
        subscriptionButton.removeEventListener("click", handleSubscribe);
        subscriptionButton.removeEventListener("click", handleCancel);
        subscriptionButton.addEventListener("click", handleResume);
      } else {
        //console.log("Subscription is active. Updating UI...");
        subscriptionButton.textContent = "Cancel Subscription 😔";
        subscriptionMessage.innerHTML =
          'Thanks for being a Zifty subscriber! 🎉 <br> Try with Google <a href="https://www.google.com/search?q=buy%20electric%20scooter%20near%20me" target="_blank">now</a>.';
        subscriptionButton.removeEventListener("click", handleSubscribe);
        subscriptionButton.removeEventListener("click", handleResume);
        subscriptionButton.addEventListener("click", handleCancel);
      }
    } else {
      //console.log("No subscription found. Updating UI...");
      subscriptionButton.textContent = "💳 Subscribe";
      subscriptionMessage.textContent =
        "Zifty is free to use with Amazon/Walmart etc. Subscribe for $1/week to use Zifty with Google/Bing. Cancel anytime.";
      subscriptionButton.removeEventListener("click", handleCancel);
      subscriptionButton.removeEventListener("click", handleResume);
      subscriptionButton.addEventListener("click", handleSubscribe);

      // Hide toggles for Google and Bing
      //console.log("No subscription found. Hiding toggles for premium features...");
      document.getElementsByClassName("premium-switch")[0].style.display =
        "none";
      document.getElementsByClassName("premium-switch")[1].style.display =
        "none";
    }
  } else {
    //console.log("User is not signed in. Updating UI...");
    authButton.innerHTML =
      '<img src="./assets/google.svg" /> <span id="auth-button-label">Sign in with Google</span>';
    authButton.removeEventListener("click", handleLogout);
    authButton.addEventListener("click", handleSignIn);

    signUpMessage.textContent =
      "Sign in and subscribe to access premium features!";
    subscriptionContainer.style.display = "none";

    // Hide toggles for Google and Bing
    //console.log("Hiding toggles for premium features...");
    const leftToggles = Array.from(
      document.getElementsByClassName("left-switch")
    );
    const rightToggles = Array.from(
      document.getElementsByClassName("right-switch")
    );
    const toggles = [...leftToggles, ...rightToggles];
    console.log(toggles);
    for (let i = 0; i < toggles.length; i++) {
      toggles[i].style.display = "none";
    }
    document.getElementsByClassName("premium-switch")[0].style.display = "none";
    document.getElementsByClassName("premium-switch")[1].style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const loadingDotsHTML =
    '<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span>';

  // Disable all toggle switches initially
  const toggleSwitches = document.querySelectorAll("input[type=checkbox]");
  toggleSwitches.forEach((toggle) => {
    toggle.disabled = true;
  });

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
      //console.log("Response from background:", response);
      updateUI(
        response,
        handleSignIn,
        handleLogout,
        handleSubscribe,
        handleResume,
        handleCancel
      );

      // Enable all toggle switches after UI update
      toggleSwitches.forEach((toggle) => {
        toggle.disabled = false;
      });
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

              // Enable all toggle switches after UI update
              toggleSwitches.forEach((toggle) => {
                toggle.disabled = false;
              });
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

              // Enable all toggle switches after UI update
              toggleSwitches.forEach((toggle) => {
                toggle.disabled = false;
              });
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
              //console.log("Redirecting to payment page...");
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

                // Enable all toggle switches after UI update
                toggleSwitches.forEach((toggle) => {
                  toggle.disabled = false;
                });
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

                // Enable all toggle switches after UI update
                toggleSwitches.forEach((toggle) => {
                  toggle.disabled = false;
                });
              }
            );
          }
        }
      );
    };
  });
});
