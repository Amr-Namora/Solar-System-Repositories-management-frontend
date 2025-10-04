// AdminRepositories.tsx
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
import { commonStyles } from '../styles/commonStyles';
import AppLoader from '../component/AppLoader';
import { getStatusBarHeight } from 'react-native-status-bar-height';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import MainLayout from '../component/MainLayout';
import RefreshableScreen from '../component/RefreshableScreen';
import { API_BASE_URL } from './api2';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RepositoryMaterials from './repository'; // 👈 New component

I18nManager.forceRTL(true);

interface Repository {
  id: number;
  name: string;
  location: string;
  is_working: string;
}

const AdminRepositories = () => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [showAddRepositoryModal, setShowAddRepositoryModal] = useState(false);
  const [selectedRepository, setSelectedRepository] = useState<Repository | null>(null);
  const [newRepository, setNewRepository] = useState({
    name: '',
    location: '',
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRepositories = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('لم يتم العثور على رمز المصادقة');

      const response = await fetch(`${API_BASE_URL}/reposotories/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('فشل في جلب المستودعات');

      const data = await response.json();
      setRepositories(Array.isArray(data.reposotories) ? data.reposotories : []);
    } catch (error) {
      Alert.alert('خطأ', error.message || 'فشل في تحميل المستودعات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRepositories();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRepositories();
  };

  const handleAddRepository = async () => {
    if (!newRepository.name.trim() || !newRepository.location.trim()) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('لم يتم العثور على رمز المصادقة');

      const response = await fetch(`${API_BASE_URL}/addReposotories/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRepository),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشل في إضافة المستودع');
      }

      Alert.alert('نجاح', 'تم إضافة المستودع بنجاح');
      setShowAddRepositoryModal(false);
      setNewRepository({ name: '', location: '' });
      fetchRepositories();
    } catch (error) {
      Alert.alert('خطأ', error.message || 'حدث خطأ أثناء إضافة المستودع');
    }
  };

  const handleToggleRepositoryStatus = async (id: number) => {
    Alert.alert(
      'تأكيد التعطيل',
      'هل أنت متأكد من تعطيل هذا المستودع؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تعطيل',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('access_token');
              if (!token) throw new Error('لم يتم العثور على رمز المصادقة');

              const response = await fetch(`${API_BASE_URL}/reposotories/toggle-status/?reposotory_id=${id}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'فشل في تعطيل المستودع');
              }

              Alert.alert('نجاح', 'تم تعطيل المستودع بنجاح');
              fetchRepositories();
            } catch (error) {
              Alert.alert('خطأ', error.message || 'حدث خطأ أثناء تعطيل المستودع');
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
        {!selectedRepository ? (
          <>
            <View style={commonStyles.header}>
              <Text style={commonStyles.title}>إدارة المستودعات</Text>
            </View>
              <TouchableOpacity style={styles.addButton} onPress={() => setShowAddRepositoryModal(true)}>
                <Feather name="plus" size={20} color="white" />
                <Text style={styles.addButtonText}>إضافة مستودع جديد</Text>
              </TouchableOpacity>

             {loading ? (
        <AppLoader />
      ) : (
                repositories.map((repo) => (
                  <View key={repo.id} style={styles.repositoryCard}>
                    <View style={styles.repositoryInfo}>
                      <View style={styles.repositoryIcon}>
                        <MaterialIcons name="storage" size={24} color="#2563eb" />
                      </View>
                      <TouchableOpacity
                        onPress={() => setSelectedRepository(repo)}
                        style={{ flex: 1, marginRight: 10 }}
                      >
                        <Text style={styles.repositoryName}>{repo.name}</Text>
                        <Text style={styles.repositoryDetail}>📍 {repo.location}</Text>
                        <Text
                          style={[
                            styles.statusBadge,
                            { color: repo.is_working === 'Yes' ? '#22c55e' : '#dc2626' },
                          ]}
                        >
                          {repo.is_working === 'Yes' ? 'نشط' : 'معطل'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.actions}>
                      <TouchableOpacity
                        onPress={() => handleToggleRepositoryStatus(repo.id)}
                        style={styles.iconBtn}
                      >
                        <Ionicons
                          name={repo.is_working === 'Yes' ? 'close-circle-outline' : 'add-circle-outline'}
                          size={20}
                          color={repo.is_working === 'Yes' ? '#dc2626' : '#22c55e'}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </>
          ) : (
            <RepositoryMaterials
              repository={selectedRepository}
              onClose={() => setSelectedRepository(null)}
            />
          )}

          {/* Add Repository Modal */}
          <Modal visible={showAddRepositoryModal} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>إضافة مستودع جديد</Text>

                <TextInput
                  style={styles.modalInput}
                  placeholder="اسم المستودع"
                  placeholderTextColor="#9ca3af"
                  value={newRepository.name}
                  onChangeText={(text) => setNewRepository({ ...newRepository, name: text })}
                  textAlign="right"
                />

                <TextInput
                  style={styles.modalInput}
                  placeholder="موقع المستودع"
                  placeholderTextColor="#9ca3af"
                  value={newRepository.location}
                  onChangeText={(text) => setNewRepository({ ...newRepository, location: text })}
                  textAlign="right"
                />

                <View style={styles.modalActions}>
                  <Pressable
                    style={[styles.modalButton, styles.cancelBtn]}
                    onPress={() => setShowAddRepositoryModal(false)}
                  >
                    <Text style={styles.cancelText}>إلغاء</Text>
                  </Pressable>
                  <Pressable style={[styles.modalButton, styles.saveBtn]} onPress={handleAddRepository}>
                    <Text style={styles.saveText}>إضافة</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
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
  repositoryCard: {
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
  repositoryInfo: {
    flexDirection: 'row-reverse',
    flex: 1,
    alignItems: 'center',
  },
  repositoryIcon: {
    backgroundColor: '#dbeafe',
    borderRadius: 25,
    padding: 8,
    marginLeft: 10,
  },
  repositoryName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 4,
    textAlign: 'right',
  },
  repositoryDetail: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'right',
    marginBottom: 4,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: 'bold',
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

export default AdminRepositories;