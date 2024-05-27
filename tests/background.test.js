import test from "ava";
import "../mocks/chrome.js";
import { fetchFromFacebookMarketplace } from "../background.js";

test("request to fb marketplace with cape town location and query 'bicycle' returns results", async (t) => {
  const listings = await fetchFromFacebookMarketplace(
    "bicycle",
    {
      latitude: -33.9785456,
      longitude: 18.4898533,
    },
    30
  );

  t.true(Array.isArray(listings));
  t.true(listings.length > 0);
});

test("request to fb marketplace with hoofdorp location and query 'fiets' returns results", async (t) => {
  const listings = await fetchFromFacebookMarketplace(
    "fiets",
    {
      latitude: 52.3061,
      longitude: 4.6907,
    },
    30
  );

  t.true(Array.isArray(listings));
  t.true(listings.length > 0);
});
