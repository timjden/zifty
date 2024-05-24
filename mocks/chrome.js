// mocks/chrome.js
const chrome = {
  runtime: {
    lastError: null,
    connect: jest.fn(),
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
    },
  },
  storage: {
    local: {
      get: jest.fn((key, callback) => {
        callback({ [key]: "value" });
      }),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
    },
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
    },
  },
  tabs: {
    query: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    executeScript: jest.fn(),
    onUpdated: {
      addListener: jest.fn(),
    },
  },
  // Add other APIs as needed
};

global.chrome = chrome;
