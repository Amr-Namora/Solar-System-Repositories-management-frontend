import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  console.log('[push] starting registration');

  if (!Device.isDevice) {
    console.log('[push] FAILED: not a physical device');
    return null;
  }
  console.log('[push] is physical device: OK');

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  console.log('[push] existing permission status:', existingStatus);
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    console.log('[push] requested permission, got:', status);
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[push] FAILED: permission not granted, final status:', finalStatus);
    return null;
  }
  console.log('[push] permission granted: OK');

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
    console.log('[push] android channel set: OK');
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  console.log('[push] projectId:', projectId);

  if (!projectId) {
    console.log('[push] FAILED: no projectId found in Constants.expoConfig');
    return null;
  }

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log('[push] got token:', tokenResponse.data);
    return tokenResponse.data;
  } catch (error) {
    console.log('[push] FAILED: getExpoPushTokenAsync threw:', error);
    return null;
  }
}

export async function sendPushTokenToBackend(baseUrl: string): Promise<boolean> {
  console.log('[push] sendPushTokenToBackend called with baseUrl:', baseUrl);
  try {
    const accessToken = await AsyncStorage.getItem('access_token');
    console.log('[push] access_token present:', !!accessToken);
    if (!accessToken) {
      console.log('[push] FAILED: no access_token in AsyncStorage');
      return false;
    }

    const pushToken = await registerForPushNotificationsAsync();
    if (!pushToken) {
      console.log('[push] FAILED: registerForPushNotificationsAsync returned null');
      return false;
    }

    console.log('[push] sending to backend:', `${baseUrl}/push/register/`);
    const response = await fetch(`${baseUrl}/push/register/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ push_token: pushToken, platform: Platform.OS }),
    });
    console.log('[push] backend response status:', response.status);
    const text = await response.text();
    console.log('[push] backend response body:', text);
    return response.ok;
  } catch (error) {
    console.log('[push] FAILED: exception in sendPushTokenToBackend:', error);
    return false;
  }
}

export async function unregisterPushTokenFromBackend(baseUrl: string): Promise<void> {
  try {
    const accessToken = await AsyncStorage.getItem('access_token');
    if (!accessToken) return;

    const pushToken = await registerForPushNotificationsAsync();
    if (!pushToken) return;

    await fetch(`${baseUrl}/push/unregister/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ push_token: pushToken }),
    });
  } catch (error) {
    console.log('Failed to unregister push token:', error);
  }
}