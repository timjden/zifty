import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://www.facebook.com/marketplace/item/*"]
}

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
      const backgroundImage = style.match(/background-image:url\((.*?)\)/)
      if (backgroundImage) {
        const url = backgroundImage[1]
        const latLong = url.match(/center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/)
        if (latLong) {
          return { lat: parseFloat(latLong[1]), long: parseFloat(latLong[2]) }
        }
      }
    }
  }
  return null
}

function getDetails(titleXpath: string, locationXpath: string) {
  const title = getText(titleXpath)
  const location = getLatLongFromStyle(locationXpath)
  return {
    title,
    lat: location ? location.lat : null,
    long: location ? location.long : null
  }
}

window.addEventListener("load", () => {
  const overlay = createOverlay()
  document.body.appendChild(overlay)

  const listingTitleXpath =
    "/html/body/div[1]/div/div[1]/div/div[3]/div/div/div[1]/div[1]/div[2]/div/div/div/div/div/div[1]/div[2]/div/div[2]/div/div[1]/div[1]/div[1]/div[1]/h1/span"
  const listingLocationXpath =
    "/html/body/div[1]/div/div[1]/div/div[3]/div/div/div[1]/div[1]/div[2]/div/div/div/div/div/div[1]/div[2]/div/div[2]/div/div[1]/div[1]/div[1]/div[5]/div/div[2]/div[3]/div[1]/div/div/div/div[1]"

  const listingDetails = getDetails(listingTitleXpath, listingLocationXpath)
  console.log(listingDetails)
})
