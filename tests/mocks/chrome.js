//mocks/chrome.js
const chrome = {
  runtime: {
    lastError: null,
    connect: () => {},
    sendMessage: () => {},
    onMessage: {
      addListener: () => {},
    },
  },
  storage: {
    local: {
      get: (key, callback) => {
        callback({ [key]: "value" });
      },
      set: () => {},
      remove: () => {},
      clear: () => {},
    },
    sync: {
      get: () => {},
      set: () => {},
      remove: () => {},
      clear: () => {},
    },
  },
  tabs: {
    query: () => {},
    create: () => {},
    update: () => {},
    executeScript: () => {},
    onUpdated: {
      addListener: () => {},
    },
  },
  // Add other APIs as needed
};

global.chrome = chrome;
