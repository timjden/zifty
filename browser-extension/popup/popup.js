// Add event listeners to toggle switches
document.querySelectorAll(".toggle").forEach((element) => {
  element.addEventListener("change", handleToggleChange);
});

document.addEventListener("DOMContentLoaded", () => {
  // Get user settings i.e. the sites the user has toggled on/off
  chrome.runtime.sendMessage({ message: "getToggleStates" }, (response) => {
    console.log("Got toggle states:", response.data);
    const toggleStates = response.data;
    const toggles = document.querySelectorAll(".toggle");

    // Loop through each toggle element and set its checked state based on stored values
    toggles.forEach((toggle) => {
      const toggleId = toggle.getAttribute("id"); // Assuming each toggle has an id attribute
      if (toggleId && toggleStates.hasOwnProperty(toggleId)) {
        toggle.checked = toggleStates[toggleId];
      } else {
        // If no stored state, set to false or default value
        toggle.checked = false;
      }
    });
  });
});
// });

function handleToggleChange(event) {
  const isChecked = event.target.checked;
  const toggleId = event.target.id;
  chrome.runtime.sendMessage({
    message: "toggleChange",
    toggleId,
    isChecked,
  });
}

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
