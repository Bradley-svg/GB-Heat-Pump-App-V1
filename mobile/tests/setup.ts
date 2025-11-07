import "@testing-library/jest-native/extend-expect";

jest.mock(
  "react-native/Libraries/vendor/emitter/EventEmitter",
  () => require("events").EventEmitter
);
