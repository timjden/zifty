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
  const title = getText(titleXpath)
  if (title === null) {
    console.log("Could not find element for XPath: " + titleXpath)
  }
  const location = getLatLongFromStyle(locationXpath)
  if (location === null) {
    console.log("Could not find element for XPath: " + locationXpath)
  }
  return {
    title,
    lat: location ? location.lat : null,
    long: location ? location.long : null
  }
}

function onListingLoad() {
  // When a Facebook Marketplace listing loads, create the overlay
  const overlay = createOverlay()
  document.body.appendChild(overlay)

  // When a Facebook Marketplace listing loads, get the listing details
  const listingTitleXpath =
    "//span[@class = 'x193iq5w xeuugli x13faqbe x1vvkbs x1xmvt09 x1lliihq x1s928wv xhkezso x1gmr53x x1cpjm7i x1fgarty x1943h6x x14z4hjw x3x7a5m xngnso2 x1qb5hxa x1xlr1w8 xzsf02u']"
  const listingLocationXpath = "//*[contains(@style, 'MarketplaceStaticMap')]"

  const listingDetails = getDetails(listingTitleXpath, listingLocationXpath)
  console.log(listingDetails)
  return listingDetails
}

// When the page loads, get the listing details (if it is a Facebook Marketplace listing URL) and send these to background.ts
if (window.location.href.match(URL_PATTERN)) {
  window.addEventListener("load", () => {
    let result = onListingLoad()
    if (!containsNullValues(result)) {
      chrome.runtime.sendMessage({ type: "listingDetails", data: result })
    }
  })
}

// When background.ts sends a message that the URL changed, get the listing details (if it is a Facebook Marketplace listing URL) and send these to background.ts
chrome.runtime.onMessage.addListener((request) => {
  if (request.message === "URL changed") {
    if (request.url.match(URL_PATTERN)) {
      let intervalId = setInterval(async () => {
        let result = onListingLoad()
        if (!containsNullValues(result)) {
          clearInterval(intervalId)
          chrome.runtime.sendMessage({ type: "listingDetails", data: result })
        }
      }, 1000)
    }
  }
})

function containsNullValues(result) {
  return !result || Object.values(result).some((x) => x === null)
}
