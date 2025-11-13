import type { TextStyle as ReactNativeTextStyle } from "react-native";

declare module "react-native" {
  interface TextStyle {
    fontWeight?:
      | ReactNativeTextStyle["fontWeight"]
      | (string & Record<string, never>);
  }
}
