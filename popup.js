const authButton = document.getElementById("auth-button");
const subscriptionContainer = document.getElementById("subscription-container");
const subscriptionMessage = document.getElementById("subscription-message");
const subscriptionButton = document.getElementById("subscription-button");
const buttonContainer = document.getElementById("button-container");
// const subscriptionOptions = document.getElementById("subscription-options");

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

function updateUI(response, handleSignIn, handleLogout, handleSubscribe) {
  console.log("Updating UI");
  console.log(response);
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
    //console.log("Updating toggle states with:", toggleStatuses);
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
    //console.log("User is signed in. Updating UI...");
    authButton.textContent = "Logout";
    authButton.removeEventListener("click", handleSignIn);
    authButton.addEventListener("click", handleLogout);

    subscriptionContainer.style.display = "flex";
    // Delete signup message element from the DOM
    const signUpMessage = document.getElementById("signup-message");
    //console.log("Removing signup-message");
    //console.log(signUpMessage);
    if (signUpMessage !== null) {
      //console.log("Remove signup-message");
      signUpMessage.remove();
    }

    displayToggles(true);
    updateToggleStates(response.toggleStatuses);

    if (response.hasSubscription) {
      // Display toggles for premium features
      document.getElementsByClassName("premium-switch")[0].style.display =
        "inline-block";
      document.getElementsByClassName("premium-switch")[1].style.display =
        "inline-block";
      subscriptionButton.style.display = "none";
      buttonContainer.style.height = "100px";
      subscriptionMessage.innerHTML = `You're using Zifty premium! <span class="emoji">🎉</span> You have access to premium until ${formatDate(
        response.expiresAt
      )}.`;
      subscriptionButton.removeEventListener("click", handleSubscribe);
    } else {
      subscriptionButton.innerHTML = '<span class="emoji">💳</span> Buy';
      subscriptionMessage.innerHTML =
        'You are using Zifty basic. <span class="emoji">😢</span><br>Buy access to premium features below.';
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

    // Add signup message to the DOM
    if (!document.getElementById("signup-message")) {
      const signUpMessage = document.createElement("p");
      signUpMessage.id = "signup-message";
      signUpMessage.textContent =
        "Sign in and subscribe to access premium features!";
      buttonContainer.appendChild(signUpMessage);
    }

    // signUpMessage.textContent =
    //   "Sign in and subscribe to access premium features!";
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
  console.log("UI updated");
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded");
  const loadingDotsHTML =
    '<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span>';

  // Check if the browser is Chrome
  // chrome.runtime.sendMessage({ message: "checkBrowser" }, function (response) {
  //   if (!response.isChrome) {
  //     console.log("Browser is not supported.");
  //     // Display a message and stop further execution if the browser is not supported
  //     document.body.innerHTML =
  //       '<p style="font-size: large;"><span class="emoji">🚫</span> This browser is not supported. Currently, Zifty only works with Google Chrome.</p>';
  //     return;
  //   }

  //   console.log("Browser is supported.");

  // Proceed to get session details if the browser is supported
  chrome.runtime.sendMessage({ message: "getSessionDetails" }, (response) => {
    updateUI(response, handleSignIn, handleLogout, handleSubscribe);
  });

  function handleSignIn() {
    authButton.innerHTML = loadingDotsHTML;
    console.log("Sending sign-in message");
    chrome.runtime.sendMessage({ message: "signIn" }, (response) => {
      if (response.success) {
        chrome.runtime.sendMessage(
          { message: "getSessionDetails" },
          (response) => {
            updateUI(response, handleSignIn, handleLogout, handleSubscribe);
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
            updateUI(response, handleSignIn, handleLogout, handleSubscribe);
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
                "https://zifty.lemonsqueezy.com/buy/108ac084-c9a0-4c10-bd31-0a2f4552c7bf?checkout[custom][user_id]=" +
                response.currentUser.uid,
            });
          } catch (error) {
            console.error("Failed to subscribe:", error.message || error);
          }
        }
      }
    );
  };
});
// });

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short", // Full month name
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true, // Display in 12-hour format
  });
}
