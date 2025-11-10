import React from "react";

export const View = ({ children }: { children?: React.ReactNode }) => (children ?? null);
export const Text = View;
export const Pressable = View;
export const SafeAreaView = View;
export const ScrollView = View;
