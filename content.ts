const URL_PATTERN = /https:\/\/www\.facebook\.com\/marketplace\/item\//

function createOverlay() {
  const overlay = document.createElement("div")
  overlay.style.position = "fixed"
  overlay.style.bottom = "1%"
  overlay.style.left = "0"
  overlay.style.right = "0"
  overlay.style.width = "60%"
  overlay.style.height = "15%"
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)"
  overlay.style.borderColor = "black"
  overlay.style.zIndex = "9999"
  overlay.style.display = "flex"
  overlay.style.justifyContent = "center"
  overlay.style.alignItems = "center"
  overlay.style.color = "white"
  overlay.style.margin = "auto"
  overlay.textContent = "We found these other items you might like!"

  const closeButton = document.createElement("span")
  closeButton.style.position = "absolute"
  closeButton.style.top = "5px"
  closeButton.style.right = "5px"
  closeButton.style.color = "white"
  closeButton.style.cursor = "pointer"
  closeButton.textContent = "X"

  closeButton.addEventListener("click", () => {
    document.body.removeChild(overlay)
  })

  overlay.appendChild(closeButton)

  return overlay
}

function getText(xpath: string) {
  const result = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  )
  return result.singleNodeValue ? result.singleNodeValue.textContent : null
}

function getLatLongFromStyle(xpath: string) {
  const result = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  )
  if (result.singleNodeValue) {
    const style = (result.singleNodeValue as HTMLElement).getAttribute("style")
    if (style) {
      const latLong = style.match(/center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/)
      if (latLong) {
        return { lat: parseFloat(latLong[1]), long: parseFloat(latLong[2]) }
      }
    }
  }
  return null
}

function getDetails(titleXpath: string, locationXpath: string) {
  console.log("Getting details...")
  const title = getText(titleXpath)
  console.log("Title: ", title)
  const location = getLatLongFromStyle(locationXpath)
  console.log("Location: ", location)
  return {
    title,
    lat: location ? location.lat : null,
    long: location ? location.long : null
  }
}

function onListingLoad() {
  const overlay = createOverlay()
  document.body.appendChild(overlay)

  const listingTitleXpath =
    "//span[@class = 'x193iq5w xeuugli x13faqbe x1vvkbs x1xmvt09 x1lliihq x1s928wv xhkezso x1gmr53x x1cpjm7i x1fgarty x1943h6x x14z4hjw x3x7a5m xngnso2 x1qb5hxa x1xlr1w8 xzsf02u']"
  const listingLocationXpath = "//*[contains(@style, 'MarketplaceStaticMap')]"

  const listingDetails = getDetails(listingTitleXpath, listingLocationXpath)
  console.log(listingDetails)
  return listingDetails
}

// Check if the current URL is a Facebook Marketplace listing
if (window.location.href.match(URL_PATTERN)) {
  window.addEventListener("load", () => {
    onListingLoad()
  })
}

// Check if the URL is a Facebook Marketplace listing when the URL changes
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.message === "URL changed") {
    console.log("New URL: " + request.url)
    if (request.url.match(URL_PATTERN)) {
      // Call onListingLoad periodically until it meets the condition
      let intervalId = setInterval(async () => {
        let result = await onListingLoad()
        if (!containsNullValues(result)) {
          clearInterval(intervalId) // Stop calling when condition is met
        }
      }, 1000) // Check every 1 second
    }
  }
})

function containsNullValues(result) {
  return !result || Object.values(result).some((x) => x === null)
}
