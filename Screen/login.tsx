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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login, getUserRole } from './api'; // Updated import
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

type Props = { navigation: any };

const LoginScreen = ({ navigation }: Props) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!name.trim() || !password) {
      Alert.alert('خطأ', 'يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Get tokens
      const resp = await login(name.trim(), password);
      const { access, refresh } = resp.data;
      await AsyncStorage.setItem('access_token', access);
      await AsyncStorage.setItem('refresh_token', refresh);

      // 2. Get user role information
      const userResp = await getUserRole();
      const { is_manager, is_workshop_manager, role } = userResp.data;

      // 3. Route based on role
      await AsyncStorage.setItem('isLoggedIn', 'true');
      
      if (is_manager) {
        // مشرف (Admin)
        await AsyncStorage.setItem('userType', 'admin');
        await AsyncStorage.setItem('userRole', 'مشرف');
        Alert.alert('تم تسجيل الدخول بنجاح', 'مرحباً بك كـمسؤول');
        navigation.navigate('Index');
      } else if (is_workshop_manager) {
        // مشرف الورشة (Workshop Manager)
        await AsyncStorage.setItem('userType', 'workshopManager');
        await AsyncStorage.setItem('userRole', 'مشرف الورشة');
        Alert.alert('تم تسجيل الدخول بنجاح', 'مرحباً بك كمشرف ورشة');
        navigation.navigate('Aworkshop'); // Navigate to workshop manager screen
      } else {
        // بائع (Seller)
        await AsyncStorage.setItem('userType', 'user');
        await AsyncStorage.setItem('userRole', 'بائع');
        Alert.alert('تم تسجيل الدخول بنجاح', 'مرحباً بك');
        navigation.navigate('MainMaterial');
      }
    } catch (err: any) {
      console.log('Login error:', err);

      let errorMessage = 'فشل في تسجيل الدخول، تحقق من بياناتك ثم حاول مجدداً.';

      if (err.response) {
        const { status, data } = err.response;

        if (status === 400) {
          errorMessage = data.detail || data.non_field_errors?.[0] || data.username?.[0] || data.password?.[0] || errorMessage;
        } else if (status === 401) {
          errorMessage = data.detail || 'غير مصرح بالدخول. تحقق من بيانات الاعتماد الخاصة بك.';
        } else if (status >= 500) {
          errorMessage = 'خطأ في الخادم الداخلي. يرجى المحاولة مرة أخرى لاحقًا.';
        } else if (data.detail) {
          errorMessage = data.detail;
        }
      } else if (err.request) {
        errorMessage = 'تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.';
      }

      Alert.alert('خطأ في تسجيل الدخول', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

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
          <TextInput
            style={styles.input}
            placeholder="أدخل كلمة المرور"
            placeholderTextColor="#9ca3af"
            secureTextEntry={true}
            value={password}
            onChangeText={setPassword}
            editable={!isLoading}
          />

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
});

export default LoginScreen;