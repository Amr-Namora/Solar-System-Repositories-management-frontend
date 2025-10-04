// AdminStores.tsx
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
} from 'react-native';
import { getStatusBarHeight } from 'react-native-status-bar-height';
import {
  Ionicons,
  MaterialIcons,
  Feather,
} from '@expo/vector-icons';
import MainLayout from '../component/MainLayout';
import { commonStyles } from '../styles/commonStyles';
import RefreshableScreen from '../component/RefreshableScreen';
import { API_BASE_URL } from './api2';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StoreMaterials from './store'; // 👈 Make sure this path is correct
import AppLoader from '../component/AppLoader';
I18nManager.forceRTL(true);

interface Store {
  id: number;
  name: string;
  location: string;
}

const AdminStores = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [showAddStoreModal, setShowAddStoreModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [newStore, setNewStore] = useState({
    name: '',
    location: '',
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('لم يتم العثور على رمز المصادقة');

      const response = await fetch(`${API_BASE_URL}/stores/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('فشل في جلب المتاجر');

      const data = await response.json();
      setStores(Array.isArray(data.stores) ? data.stores : []);
    } catch (error) {
      Alert.alert('خطأ', error.message || 'فشل في تحميل المتاجر');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStores();
  };

  const handleAddStore = async () => {
    if (!newStore.name.trim() || !newStore.location.trim()) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('لم يتم العثور على رمز المصادقة');

      const response = await fetch(`${API_BASE_URL}/addStores/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newStore),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشل في إضافة المتجر');
      }

      Alert.alert('نجاح', 'تم إضافة المتجر بنجاح');
      setShowAddStoreModal(false);
      setNewStore({ name: '', location: '' });
      fetchStores();
    } catch (error) {
      Alert.alert('خطأ', error.message || 'حدث خطأ أثناء إضافة المتجر');
    }
  };

  const handleDeleteStore = async (id: number) => {
    Alert.alert(
      'تأكيد الحذف',
      'هل أنت متأكد من حذف هذا المتجر؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('access_token');
              if (!token) throw new Error('لم يتم العثور على رمز المصادقة');

              const response = await fetch(`${API_BASE_URL}/stores_toggle_status/?store_id=${id}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'فشل في تعطيل المتجر');
              }

              Alert.alert('نجاح', 'تم تعطيل المتجر بنجاح');
              fetchStores();
            } catch (error) {
              Alert.alert('خطأ', error.message || 'حدث خطأ أثناء تعطيل المتجر');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <MainLayout userType="admin">
      <RefreshableScreen onRefresh={handleRefresh}>
        <View style={commonStyles.container}>
          <View style={commonStyles.header}>
            <Text style={commonStyles.title}>إدارة المتاجر</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAddStoreModal(true)}>
            <Feather name="plus" size={20} color="white" />
            <Text style={styles.addButtonText}>إضافة متجر جديد</Text>
          </TouchableOpacity>

             {loading ? (
        <AppLoader />
      ) : (
            stores.map((store) => (
              <View key={store.id} style={styles.storeCard}>
                <View style={styles.storeInfo}>
                  <View style={styles.storeIcon}>
                    <MaterialIcons name="store" size={24} color="#2563eb" />
                  </View>
                  <TouchableOpacity onPress={() => setSelectedStore(store)} style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.storeName}>{store.name}</Text>
                    <Text style={styles.storeDetail}>📍 {store.location}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => handleDeleteStore(store.id)} style={styles.iconBtn}>
                    <Ionicons name="trash-outline" size={20} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          {/* Add Store Modal */}
          <Modal visible={showAddStoreModal} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>إضافة متجر جديد</Text>

                <TextInput
                  style={styles.modalInput}
                  placeholder="اسم المتجر"
                  placeholderTextColor="#9ca3af"
                  value={newStore.name}
                  onChangeText={(text) => setNewStore({ ...newStore, name: text })}
                  textAlign="right"
                />

                <TextInput
                  style={styles.modalInput}
                  placeholder="موقع المتجر"
                  placeholderTextColor="#9ca3af"
                  value={newStore.location}
                  onChangeText={(text) => setNewStore({ ...newStore, location: text })}
                  textAlign="right"
                />

                <View style={styles.modalActions}>
                  <Pressable
                    style={[styles.modalButton, styles.cancelBtn]}
                    onPress={() => setShowAddStoreModal(false)}
                  >
                    <Text style={styles.cancelText}>إلغاء</Text>
                  </Pressable>
                  <Pressable style={[styles.modalButton, styles.saveBtn]} onPress={handleAddStore}>
                    <Text style={styles.saveText}>إضافة</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>

          {/* ✅ Only render StoreMaterials if selectedStore is NOT null */}
          {selectedStore && (
            <Modal visible animationType="slide" transparent={false}>
              <StoreMaterials
                store={selectedStore}
                onClose={() => {
                  try {
                    setSelectedStore(null);
                    fetchStores();
                  } catch (err) {
                    console.error('Error in onClose:', err);
                    Alert.alert('خطأ', 'حدث خطأ أثناء العودة. يرجى المحاولة مرة أخرى.');
                  }
                }}
              />
            </Modal>
          )}
        </View>
      </RefreshableScreen>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
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
  storeCard: {
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
  storeInfo: {
    flexDirection: 'row-reverse',
    flex: 1,
    alignItems: 'center',
  },
  storeIcon: {
    backgroundColor: '#dbeafe',
    borderRadius: 25,
    padding: 8,
    marginLeft: 10,
  },
  storeName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 4,
    textAlign: 'right',
  },
  storeDetail: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    padding: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#111827',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    marginVertical: 6,
    textAlign: 'right',
    color: '#000000',
  },
  modalActions: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
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
  },
  saveBtn: {
    backgroundColor: '#22c55e',
  },
  saveText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
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
});

export default AdminStores;