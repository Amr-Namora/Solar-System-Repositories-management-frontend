import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  I18nManager,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { getStatusBarHeight } from 'react-native-status-bar-height';
import { commonStyles } from '../styles/commonStyles';
import { Ionicons, MaterialIcons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import MainLayout from '../component/MainLayout';
import RefreshableScreen from '../component/RefreshableScreen';
import { API_BASE_URL } from './api2';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppLoader from '../component/AppLoader';
I18nManager.forceRTL(true);

interface Employee {
  id: number;
  username: string;
  role: string;
  is_active: boolean;
  date_joined: string;
  storeName: string;
}

interface Store {
  id: number;
  name: string;
}

const AdminUsers = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Employee | null>(null);
  const [newUser, setNewUser] = useState({
  username: '',
  password: '',
  confirm_password: '',
  role: 'بائع', // Default is seller
  store_name: '',
});
 const [editUser, setEditUser] = useState({
  username: '',
  password: '',
  confirm_password: '',
  role: 'بائع', // Default is seller
  store_name: '',
});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showStoresList, setShowStoresList] = useState(false);
  const [showStoresListEdit, setShowStoresListEdit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditConfirmPassword, setShowEditConfirmPassword] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('لم يتم العثور على رمز المصادقة');

      const response = await fetch(`${API_BASE_URL}/users/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('فشل في جلب المستخدمين');

      const data = await response.json();
      setEmployees(Array.isArray(data.users) ? data.users : []);
    } catch (error) {
      Alert.alert('خطأ', error.message || 'فشل في تحميل المستخدمين');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStores = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('لم يتم العثور على رمز المصادقة');

      const response = await fetch(`${API_BASE_URL}/stores/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('فشل في جلب المتاجر');

      const data = await response.json();
      setStores(Array.isArray(data.stores) ? data.stores : []);
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchStores();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchUsers(), fetchStores()]);
    } catch (error) {
      console.error('Refresh failed:', error);
      setRefreshing(false);
    }
  };

  const activeEmployees = employees.filter((e) => e.is_active).length;
  const inactiveEmployees = employees.filter((e) => !e.is_active).length;

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.confirm_password || !newUser.store_name) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (newUser.password !== newUser.confirm_password) {
      Alert.alert('خطأ', 'كلمة السر غير متطابقة');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('لم يتم العثور على رمز المصادقة');

      const response = await fetch(`${API_BASE_URL}/signup/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: newUser.username,
          password: newUser.password,
          confirm_password: newUser.confirm_password,
          role: newUser.role,
          store_name: newUser.store_name,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        let backendMessage = '';
        if (data) {
          if (typeof data.error === 'string') backendMessage = data.error;
          else if (typeof data.message === 'string') backendMessage = data.message;
          else if (typeof data === 'object') {
            try {
              backendMessage = Object.entries(data)
                .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : String(val)}`)
                .join('\n');
            } catch {}
          }
        }
        if (backendMessage.includes('already exists')) {
          backendMessage = 'هذا الاسم محجوز مسبقا';
        }
        throw new Error(backendMessage || 'فشل في إضافة المستخدم');
      }

      Alert.alert('نجاح', (data && data.message) || 'تم إضافة المستخدم بنجاح');
      setShowAddUserModal(false);
      setNewUser({
        username: '',
        password: '',
        confirm_password: '',
        role: 'بائع',
        store_name: '',
      });
      setShowPassword(false);
      setShowConfirmPassword(false);
      fetchUsers();
    } catch (error) {
      Alert.alert('خطأ', error.message || 'حدث خطأ أثناء إضافة المستخدم');
    }
  };

  const handleEditUser = async () => {
    if (!editingUser || !editUser.username || !editUser.store_name) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (editUser.password && editUser.password !== editUser.confirm_password) {
      Alert.alert('خطأ', 'كلمة السر غير متطابقة');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('لم يتم العثور على رمز المصادقة');

      const response = await fetch(`${API_BASE_URL}/users/${editingUser.id}/update/`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: editUser.username,
          password: editUser.password,
          role: editUser.role,
          store_name: editUser.store_name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error && errorData.error.includes('already exists')) {
          throw new Error('هذا الاسم محجوز مسبقا');
        }
        throw new Error(errorData.error || 'فشل في تحديث المستخدم');
      }

      Alert.alert('نجاح', 'تم تحديث المستخدم بنجاح');
      setShowEditUserModal(false);
      setEditingUser(null);
      setEditUser({
        username: '',
        password: '',
        confirm_password: '',
        role: 'بائع',
        store_name: '',
      });
      setShowEditPassword(false);
      setShowEditConfirmPassword(false);
      fetchUsers();
    } catch (error) {
      Alert.alert('خطأ', error.message || 'حدث خطأ أثناء تحديث المستخدم');
    }
  };

  const openEditModal = (user: Employee) => {
    setEditingUser(user);
    setEditUser({
      username: user.username,
      password: '',
      confirm_password: '',
      role: user.role,
      store_name: user.storeName || '',
    });
    setShowEditUserModal(true);
  };

  const handleDeleteUser = async (id: number) => {
    Alert.alert(
      'تأكيد الحذف',
      'هل أنت متأكد من حذف هذا المستخدم؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('access_token');
              if (!token) throw new Error('لم يتم العثور على رمز المصادقة');

              const response = await fetch(`${API_BASE_URL}/users/${id}/delete/`, {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'فشل في حذف المستخدم');
              }

              Alert.alert('نجاح', 'تم حذف المستخدم بنجاح');
              fetchUsers();
            } catch (error) {
              Alert.alert('خطأ', error.message || 'حدث خطأ أثناء حذف المستخدم');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const toggleUserStatus = async (id: number) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('لم يتم العثور على رمز المصادقة');

      const response = await fetch(`${API_BASE_URL}/users/${id}/toggle-status/`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشل في تغيير حالة المستخدم');
      }

      const result = await response.json();
      Alert.alert('نجاح', result.message || 'تم تغيير حالة المستخدم');
      fetchUsers();
    } catch (error) {
      Alert.alert('خطأ', error.message || 'حدث خطأ أثناء تغيير حالة المستخدم');
    }
  };

  return (
    <MainLayout userType="admin">
      <RefreshableScreen onRefresh={handleRefresh}>
        <View style={commonStyles.container}>
          <View style={commonStyles.header}>
            <Text style={commonStyles.title}>إدارة المستخدمين</Text>
          </View>

          <TouchableOpacity style={styles.addButton} onPress={() => setShowAddUserModal(true)}>
            <Feather name="plus" size={20} color="white" />
            <Text style={styles.addButtonText}>إضافة مستخدم جديد</Text>
          </TouchableOpacity>

           {loading ? (
        <AppLoader />
      ) : (
            employees.map((emp) => (
              <View key={emp.id} style={styles.userCard}>
                <View style={styles.userInfo}>
                  <View style={styles.userIcon}>
                    <MaterialIcons name="person" size={24} color="#2563eb" />
                  </View>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.userName}>{emp.username}</Text>
                    <Text style={styles.userDetail}>🔰 {emp.role}</Text>
                    {emp.storeName && <Text style={styles.userDetail}>🏪 {emp.storeName}</Text>}
                  </View>
                </View>

                <View style={styles.actions}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: emp.is_active ? '#d1fae5' : '#f3f4f6',
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: emp.is_active ? '#22c55e' : '#6b7280',
                        fontWeight: 'bold',
                      }}
                    >
                      {emp.is_active ? 'نشط' : 'غير نشط'}
                    </Text>
                  </View>

                  <TouchableOpacity onPress={() => openEditModal(emp)} style={styles.iconBtn}>
                    <Ionicons name="create-outline" size={20} color="#3b82f6" />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => toggleUserStatus(emp.id)} style={styles.iconBtn}>
                    <Ionicons
                      name={emp.is_active ? 'trash-outline' : 'trash-outline'}
                      size={20}
                      color={emp.is_active ? '#dc2626' : '#22c55e'}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          {/* Add User Modal */}
          <Modal visible={showAddUserModal} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>إضافة مستخدم جديد</Text>

                  <TextInput
                    style={styles.modalInput}
                    placeholder="الاسم الكامل"
                    placeholderTextColor="#9ca3af"
                    value={newUser.username}
                    onChangeText={(text) => setNewUser({ ...newUser, username: text })}
                    textAlign="right"
                  />

                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="كلمة السر"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry={!showPassword}
                      value={newUser.password}
                      onChangeText={(text) => setNewUser({ ...newUser, password: text })}
                      textAlign="right"
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

                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="تأكيد كلمة السر"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry={!showConfirmPassword}
                      value={newUser.confirm_password}
                      onChangeText={(text) => setNewUser({ ...newUser, confirm_password: text })}
                      textAlign="right"
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <MaterialCommunityIcons
                        name={showConfirmPassword ? "eye-off" : "eye"}
                        size={20}
                        color="#6b7280"
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.storeSelection}>
                    <Text style={styles.storeLabel}>المتجر:</Text>
                    <View style={styles.storePickerContainer}>
                      <TouchableOpacity 
                        style={styles.storeInput}
                        onPress={() => setShowStoresList(!showStoresList)}
                      >
                        <Text style={styles.storeInputText}>
                          {newUser.store_name || 'اختر متجر'}
                        </Text>
                      </TouchableOpacity>
                      {showStoresList && stores.length > 0 && (
                        <View style={styles.storesList}>
                          {stores.map((store) => (
                            <TouchableOpacity
                              key={store.id}
                              style={styles.storeOption}
                              onPress={() => {
                                setNewUser({ ...newUser, store_name: store.name });
                                setShowStoresList(false);
                              }}
                            >
                              <Text style={styles.storeOptionText}>{store.name}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.roleSelection}>
  <Text style={styles.roleLabel}>الدور:</Text>
  <View style={styles.roleButtons}>
    <TouchableOpacity
      style={[
        styles.roleButton,
        newUser.role === 'بائع' && styles.selectedRoleButton,
      ]}
      onPress={() => setNewUser({ ...newUser, role: 'بائع' })}
    >
      <Text style={newUser.role === 'بائع' ? styles.selectedRoleText : styles.roleText}>
        بائع
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[
        styles.roleButton,
        newUser.role === 'مشرف' && styles.selectedRoleButton,
      ]}
      onPress={() => setNewUser({ ...newUser, role: 'مشرف' })}
    >
      <Text style={newUser.role === 'مشرف' ? styles.selectedRoleText : styles.roleText}>
        مشرف
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[
        styles.roleButton,
        newUser.role === 'مشرف الورشة' && styles.selectedRoleButton, // Changed from 'مشرف ورشة' to 'مشرف الورشة'
      ]}
      onPress={() => setNewUser({ ...newUser, role: 'مشرف الورشة' })}
    >
      <Text style={newUser.role === 'مشرف الورشة' ? styles.selectedRoleText : styles.roleText}>
        مشرف ورشة
      </Text>
    </TouchableOpacity>
  </View>
</View>

                  <View style={styles.modalActions}>
                    <Pressable
                      style={[styles.modalButton, styles.cancelBtn]}
                      onPress={() => {
                        setShowAddUserModal(false);
                        setShowPassword(false);
                        setShowConfirmPassword(false);
                      }}
                    >
                      <Text style={styles.cancelText}>إلغاء</Text>
                    </Pressable>
                    <Pressable style={[styles.modalButton, styles.saveBtn]} onPress={handleAddUser}>
                      <Text style={styles.saveText}>إضافة</Text>
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            </View>
          </Modal>

          {/* Edit User Modal */}
          <Modal visible={showEditUserModal} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>تعديل بيانات المستخدم</Text>

                  <TextInput
                    style={styles.modalInput}
                    placeholder="الاسم الكامل"
                    placeholderTextColor="#9ca3af"
                    value={editUser.username}
                    onChangeText={(text) => setEditUser({ ...editUser, username: text })}
                    textAlign="right"
                  />

                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="كلمة السر (اتركها فارغة للحفاظ على الكلمة الحالية)"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry={!showEditPassword}
                      value={editUser.password}
                      onChangeText={(text) => setEditUser({ ...editUser, password: text })}
                      textAlign='right'
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowEditPassword(!showEditPassword)}
                    >
                      <MaterialCommunityIcons
                        name={showEditPassword ? "eye-off" : "eye"}
                        size={20}
                        color="#6b7280"
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="تأكيد كلمة السر"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry={!showEditConfirmPassword}
                      value={editUser.confirm_password}
                      onChangeText={(text) => setEditUser({ ...editUser, confirm_password: text })}
                      textAlign="right"
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowEditConfirmPassword(!showEditConfirmPassword)}
                    >
                      <MaterialCommunityIcons
                        name={showEditConfirmPassword ? "eye-off" : "eye"}
                        size={20}
                        color="#6b7280"
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.storeSelection}>
                    <Text style={styles.storeLabel}>المتجر:</Text>
                    <View style={styles.storePickerContainer}>
                      <TouchableOpacity 
                        style={styles.storeInput}
                        onPress={() => setShowStoresListEdit(!showStoresListEdit)}
                      >
                        <Text style={styles.storeInputText}>
                          {editUser.store_name || 'اختر متجر'}
                        </Text>
                      </TouchableOpacity>
                      {showStoresListEdit && stores.length > 0 && (
                        <View style={styles.storesList}>
                          {stores.map((store) => (
                            <TouchableOpacity
                              key={store.id}
                              style={styles.storeOption}
                              onPress={() => {
                                setEditUser({ ...editUser, store_name: store.name });
                                setShowStoresListEdit(false);
                              }}
                            >
                              <Text style={styles.storeOptionText}>{store.name}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>

               <View style={styles.roleSelection}>
  <Text style={styles.roleLabel}>الدور:</Text>
  <View style={styles.roleButtons}>
    <TouchableOpacity
      style={[
        styles.roleButton,
        editUser.role === 'بائع' && styles.selectedRoleButton,
      ]}
      onPress={() => setEditUser({ ...editUser, role: 'بائع' })}
    >
      <Text style={editUser.role === 'بائع' ? styles.selectedRoleText : styles.roleText}>
        بائع
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[
        styles.roleButton,
        editUser.role === 'مشرف' && styles.selectedRoleButton,
      ]}
      onPress={() => setEditUser({ ...editUser, role: 'مشرف' })}
    >
      <Text style={editUser.role === 'مشرف' ? styles.selectedRoleText : styles.roleText}>
        مشرف
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[
        styles.roleButton,
        editUser.role === 'مشرف الورشة' && styles.selectedRoleButton, // Changed from 'مشرف ورشة' to 'مشرف الورشة'
      ]}
      onPress={() => setEditUser({ ...editUser, role: 'مشرف الورشة' })}
    >
      <Text style={editUser.role === 'مشرف الورشة' ? styles.selectedRoleText : styles.roleText}>
        مشرف ورشة
      </Text>
    </TouchableOpacity>
  </View>
</View>

                  <View style={styles.modalActions}>
                    <Pressable
                      style={[styles.modalButton, styles.cancelBtn]}
                      onPress={() => {
                        setShowEditUserModal(false);
                        setShowEditPassword(false);
                        setShowEditConfirmPassword(false);
                      }}
                    >
                      <Text style={styles.cancelText}>إلغاء</Text>
                    </Pressable>
                    <Pressable style={[styles.modalButton, styles.saveBtn]} onPress={handleEditUser}>
                      <Text style={styles.saveText}>تحديث</Text>
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            </View>
          </Modal>
        </View>
      </RefreshableScreen>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statCard: {
    width: '45%',
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    marginVertical: 4,
    color: 'inherit',
  },
  statLabel: {
    fontSize: 14,
    color: '#4b5563',
  },
  addButton: {
    flexDirection: 'row-reverse',
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  userCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  userInfo: {
    flexDirection: 'row-reverse',
    flex: 1,
    alignItems: 'center',
  },
  userIcon: {
    backgroundColor: '#dbeafe',
    borderRadius: 25,
    padding: 8,
    marginLeft: 10,
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 4,
    textAlign: 'right',
  },
  userDetail: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  iconBtn: {
    padding: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 20,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    maxHeight: '90%',
    width: '100%',
    alignSelf: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#111827',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
    textAlign: 'right',
    color: '#000000',
    fontSize: 14,
  },
  passwordContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginVertical: 6,
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    textAlign: 'right',
    color: '#000000',
    fontSize: 14,
  },
  eyeButton: {
    padding: 4,
  },
  modalActions: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 6,
  },
  cancelBtn: {
    backgroundColor: '#ef4444',
  },
  cancelText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: '#22c55e',
  },
  saveText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 14,
  },
  roleSelection: {
    marginVertical: 10,
  },
  roleLabel: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'right',
    color: '#374151',
  },
  roleButtons: {
    flexDirection: 'row-reverse',
    gap: 6,
    flexWrap: 'wrap',
  },
  roleButton: {
    borderWidth: 1,
    borderColor: '#9ca3af',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 70,
  },
  selectedRoleButton: {
    backgroundColor: '#22c55e',
    borderColor: '#16a34a',
  },
  roleText: {
    color: '#6b7280',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 12,
  },
  selectedRoleText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 12,
  },
  loadingContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6b7280',
  },
  storeSelection: {
    marginVertical: 10,
  },
  storeLabel: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'right',
    color: '#374151',
  },
  storePickerContainer: {
    position: 'relative',
  },
  storeInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    textAlign: 'right',
    justifyContent: 'center',
  },
  storeInputText: {
    color: '#000000',
    textAlign: 'right',
    fontSize: 14,
  },
  storesList: {
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginTop: 4,
    backgroundColor: 'white',
  },
  storeOption: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  storeOptionText: {
    textAlign: 'right',
    color: '#374151',
    fontSize: 14,
  },
});

export default AdminUsers;