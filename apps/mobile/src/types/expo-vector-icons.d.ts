declare module "@expo/vector-icons" {
  import * as React from "react";

  export type MaterialIconName = string;

  export interface MaterialIconProps {
    name: MaterialIconName;
    size?: number;
    color?: string;
    [key: string]: unknown;
  }

  export const MaterialIcons: React.ComponentType<MaterialIconProps>;
}
