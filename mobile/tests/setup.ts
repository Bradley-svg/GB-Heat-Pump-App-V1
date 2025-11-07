import "@testing-library/jest-native/extend-expect";

jest.mock(
  "react-native/Libraries/vendor/emitter/EventEmitter",
  () => require("events").EventEmitter,
);

jest.mock("react-native/src/private/animated/NativeAnimatedHelper", () => {
  const apiStub = {
    addAnimatedEventToView: jest.fn(),
    removeAnimatedEventFromView: jest.fn(),
    startAnimatingNode: jest.fn(),
    stopAnimation: jest.fn(),
    setWaitingForIdentifier: jest.fn(),
    clearWaitingForIdentifier: jest.fn(),
    flushQueue: jest.fn(),
    startListeningToAnimatedNodeValue: jest.fn(),
    stopListeningToAnimatedNodeValue: jest.fn(),
  };
  return {
    __esModule: true,
    default: {
      API: apiStub,
      addListener: jest.fn(),
      removeListeners: jest.fn(),
      generateNewNodeTag: jest.fn(() => 1),
      generateNewAnimationId: jest.fn(() => 1),
      assertNativeAnimatedModule: jest.fn(),
      shouldUseNativeDriver: () => false,
      transformDataType: (value: unknown) => value,
    },
  };
});

jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: {
    Success: "success",
    Warning: "warning",
    Error: "error",
  },
  ImpactFeedbackStyle: { Medium: "medium" },
}));

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  const MockIcon = ({ name }: { name?: string }) =>
    React.createElement(Text, {
      children: name ?? "icon",
      accessibilityRole: "image",
    });
  return { MaterialIcons: MockIcon };
});

jest.mock("react-native/Libraries/Animated/Animated", () => {
  const { View } = require("react-native");
  class MockAnimatedValue {
    value: number;
    constructor(initial: number) {
      this.value = initial;
    }
    setValue(next: number) {
      this.value = next;
    }
    interpolate() {
      return this;
    }
  }
  const AnimatedMock = {
    Value: MockAnimatedValue,
    View,
    timing: jest.fn(() => ({
      start: (callback?: () => void) => callback?.(),
    })),
  };
  return { __esModule: true, default: AnimatedMock, ...AnimatedMock };
});
