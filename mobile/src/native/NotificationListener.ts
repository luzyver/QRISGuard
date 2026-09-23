import {NativeModules} from 'react-native';

const {NotificationListener} = NativeModules;

export async function isPermissionGranted(): Promise<boolean> {
  try {
    return await NotificationListener.isPermissionGranted();
  } catch {
    return false;
  }
}

export async function openNotificationSettings(): Promise<void> {
  try {
    await NotificationListener.openNotificationSettings();
  } catch {}
}

export async function setWhitelist(apps: string[]): Promise<void> {
  await NotificationListener.setWhitelist(apps);
}

export async function getWhitelist(): Promise<string[]> {
  try {
    return await NotificationListener.getWhitelist();
  } catch {
    return [];
  }
}

export async function setNativeBackendUrl(url: string): Promise<void> {
  await NotificationListener.setBackendUrl(url);
}

export async function getNativeBackendUrl(): Promise<string | null> {
  try {
    return await NotificationListener.getBackendUrl();
  } catch {
    return null;
  }
}
