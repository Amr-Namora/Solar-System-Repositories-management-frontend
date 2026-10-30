// login.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  Platform,
  Linking // <--- IMPORT THIS
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from '../app.json'; // <--- IMPORT THIS to read app.json
import { login, getUserRole } from './api'; 
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { sendPushTokenToBackend } from '../utils/pushNotifications'; // adjust path to where you saved it
import { API_BASE_URL } from './api2'; // same base URL, already exported there
type Props = { navigation: any };

const LoginScreen = ({ navigation }: Props) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Read the version directly from app.json
  const currentAppVersion = Constants.expo.version;

  const handleLogin = async () => {
    if (!name.trim() || !password) {
      Alert.alert('خطأ', 'يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setIsLoading(true);

    try {
      // 1. طلب الـ API الأول: تسجيل الدخول (سينتهي تلقائياً بعد 10 ثوانٍ إذا فشل)
      const resp = await login(name.trim(), password, currentAppVersion);
      const { access, refresh } = resp.data;
      
      // حفظ الـ Tokens
      await AsyncStorage.setItem('access_token', access);
      await AsyncStorage.setItem('refresh_token', refresh);

      // 2. طلب الـ API الثاني: جلب بيانات المستخدم
      // بما أننا قمنا بحفظ الـ Token للتو، سيقوم الـ Interceptor بإرساله بنجاح
      const userResp = await getUserRole();
      const { is_manager, is_workshop_manager, is_store_keeper, role } = userResp.data;

      // 3. توجيه المستخدم حسب الصلاحية
      await AsyncStorage.setItem('isLoggedIn', 'true');
      await sendPushTokenToBackend(API_BASE_URL);
      if (is_manager) {
        await AsyncStorage.setItem('userType', 'admin');
        await AsyncStorage.setItem('userRole', 'مشرف');
        Alert.alert('تم تسجيل الدخول بنجاح', 'مرحباً بك كـمسؤول');
        navigation.navigate('Index');
      } else if (is_workshop_manager) {
        await AsyncStorage.setItem('userType', 'workshopManager');
        await AsyncStorage.setItem('userRole', 'مشرف الورشة');
        Alert.alert('تم تسجيل الدخول بنجاح', 'مرحباً بك كمشرف ورشة');
        navigation.navigate('Workshops'); 
      } else if (is_store_keeper) {
        await AsyncStorage.setItem('userType', 'storeKeeper');
        await AsyncStorage.setItem('userRole', 'أمين المخزن');
        Alert.alert('تم تسجيل الدخول بنجاح', 'مرحباً بك كأمين مخزن');
        navigation.navigate('MainMaterial'); 
      } else {
        await AsyncStorage.setItem('userType', 'user');
        await AsyncStorage.setItem('userRole', 'بائع');
        Alert.alert('تم تسجيل الدخول بنجاح', 'مرحباً بك');
        navigation.navigate('MainMaterial');
      }

    } catch (err: any) {
      console.log('Login error:', err);

      // التقاط خطأ الـ Timeout الحقيقي من Axios
      if (err.code === 'ECONNABORTED' || err.message.includes('timeout') || err.message === 'Network Error') {
        Alert.alert(
          'خطأ في الاتصال', 
          'الخادم لا يستجيب، يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.'
        );
        setIsLoading(false);
        return;
      }

      if (err.response) {
        const { status, data } = err.response;

        // التحقق من التحديث الإجباري
        if (status === 400 && data.error_type && data.error_type[0] === 'update_required') {
          Alert.alert(
            'تحديث مطلوب',
            data.detail[0],
            [
              { text: 'إلغاء', style: 'cancel' },
              { 
                text: 'تثبيت الآن', 
                onPress: () => Linking.openURL(data.download_link[0])
              }
            ],
            { cancelable: false }
          );
          setIsLoading(false);
          return; 
        }

        let errorMessage = 'فشل في تسجيل الدخول، تحقق من بياناتك ثم حاول مجدداً.';
        if (status === 400) {
          errorMessage = data.detail?.[0] || data.detail || data.non_field_errors?.[0] || errorMessage;
        } else if (status === 401) {
          errorMessage = data.detail || 'غير مصرح بالدخول. تحقق من بيانات الاعتماد الخاصة بك.';
        } else if (status >= 500) {
          errorMessage = 'خطأ في الخادم الداخلي. يرجى المحاولة مرة أخرى لاحقًا.';
        }

        Alert.alert('خطأ في تسجيل الدخول', errorMessage);
      } else {
        Alert.alert('خطأ', 'حدث خطأ غير متوقع في الاتصال بالخادم.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  // ... (Keep the rest of your return and styles exactly the same)
  return (
    <KeyboardAwareScrollView
      contentContainerStyle={styles.scrollContainer}
      keyboardShouldPersistTaps="handled"
      enableOnAndroid={true}
    >
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Image source={require('../assets/logo.png')} style={styles.logo} />
          <Text style={styles.title}>نظام إدارة المواد</Text>
          <Text style={styles.subtitle}>سجل دخولك للمتابعة</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>الاسم</Text>
          <TextInput
            style={styles.input}
            placeholder="أدخل اسم المستخدم"
            placeholderTextColor="#9ca3af"
            value={name}
            onChangeText={setName}
            autoCapitalize="none"
            editable={!isLoading}
          />

          <Text style={styles.label}>كلمة المرور</Text>

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="أدخل كلمة المرور"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <MaterialCommunityIcons
                name={showPassword ? "eye-off" : "eye"}
                size={20}
                color="#6b7280"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, styles.defaultButton]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? 'جاري التحقق...' : 'تسجيل الدخول'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
};

// ... keep your existing styles the same
const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 100,
    height: 50,
    marginBottom: 10,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#4b5563',
  },
  form: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 6,
    color: '#374151',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    fontSize: 16,
    color: '#000000',
  },
  loginButton: {
    paddingVertical: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  defaultButton: {
    backgroundColor: '#2563eb',
  },
  loginButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    marginBottom: 16,
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000000',
    textAlign: 'right',
  },
  eyeButton: {
    padding: 4,
  },
});

export default LoginScreen;