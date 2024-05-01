const URL_PATTERN = /https:\/\/www\.takealot\.com\/all\?/
const TITLE_XPATH =
  "//div[@class = 'search-count  search-count-module_search-count_1oyVQ']"

//"//span[@class = 'x193iq5w xeuugli x13faqbe x1vvkbs x1xmvt09 x1lliihq x1s928wv xhkezso x1gmr53x x1cpjm7i x1fgarty x1943h6x x14z4hjw x3x7a5m xngnso2 x1qb5hxa x1xlr1w8 xzsf02u']"

const LOCATION_XPATH = null
//"//*[contains(@style, 'MarketplaceStaticMap')]"

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
  console.log("Getting text for xpath: " + xpath)
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
  console.log("Getting lat long for xpath: " + xpath)
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
  let details = {
    title: null,
    lat: null,
    long: null
  }

  if (titleXpath != null) {
    const title = getText(titleXpath)
    console.log(title)
    if (title === null) {
      console.log("Could not find element for XPath: " + titleXpath)
      details.title = null
    } else {
      details.title = title
    }
  } else {
    details.title = "Unknown"
  }

  if (locationXpath != null) {
    const location = getLatLongFromStyle(locationXpath)
    console.log(location)
    if (location === null) {
      console.log("Could not find element for XPath: " + locationXpath)
      details.lat = null
      details.long = null
    } else {
      details.lat = location.lat
      details.long = location.long
    }
  } else {
    details.lat = 0.0
    details.long = 0.0
  }

  return details
}

function onListingLoad() {
  // When a Facebook Marketplace listing loads, create the overlay
  const overlay = createOverlay()
  document.body.appendChild(overlay)

  // When a Facebook Marketplace listing loads, get the listing details
  const listingDetails = getDetails(TITLE_XPATH, LOCATION_XPATH)
  console.log(listingDetails)
  return listingDetails
}

// When the page loads, get the listing details (if it is a Facebook Marketplace listing URL) and send these to background.ts
if (window.location.href.match(URL_PATTERN)) {
  window.addEventListener("load", () => {
    let intervalId = setInterval(async () => {
      let result = onListingLoad()
      if (!containsNullValues(result)) {
        clearInterval(intervalId)
        chrome.runtime.sendMessage({ type: "listingDetails", data: result })
      }
    }, 1000)
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
