// Send a message to content.ts if the URL changes
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.url) {
    chrome.tabs.sendMessage(tabId, {
      message: "URL changed",
      url: changeInfo.url
    })
  }
})

// Receive the listing details from content.ts
chrome.runtime.onMessage.addListener((request) => {
  if (request.type === "listingDetails") {
    console.log("Received result:", request.data)
  }
  return true
})
