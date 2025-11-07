import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { LoginScreen } from "../../src/screens/LoginScreen";
import { GBThemeProvider } from "../../src/theme/GBThemeProvider";
import { useAuth } from "../../src/contexts/AuthContext";
import { resendVerification } from "../../src/services/auth-service";
import { reportClientEvent } from "../../src/services/telemetry";
import { ApiError } from "../../src/services/api-client";

jest.mock("../../src/contexts/AuthContext");
jest.mock("../../src/services/auth-service");
jest.mock("../../src/services/telemetry");
jest.mock(
"react-native/Libraries/Components/Keyboard/KeyboardAvoidingView",
() => {
  const React = require("react");
  const View = require("react-native/Libraries/Components/View/View");
  const MockKeyboardAvoidingView = React.forwardRef((props, ref) =>
    React.createElement(View, { ...props, ref }),
  );
  MockKeyboardAvoidingView.displayName = "MockKeyboardAvoidingView";
  return { __esModule: true, default: MockKeyboardAvoidingView };
},
);

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockResend = resendVerification as jest.MockedFunction<typeof resendVerification>;
const mockReportEvent = reportClientEvent as jest.MockedFunction<typeof reportClientEvent>;

const renderWithTheme = () =>
  render(
    <GBThemeProvider>
      <LoginScreen />
    </GBThemeProvider>,
  );

describe("LoginScreen resend verification", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      login: jest.fn().mockResolvedValue(undefined),
      logout: jest.fn(),
      refresh: jest.fn(),
      status: "anonymous",
      user: null,
      error: null,
    });
    mockResend.mockReset();
    mockReportEvent.mockReset();
    mockReportEvent.mockResolvedValue(undefined);
  });

  it("resends verification when an email is provided", async () => {
    mockResend.mockResolvedValue(undefined);
    const { getByTestId, getByText } = renderWithTheme();

    fireEvent.changeText(getByTestId("login-email"), "user@example.com");
    fireEvent.press(getByTestId("login-resend"));

    await waitFor(() => {
      expect(mockResend).toHaveBeenCalledWith("user@example.com");
    });
    expect(mockReportEvent).toHaveBeenCalledWith("signup_flow.resend", { status: "ok" });
    await waitFor(() => {
      expect(getByText(/fresh verification email/i)).toBeTruthy();
    });
  });

  it("shows an inline error when no email is provided", async () => {
    const { getByTestId, getByText } = renderWithTheme();
    fireEvent.press(getByTestId("login-resend"));
    expect(getByText(/enter your email/i)).toBeTruthy();
    expect(mockResend).not.toHaveBeenCalled();
  });

  it("surfaces API errors and emits telemetry", async () => {
    mockResend.mockRejectedValue(new ApiError("Too soon", 429, {}));
    const { getByTestId, findByText } = renderWithTheme();

    fireEvent.changeText(getByTestId("login-email"), "user@example.com");
    fireEvent.press(getByTestId("login-resend"));

    expect(await findByText(/Please wait/i)).toBeTruthy();
    expect(mockReportEvent).toHaveBeenCalledWith("signup_flow.resend", { status: "429" });
  });

  it("logs telemetry failures but still shows success copy", async () => {
    mockResend.mockResolvedValue(undefined);
    mockReportEvent.mockRejectedValueOnce(new Error("queue offline"));
    const warnSpy = jest
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const { getByTestId, findByText } = renderWithTheme();

    fireEvent.changeText(getByTestId("login-email"), "user@example.com");
    fireEvent.press(getByTestId("login-resend"));

    expect(await findByText(/fresh verification email/i)).toBeTruthy();
    expect(warnSpy).toHaveBeenCalledWith(
      "signup_flow.resend.telemetry_failed",
      expect.any(Error),
    );
    warnSpy.mockRestore();
  });
});
