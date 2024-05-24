import "../mocks/chrome.js";
import { fetchFromFacebookMarketplace } from "../background.js";

test("request to fb marketplace with cape town location and query 'bicycle' returns results", async () => {
  const listings = await fetchFromFacebookMarketplace(
    "bicycle",
    {
      latitude: -33.9785456,
      longitude: 18.4898533,
    },
    30
  );
  console.log(listings);
  expect(Array.isArray(listings)).toBe(true);
  expect(listings.length).toBeGreaterThan(0);
});

test("request to fb marketplace with hoofdorp location and query 'fiets' returns results", async () => {
  const listings = await fetchFromFacebookMarketplace(
    "fiets",
    {
      latitude: 52.3061,
      longitude: 4.6907,
    },
    30
  );
  console.log(listings);
  expect(Array.isArray(listings)).toBe(true);
  expect(listings.length).toBeGreaterThan(0);
});
