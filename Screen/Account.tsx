import React, { useState, useEffect } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Badge } from '../component/Badge';
import { GradientCircle } from '../component/GradientCircle';
import RefreshableScreen from '../component/RefreshableScreen';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  I18nManager,
  Modal,
  Alert,
} from 'react-native';
import MainLayout from '../component/MainLayout';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './api2';
import AppLoader from '../component/AppLoader';
import { useNavigation } from '@react-navigation/native'; 

I18nManager.forceRTL(true); // Arabic RTL

// Updated UserInfo interface to match API
interface UserInfo {
  username: string;
  is_staff: boolean;
  is_active: boolean;
  store_name: string | null;
}

// ✅ Now includes 'adminworkshop'
type UserType = 'admin' | 'employee' | 'adminworkshop';

interface AccountContentProps {
  userInfo: UserInfo | null;
  onRefresh: () => Promise<void>;
  loading: boolean;
  onLogout: () => void; // ✅ Add onLogout prop
}

const AccountContent: React.FC<AccountContentProps> = ({
  userInfo,
  onRefresh,
  loading,
  onLogout, // ✅ Destructure onLogout
}) => {
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handlePasswordSave = async () => {
    if (newPassword.length < 6) {
      Alert.alert('خطأ', 'يجب أن تكون كلمة المرور على الأقل 6 أحرف');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('خطأ', 'كلمتا المرور غير متطابقتين');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/UpdatePassword/`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: newPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'فشل في تغيير كلمة السر');
      }
      setPasswordModalVisible(false);
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('نجاح', 'تم تغيير كلمة المرور بنجاح');
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'حدث خطأ أثناء تغيير كلمة السر');
    }
  };

  return (
    <RefreshableScreen onRefresh={onRefresh}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userCard}>
            <GradientCircle name={userInfo?.username ? userInfo.username.charAt(0) : '?'} />
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{userInfo?.username || '---'}</Text>
              <View style={styles.badges}>
                <Badge
                  text={userInfo?.is_active ? 'نشط' : 'غير نشط'}
                  color={userInfo?.is_active ? '#22c55e' : '#ef4444'}
                />
                <Badge
                  text={
                    userInfo?.is_staff
                      ? 'المسؤول'
                      : userInfo?.store_name === null
                      ? 'مسؤول ورشة'
                      : 'المتجر'
                  }
                  outline
                />
              </View>
            </View>
          </View>
        </View>

        {/* User Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>المعلومات الشخصية</Text>
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>الاسم</Text>
              <Text style={styles.infoValue}>{userInfo?.username || '---'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>المتجر / الورشة</Text>
              <Text style={styles.infoValue}>
                {userInfo?.store_name
                  ? userInfo.store_name
                  : userInfo?.is_staff
                  ? 'نظام الإدارة'
                  : 'مسؤول ورشة (لا متجر مرتبط)'}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الإجراءات السريعة</Text>
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setPasswordModalVisible(true)}
              disabled={!userInfo}
            >
              <MaterialIcons name="edit" size={20} color="#3b82f6" />
              <Text style={styles.actionText}>تعديل كلمة المرور</Text>
            </TouchableOpacity>

            {/* ✅ Logout Button */}
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#fef2f2' }]}
              onPress={onLogout}
            >
              <MaterialIcons name="logout" size={20} color="#ef4444" />
              <Text style={[styles.actionText, { color: '#ef4444' }]}>تسجيل الخروج</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Password Change Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={passwordModalVisible}
          onRequestClose={() => setPasswordModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>تغيير كلمة المرور</Text>

              <TextInput
                style={styles.input}
                placeholder="أدخل كلمة المرور الجديدة"
                placeholderTextColor="#999"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                textAlign="right"
              />

              <TextInput
                style={styles.input}
                placeholder="تأكيد كلمة المرور"
                placeholderTextColor="#999"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                textAlign="right"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#ef4444' }]}
                  onPress={() => setPasswordModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>إلغاء</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#22c55e' }]}
                  onPress={handlePasswordSave}
                >
                  <Text style={styles.modalButtonText}>حفظ</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </RefreshableScreen>
  );
};

const AccountScreen = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/profile/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('فشل في جلب الملف الشخصي');
      }
      const data = await res.json();
      setUserInfo({
        username: data.username,
        is_staff: data.is_staff,
        is_active: data.is_active,
        store_name: data.store, // assuming your API returns `store`
      });
    } catch (e) {
      console.error(e);
      Alert.alert('خطأ', 'فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };
const navigation = useNavigation<any>();

const handleLogout = async () => {
  try {
    await AsyncStorage.removeItem('access_token');
    navigation.replace('Login'); 
  } catch (error) {
    console.error('Logout error:', error);
    Alert.alert('خطأ', 'فشل تسجيل الخروج');
  }
};

  useEffect(() => {
    fetchProfile();
  }, []);

  const getUserType = (): UserType => {
    if (!userInfo) return 'employee'; 
    if (userInfo.is_staff) return 'admin';
    if (userInfo.store_name === null) return 'adminworkshop'; 
    return 'employee'; // regular store user
  };

  if (loading) {
    return <AppLoader />;
  }

  return (
    <MainLayout userType={getUserType()}>
      <AccountContent
        userInfo={userInfo}
        onRefresh={fetchProfile}
        loading={loading}
        onLogout={handleLogout} // ✅ Pass logout handler
      />
    </MainLayout>
  );
};

export default AccountScreen;

// Styles (unchanged)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f9ff',
  },
  header: {
    backgroundColor: '#2563eb',
    padding: 20,
    borderBottomRightRadius: 30,
    borderBottomLeftRadius: 30,
  },
  userCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 16,
    gap: 16,
  },
  userName: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  badges: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginTop: 4,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'right',
    marginBottom: 16,
  },
  infoContainer: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '400',
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'right',
    alignSelf: 'stretch',
  },
  input: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    fontSize: 16,
    textAlign: 'right',
  },
  modalButtons: {
    flexDirection: 'row-reverse',
    gap: 12,
    width: '100%',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});