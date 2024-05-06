const URL_PATTERN = /https:\/\/www\.takealot\.com\/all\?/
const TITLE_XPATH =
  "//div[@class = 'search-count toolbar-module_search-count_P0ViI search-count-module_search-count_1oyVQ']"

//"//span[@class = 'x193iq5w xeuugli x13faqbe x1vvkbs x1xmvt09 x1lliihq x1s928wv xhkezso x1gmr53x x1cpjm7i x1fgarty x1943h6x x14z4hjw x3x7a5m xngnso2 x1qb5hxa x1xlr1w8 xzsf02u']"

const LOCATION_XPATH = null
//"//*[contains(@style, 'MarketplaceStaticMap')]"

function createOverlay() {
  const overlay = document.createElement("div")
  overlay.id = "zifty-overlay"
  overlay.style.position = "fixed"
  overlay.style.bottom = "1%"
  overlay.style.left = "0"
  overlay.style.right = "0"
  overlay.style.width = "75%"
  overlay.style.height = "20%"
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)"
  overlay.style.borderColor = "black"
  overlay.style.zIndex = "9999"
  overlay.style.display = "flex"
  overlay.style.justifyContent = "center"
  overlay.style.alignItems = "center"
  overlay.style.color = "white"
  overlay.style.margin = "auto"
  // overlay.textContent = "We found these other items you might like!"

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
      details.title = title.match(/"(.*?)"/)[0]
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
  } else if (request.message === "Listings") {
    console.log("Received listings:", request.data)
    const overlay = document.querySelector("#zifty-overlay")
    for (let i = 0; i < request.data.length && i < 3; i++) {
      const listing = request.data[i]
      console.log(listing)

      // Container div for the listing
      const listingDiv = document.createElement("div")
      listingDiv.style.display = "inline-block"
      listingDiv.style.margin = "1%"
      listingDiv.style.width = "calc(30% - 1%)"
      listingDiv.style.height = "95%" // Explicit height for each listing div
      listingDiv.style.verticalAlign = "center"
      listingDiv.style.boxSizing = "border-box"
      listingDiv.style.overflow = "hidden" // This will clip off any overflowing parts
      listingDiv.style.border = "1px solid white"
      listingDiv.style.position = "relative"

      // Link element
      const linkElement = document.createElement("a")
      linkElement.href = listing.link // Set the href to the listing's link
      linkElement.target = "_blank" // Open link in a new tab
      linkElement.style.width = "100%"
      linkElement.style.height = "100%"
      linkElement.style.display = "block" // Make sure it takes up the whole div

      // Image element
      const img = document.createElement("img")
      img.src = listing.imageSrc
      img.style.maxHeight = "100%" // Reduce max height to allow text space at the bottom
      img.style.maxWidth = "100%"
      img.style.objectFit = "contain"
      img.style.display = "block"
      img.style.margin = "auto"

      // Span element for the title, to overlay on the image
      const titleSpan = document.createElement("span")
      titleSpan.textContent = `${listing.title}\n${listing.location}\n${listing.price}`
      titleSpan.style.position = "absolute"
      titleSpan.style.bottom = "0%" // Adjusted position to leave more space for location and price
      titleSpan.style.left = "0"
      titleSpan.style.width = "100%"
      titleSpan.style.backgroundColor = "rgba(0, 0, 0, 0.5)"
      titleSpan.style.color = "white"
      titleSpan.style.padding = "1%" // Increased padding for better separation
      titleSpan.style.textAlign = "center"
      titleSpan.style.fontSize = "1rem"
      titleSpan.style.whiteSpace = "pre-line" // Adjust font size if necessary

      // Append the image and spans to the link element
      linkElement.appendChild(img)
      linkElement.appendChild(titleSpan)

      // Append the link element to the listing div
      listingDiv.appendChild(linkElement)

      // Append the div to the overlay
      overlay.appendChild(listingDiv)
    }
  }
})

function containsNullValues(result) {
  return !result || Object.values(result).some((x) => x === null)
}
