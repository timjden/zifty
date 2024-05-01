chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.url) {
    // Check if the URL has changed
    console.log("URL changed to: " + changeInfo.url)
    chrome.tabs.sendMessage(tabId, {
      message: "URL changed",
      url: changeInfo.url
    })
  }
})
