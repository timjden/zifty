function handleToggleChange(event) {
  const isChecked = event.target.checked;
  const toggleId = event.target.id;
  chrome.runtime.sendMessage({
    message: "toggleChange",
    toggleId,
    isChecked,
  });
}

// Add event listeners to toggle switches
document.querySelectorAll(".toggle").forEach((element) => {
  element.addEventListener("change", handleToggleChange);
});

function updateUI(response, handleSignIn, handleLogout, handleSubscribe) {
  console.log("Updating UI");
  // console.log(response);
  // // Disable all toggle switches until UI is updated
  // const toggleSwitches = document.querySelectorAll(".toggle");
  // toggleSwitches.forEach((toggle) => {
  //   toggle.disabled = true;
  // });

  // // Function to update the toggle states
  // function updateToggleStates(toggleStatuses) {
  //   // Map of toggle IDs to their corresponding statuses in the response
  //   const toggleMap = {
  //     amazon: toggleStatuses.amazon ?? true,
  //     walmart: toggleStatuses.walmart ?? true,
  //     takealot: toggleStatuses.takealot ?? true,
  //     bol: toggleStatuses.bol ?? true,
  //     temu: toggleStatuses.temu ?? true,
  //     aliexpress: toggleStatuses.aliexpress ?? true,
  //     google: toggleStatuses.google ?? true,
  //     bing: toggleStatuses.bing ?? true,
  //   };

  //   // Iterate through each toggle and update its state
  //   for (const [toggleId, isChecked] of Object.entries(toggleMap)) {
  //     const toggleElement = document.getElementById(toggleId);
  //     if (toggleElement) {
  //       toggleElement.checked = isChecked;
  //     } else {
  //       console.error(`Toggle element with ID ${toggleId} not found.`);
  //     }
  //   }
  // }

  // // Enable all toggle switches after UI update
  // toggleSwitches.forEach((toggle) => {
  //   toggle.disabled = false;
  // });
  console.log("UI updated");
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded");
  const loadingDotsHTML =
    '<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span>';

  // Proceed to get session details if the browser is supported
  chrome.runtime.sendMessage({ message: "getSessionDetails" }, (response) => {
    //updateUI(response, handleSignIn, handleLogout, handleSubscribe);
  });
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
