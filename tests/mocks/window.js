//mocks/window.js
const window = {
  location: {
    href: "",
  },
  addEventListener: () => {},
};

global.window = window;
