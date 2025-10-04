// src/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

 //const API_BASE_URL = 'http://192.168.1.101:8000';
const API_BASE_URL = 'https://amrnamora.pythonanywhere.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  async (config: any) => {
    const token = await AsyncStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

export const login = (username: string, password: string) =>
  api.post<{ access: string; refresh: string }>('/account/token/', {
    username,
    password,
  });


// NEW: Get user role information
export const getUserRole = () =>
  api.get<{ 
    is_manager: boolean; 
    is_workshop_manager: boolean;
    role: string;
  }>('/account/me/');

export default api;

