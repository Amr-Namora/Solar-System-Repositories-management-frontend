// src/screens/api2.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const HOST = Platform.OS === 'android'
  ? '10.0.2.2'
  : '192.168.137.21';

//export const API_BASE_URL = `http://${HOST}:8000`;
//  export const API_BASE_URL = 'https://amrnamora.pythonanywhere.com';
 export const API_BASE_URL = 'http://192.168.1.104:8000';
//  export const API_BASE_URL = 'https://solar-system-repositories-management-1h39.onrender.com';

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use(async cfg => {
  const token = await AsyncStorage.getItem('access_token');
  if (token && cfg.headers) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});
// ... existing code ...

export const sendReservation = (payload: {
  Reservation_id: number;
  username: string;
}) => api.post('/send_reservation/', payload);


export const sendRequestedReservation = (payload: {
  Reservation_id: number;
  username: string;
}) => api.post('/send_requested_reservation/', payload);


// ... existing code ...
export const confirmReservation = (payload: {
  Reservation_id: number;
  username: string;
}) => api.post('/confirm_reservation/', payload);

export const confirmRequestedReservation = (payload: {
  Reservation_id: number;
  username: string;
}) => api.post('/confirm_requested_reservation/', payload);

// src/screens/api2.ts
// ← below confirmReservation

/** POST /cancle_reservation/ → cancel a pending reservation */
export const cancelReservation = (payload: {
  Reservation_id: number;
  username: string;
}) => api.post('/cancle_reservation/', payload);

export const cancelRequestedReservation = (payload: {
  Reservation_id: number;
  username: string;
}) => api.post('/cancle_requested_reservation/', payload);


export default api;

