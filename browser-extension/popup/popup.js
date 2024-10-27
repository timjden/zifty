// Add event listeners to toggle switches
document.querySelectorAll(".toggle").forEach((element) => {
  element.addEventListener("change", handleToggleChange);
});

// When the popup loads...
document.addEventListener("DOMContentLoaded", () => {
  // ... get user settings i.e. the sites the user has toggled on/off
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

// Send a message to background to update toggle states in chrome storage when a toggle switch is changed
function handleToggleChange(event) {
  const isChecked = event.target.checked;
  const toggleId = event.target.id;
  chrome.runtime.sendMessage({
    message: "toggleChange",
    toggleId,
    isChecked,
  });
}
