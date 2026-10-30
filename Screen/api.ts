// src/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.1.104:8000';
// const API_BASE_URL = 'https://amrnamora.pythonanywhere.com';
//  const API_BASE_URL = 'https://solar-system-repositories-management-1h39.onrender.com';


 const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // <--- 1. إضافة وقت توقف إجباري من الشبكة (10 ثوانٍ)
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  async (config: any) => {
    // 2. إذا كان الطلب هو لتسجيل الدخول، تجاهل قراءة الـ Token تماماً لتجنب تهنيج AsyncStorage
    if (config.url && config.url.includes('/account/token/')) {
      return config;
    }

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.log('AsyncStorage Error:', e);
    }
    
    return config;
  },
  error => Promise.reject(error)
);

export const login = (username: string, password: string, appVersion: string) =>
  api.post<{ access: string; refresh: string }>('/account/token/', {
    username,
    password,
    app_version: appVersion
  });

export const getUserRole = () =>
  api.get<{ 
    is_manager: boolean; 
    is_workshop_manager: boolean;
    is_store_keeper: boolean;
    role: string;
  }>('/account/me/');

export default api;