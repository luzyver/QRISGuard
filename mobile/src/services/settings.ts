import AsyncStorage from '@react-native-async-storage/async-storage';
import {BACKEND_URL_KEY} from '../constants';
import {getNativeBackendUrl, setNativeBackendUrl} from '../native/NotificationListener';

export async function getBackendUrl(): Promise<string | null> {
  const stored = await AsyncStorage.getItem(BACKEND_URL_KEY);
  if (stored) {
    await setNativeBackendUrl(stored);
    return stored;
  }
  return getNativeBackendUrl();
}

export async function setBackendUrl(url: string): Promise<void> {
  await setNativeBackendUrl(url);
  await AsyncStorage.setItem(BACKEND_URL_KEY, url);
}
