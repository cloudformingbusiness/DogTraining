// src/utils/appVersion.ts
import Constants from "expo-constants";

const manifest = Constants.manifest || Constants.expoConfig || {};

export const getAppVersion = () => {
  return manifest.version || "unknown";
};

export const getAppName = () => {
  return manifest.name || "BUDashboard";
};

export const getFullVersionString = () => {
  return `${getAppName()} v${getAppVersion()}`;
};