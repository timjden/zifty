import test from "ava";
import "../mocks/chrome.js";
import "../mocks/window.js";
import { getQuery } from "../content.js";

test("passing a takealot url and 'qsearch' as query param name returns search query", (t) => {
  const query = getQuery(
    "https://www.takealot.com/all?qsearch=macbook",
    "qsearch"
  );
  t.is(query, "macbook");
});
