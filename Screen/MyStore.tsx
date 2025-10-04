import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator
} from 'react-native';
import { commonStyles } from '../styles/commonStyles';
import { I18nManager } from 'react-native';
import { API_BASE_URL } from './api2';
import AppLoader from '../component/AppLoader';

import RefreshableScreen from '../component/RefreshableScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import MainLayout from '../component/MainLayout';
import { getStatusBarHeight } from 'react-native-status-bar-height';

I18nManager.forceRTL(true);

type IconName = 'battery' | 'weather-sunny' | 'cable-data' | 'package-variant';

interface MaterialDetail {
  id: number;
  name: string;
  type: string;
  quantity: number;
  available: number;
  description: string;
  status: string;
}

interface Material {
  id: number;
  name: string;
  category: string;
  totalStock: number;
  availableStock: number;
  requestedStock: number;
  onWayStock: number;
  iconKey: IconName;
  colorStart: string;
  colorEnd: string;
  items: MaterialDetail[];
}

const getProductMeta = (name: string) => {
  const defaultMeta = { 
    category: 'فئة عامة', 
    icon: 'package-variant' as IconName, 
    colorStart: '#22c55e', 
    colorEnd: '#15803d' 
  };
  const mapping: Record<string, {category: string, icon: IconName, colorStart: string, colorEnd: string}> = {};
  for (const [key, value] of Object.entries(mapping)) {
    if (name.includes(key)) return value;
  }
  return defaultMeta;
};

const validIcons: Record<IconName, string> = {
  'battery': 'battery',
  'weather-sunny': 'weather-sunny',
  'cable-data': 'cable-data',
  'package-variant': 'package-variant'
};

interface Repository {
  id: number;
  name: string;
  location: string;
  is_working: string;
}

// New screen component for the intermediate materials management page
function MyStoreScreen({ route, navigation }) {
  const { material } = route.params;
  const [items, setItems] = useState<MaterialDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [repositories, setRepositories] = useState<Repository[]>([]);

  useEffect(() => {
    fetchMaterialItems();
  }, []);

  const fetchMaterialItems = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      const response = await fetch(
        `${API_BASE_URL}/product_details/?product_name=${encodeURIComponent(material.name)}`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      if (!response.ok) throw new Error('Failed to fetch material items');
      const data = await response.json();
      const itemsData = data.serialize.map((item: any) => ({
        id: item.id,
        name: item.type,
        type: item.name,
        quantity: item.amount,
        available: item.is_available === 'متاح' ? item.amount : 0,
        description: item.description,
        status: item.is_available,
      }));
      setItems(itemsData);
    } catch (error) {
      Alert.alert('خطأ', 'فشل في تحميل عناصر المادة');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRepositories = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('لم يتم العثور على رمز المصادقة');
      const response = await fetch(`${API_BASE_URL}/reposotories/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('فشل في جلب المستودعات');
      const data = await response.json();
      setRepositories(Array.isArray(data.reposotories) ? data.reposotories : []);
    } catch (error) {
      Alert.alert('خطأ', error.message || 'فشل في تحميل المستودعات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepositories();
  }, []);

  const handleEditItem = (item: MaterialDetail) => {
    Alert.alert('تعديل', `سيتم تعديل ${item.name}`);
  };

  const handleDeleteItem = (item: MaterialDetail) => {
    Alert.alert(
      'حذف',
      `هل أنت متأكد من أنك تريد حذف ${item.name}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        { 
          text: 'حذف', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('تم', `تم حذف ${item.name}`);
          }
        }
      ]
    );
  };

  const handleItemPress = (item: MaterialDetail) => {
    navigation.navigate('MaterialDetails', { item, material });
  };

  if (loading) {
    return (
      <AppLoader />
    );
  }

  return (
    <View style={commonStyles.container}>
      <View style={styles.managementHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-right" size={24} color="#2563eb" />
        </TouchableOpacity>
        <Text style={styles.managementTitle}>إدارة {material.name}</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.managementContent}>
        {items.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            style={styles.managementItem}
            onPress={() => handleItemPress(item)}
          >
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemType}>{item.type}</Text>
              <View style={styles.quantityContainer}>
                <Text style={styles.quantityLabel}>الكمية: </Text>
                <View style={[styles.quantityBadge, {
                  backgroundColor: item.available === 0 ? '#f87171' : '#22c55e',
                  borderColor: item.available === 0 ? '#ef4444' : '#10b981'
                }]}>
                  <Text style={styles.quantityValue}>{item.quantity}</Text>
                </View>
              </View>
            </View>
            <View style={styles.itemActions}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.editButton]}
                onPress={() => handleEditItem(item)}
              >
                <Feather name="edit" size={16} color="white" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDeleteItem(item)}
              >
                <Feather name="trash" size={16} color="white" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function MaterialsScreen() {
  const navigation = useNavigation();
  const statusOptions = ['متاح', 'قيد الوصول', 'مخفي'];
  const [newQuantity, setNewQuantity] = useState('');
  const [editingItem, setEditingItem] = useState<MaterialDetail | null>(null);
  const [userType, setUserType] = useState<string>('');
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [selectedItem, setSelectedItem] = useState<MaterialDetail | null>(null);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [reserveQuantity, setReserveQuantity] = useState('');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    onWay: 0
  });
  const [storeName, setStoreName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    amount: '',
    status: 'متاح'
  });
  const [newStatus, setNewStatus] = useState('متاح');
  const [warehouses, setWarehouses] = useState([
    { id: 1, name: 'المزة' },
    { id: 2, name: 'الشعلان' },
    { id: 3, name: 'منين' }
  ]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);
  const [repositories, setRepositories] = useState<Repository[]>([]);

  useEffect(() => {
    const init = async () => {
      const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
      const storedUserType = await AsyncStorage.getItem('userType');
      if (!isLoggedIn) {
        navigation.navigate('Login' as never);
        return;
      }
      setUserType(storedUserType ?? '');
      await fetchHomeData();
      await fetchRepositories();
    };
    init();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchHomeData(), fetchRepositories()]);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchHomeData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      let url = `${API_BASE_URL}/myStore/`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch data');
      const data = await response.json();
      if (data.store) {
        setStoreName(data.store || selectedWarehouse || 'المتجر الرئيسي');
      }
      setStats({
        total: data.total,
        available: data.available,
        onWay: data.on_way
      });
      const mappedMaterials = data.serialize.map((item: any) => {
        const meta = getProductMeta(item.name);
        return {
          id: item.id,
          name: item.name,
          category: meta.category,
          totalStock: item.total_available + item.total_on_way,
          availableStock: item.total_available,
          onWayStock: item.total_on_way,
          requestedStock: item.total_requested || 0,
          iconKey: meta.icon,
          colorStart: meta.colorStart,
          colorEnd: meta.colorEnd,
          items: []
        };
      });
      setMaterials(mappedMaterials);
    } catch (error) {
      Alert.alert('خطأ', 'فشل في تحميل البيانات');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductDetails = async (material: Material) => {
    try {
      setDetailsLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      const response = await fetch(
        `${API_BASE_URL}/product_details/?product_name=${encodeURIComponent(material.name)}`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      if (!response.ok) throw new Error('Failed to fetch details');
      const data = await response.json();
      const items = data.serialize.map((item: any) => ({
        id: item.id,
        name: item.type,
        type: item.name,
        quantity: item.amount,
        available: item.is_available === 'متاح' ? item.amount : 0,
        description: item.description,
        status: item.is_available,
      }));
      setMaterials(prev => prev.map(m => 
        m.id === material.id 
          ? { ...m, items } 
          : m
      ));
      setSelectedMaterial({
        ...material,
        items,
      });
    } catch (error) {
      Alert.alert('خطأ', 'فشل في تحميل تفاصيل المنتج');
      console.error(error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const fetchRepositories = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('لم يتم العثور على رمز المصادقة');
      const response = await fetch(`${API_BASE_URL}/reposotories/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('فشل في جلب المستودعات');
      const data = await response.json();
      setRepositories(Array.isArray(data.reposotories) ? data.reposotories : []);
    } catch (error) {
      Alert.alert('خطأ', error.message || 'فشل في تحميل المستودعات');
    }
  };

  const isAdmin = userType === 'admin';
  const localAdmin = true;

  const handleLogout = async () => {
    await AsyncStorage.removeItem('isLoggedIn');
    await AsyncStorage.removeItem('userType');
    await AsyncStorage.removeItem('token');
    navigation.navigate('Login' as never);
  };

  const handleSelectMaterial = (material: Material) => {
    (navigation as any).navigate('StoreMaterial', { material });
  };

  const openReserveModal = (item: MaterialDetail) => {
    setSelectedItem(item);
    setReserveQuantity('');
    setShowReserveModal(true);
  };

  const confirmReservation = async () => {
    if (!selectedItem || !reserveQuantity) {
      Alert.alert('خطأ', 'يرجى إدخال الكمية المطلوبة');
      return;
    }
    const qty = Number(reserveQuantity);
    if (qty <= 0 || qty > selectedItem.available) {
      Alert.alert('خطأ', 'الكمية غير صحيحة');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      const payload = {
        type: selectedItem.name,
        name: selectedItem.type,
        amount: qty.toString()
      };
      const response = await fetch(`${API_BASE_URL}/reserve/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشل في الحجز');
      }
      Alert.alert('تم', `تم حجز ${qty} من ${selectedItem.name} بنجاح`);
      await fetchHomeData();
      if (selectedMaterial) {
        await fetchProductDetails(selectedMaterial);
      }
      setShowReserveModal(false);
      setSelectedItem(null);
      setReserveQuantity(''); 
      navigation.navigate('Materials' as never);
    } catch (error) {
      Alert.alert('خطأ', error.message || 'حدث خطأ أثناء الحجز');
      console.error('Reservation error:', error);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم الفئة');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/add_product/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name: newCategoryName.trim(),
          description: newCategoryDescription.trim(),
          reposotory: selectedWarehouse
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add category');
      }
      Alert.alert('تم', 'تمت إضافة الفئة بنجاح');
      setNewCategoryName('');
      setNewCategoryDescription('');
      setShowAddCategoryModal(false);
      fetchHomeData();
    } catch (error) {
      Alert.alert('خطأ', error.message || 'فشل في إضافة الفئة');
      console.error(error);
    }
  };

  const handleAddMaterial = async () => {
    if (!newMaterial.name.trim() || !newMaterial.amount) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('access_token');
      const classResponse = await fetch(`${API_BASE_URL}/add_class/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: newMaterial.name,
          product_id: selectedMaterial?.id,
          amount: newMaterial.amount,
          is_available: newMaterial.status
        }),
      });
      if (!classResponse.ok) throw new Error('Failed to add class');
      Alert.alert('تم', 'تمت إضافة المادة بنجاح');
      setNewMaterial({ name: '', amount: '', status: 'متاح' });
      await fetchHomeData();
    } catch (error) {
      Alert.alert('خطأ', error.message || 'فشل في إضافة المادة');
      console.error(error);
    }
  };

  const handleUpdateStatus = async () => {
    if (!editingItem || !newQuantity || !newStatus) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/changetype/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: editingItem.name,
          name: editingItem.type,
          amount: newQuantity,
          new_mode_is_available: newStatus,
          is_available: editingItem.status
        }),
      });
      const contentType = response.headers.get('content-type');
      if (!response.ok) {
        let errorMessage = 'فشل في تعديل الحالة';
        if (contentType?.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } else {
          const text = await response.text();
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }
      Alert.alert('تم', 'تم تحديث الحالة بنجاح');
      if (selectedMaterial) {
        await fetchProductDetails(selectedMaterial);
      }
      await fetchHomeData();
      setEditingItem(null);
      setNewQuantity('');
      setNewStatus('متاح');
      navigation.navigate('Materials' as never);
    } catch (error) {
      Alert.alert('خطأ', error.message || 'فشل في تحديث الحالة');
      console.error(error);
    }
  };

  const renderIcon = (iconKey: IconName) => {
    const iconName = validIcons[iconKey] || 'package-variant';
    return (
      <MaterialCommunityIcons 
        name={iconName as any} 
        size={24} 
        color="white" 
      />
    );
  };

  return (
    <MainLayout userType={userType as any}>
      <RefreshableScreen onRefresh={handleRefresh}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.userInfo}>
              <View style={styles.roleAndStoreContainer}>
                <View style={[styles.badge, localAdmin ? styles.adminBadge : styles.employeeBadge]}>
                  <Text style={styles.badgeText}>{localAdmin ? 'مسؤول المستودع' : 'موظف'}</Text>
                </View>
                <View style={[styles.badge, styles.storeBadge]}>
                  <Text style={styles.badgeText}>{storeName || 'المتجر الرئيسي'}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <Feather name="log-out" size={20} color="white" />
                <Text style={styles.logoutText}>خروج</Text>
              </TouchableOpacity>
            </View>
          </View>
   {loading ? (
        <AppLoader />
      ) : (
            <View style={{ flex: 1, marginTop: 16 }}>
              <Text style={styles.sectionTitle}>فئات المواد</Text>
              {localAdmin && (
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={() => setShowAddCategoryModal(true)}
                >
                  <Feather name="plus" size={16} color="white" />
                  <Text style={styles.addButtonText}>إضافة فئة</Text>
                </TouchableOpacity>
              )}
              {materials.map((material) => (
                <View key={material.id} style={styles.card}>
                  <View style={[styles.colorBar, { backgroundColor: material.colorStart }]} />
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.iconCircle, { backgroundColor: material.colorStart }]}>
                        {renderIcon(material.iconKey)}
                      </View>
                      <TouchableOpacity 
                        style={{ flex: 1 }}
                        onPress={() => handleSelectMaterial(material)}
                      >
                        <Text style={styles.materialName}>{material.name}</Text>
                        <Text style={styles.materialCategory}>{material.category}</Text>
                      </TouchableOpacity>
                      <View style={styles.badgeLight}>
                        <Text>{material.items.length} نوع</Text>
                      </View>
                    </View>
                    <View style={styles.stockRow}>
                      <View style={styles.stockBox}>
                        <Text style={styles.stockNumber}>{material.requestedStock}</Text>
                        <Text style={styles.stockLabel}>مطلوب للشراء</Text>
                      </View>
                      <View style={styles.stockBox}>
                        <Text style={[styles.stockNumber, { color: '#22c55e' }]}>{material.availableStock}</Text>
                        <Text style={styles.stockLabel}>متوفر</Text>
                      </View>
                      <View style={styles.stockBox}>
                        <Text style={[styles.stockNumber, { color: '#f97316' }]}>{material.onWayStock}</Text>
                        <Text style={styles.stockLabel}>قيد الوصول</Text>
                      </View>
                    </View>
                    <View style={styles.progressBarBackground}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${Math.max(
                              material.totalStock > 0 
                                ? (material.availableStock / material.totalStock) * 100 
                                : 0,
                              5
                            )}%`,
                            backgroundColor: material.colorStart,
                          },
                        ]}
                      />
                    </View>
                    {localAdmin && (
                      <TouchableOpacity
                        style={[styles.detailsBtn, { backgroundColor: '#2563eb' }]}
                        onPress={() => {
                          setSelectedMaterial(material);
                          setShowAddMaterialModal(true);
                        }}
                      >
                        <Feather name="plus" size={16} color="white" />
                        <Text style={styles.detailsBtnText}>إضافة مادة</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Add Category Modal */}
          <Modal
            visible={showAddCategoryModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowAddCategoryModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>إضافة فئة جديدة</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="اسم الفئة"
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder=" وصف الفئة"
                  value={newCategoryDescription}
                  onChangeText={setNewCategoryDescription}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowAddCategoryModal(false)}
                  >
                    <Text style={styles.cancelText}>إلغاء</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleAddCategory}
                    disabled={!newCategoryName.trim()}
                  >
                    <Text style={styles.saveText}>إضافة</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Add Material Modal — ONLY MODAL FOR ADDING MATERIALS */}
          <Modal
            visible={showAddMaterialModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowAddMaterialModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>إضافة مادة جديدة</Text>
                <Text style={styles.label}>اسم المادة</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="اسم المادة"
                  value={newMaterial.name}
                  onChangeText={(text) => setNewMaterial({...newMaterial, name: text})}
                />
                <Text style={styles.label}>الكمية</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="الكمية"
                  keyboardType="numeric"
                  value={newMaterial.amount}
                  onChangeText={(text) => setNewMaterial({...newMaterial, amount: text})}
                />
                <Text style={styles.label}>الحالة</Text>
                <View style={styles.statusContainer}>
                  {statusOptions.map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusOption,
                        newMaterial.status === status && styles.statusOptionSelected,
                      ]}
                      onPress={() => setNewMaterial({...newMaterial, status})}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          newMaterial.status === status && styles.statusTextSelected,
                        ]}
                      >
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowAddMaterialModal(false)}
                  >
                    <Text style={styles.cancelText}>إلغاء</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleAddMaterial}
                    disabled={!newMaterial.name.trim() || !newMaterial.amount}
                  >
                    <Text style={styles.saveText}>إضافة</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Reserve Modal */}
          <Modal 
            visible={showReserveModal} 
            transparent 
            animationType="fade" 
            onRequestClose={() => setShowReserveModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.reserveModal}>
                <Text style={styles.modalTitle}>حجز مادة</Text>
                <Text style={{ marginVertical: 8 }}>{selectedItem?.name}</Text>
                <Text>متوفر: {selectedItem?.available} قطعة</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="أدخل الكمية"
                  value={reserveQuantity}
                  onChangeText={setReserveQuantity}
                />
                <View style={styles.reserveButtonsRow}>
                  <TouchableOpacity
                    style={[styles.reserveBtn, styles.confirmBtn]}
                    onPress={confirmReservation}
                    disabled={
                      !reserveQuantity ||
                      Number(reserveQuantity) <= 0 ||
                      Number(reserveQuantity) > (selectedItem?.available || 0)
                    }
                  >
                    <Text style={styles.reserveBtnText}>تأكيد الحجز</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reserveBtn, styles.cancelBtn]}
                    onPress={() => setShowReserveModal(false)}
                  >
                    <Text style={styles.cancelBtnText}>إلغاء</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Edit Status Modal */}
          <Modal
            visible={!!editingItem}
            transparent
            animationType="fade"
            onRequestClose={() => setEditingItem(null)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>تعديل حالة المادة</Text>
                <Text style={styles.label}>المادة: {editingItem?.name}</Text>
                <Text style={styles.label}>الكمية</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="الكمية"
                  keyboardType="numeric"
                  value={newQuantity}
                  onChangeText={setNewQuantity}
                />
                <Text style={styles.label}>الحالة الجديدة</Text>
                <View style={styles.statusContainer}>
                  {statusOptions.map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusOption,
                        newStatus === status && styles.statusOptionSelected,
                      ]}
                      onPress={() => setNewStatus(status)}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          newStatus === status && styles.statusTextSelected,
                        ]}
                      >
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setEditingItem(null)}
                  >
                    <Text style={styles.cancelText}>إلغاء</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleUpdateStatus}
                  >
                    <Text style={styles.saveText}>حفظ</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </RefreshableScreen>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdfa',
    paddingHorizontal: 12,
    paddingTop: getStatusBarHeight() + 16, 
  },
  header: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 16
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    justifyContent: 'space-between'
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16
  },
  adminBadge: {
    backgroundColor: 'white'
  },
  employeeBadge: {
    backgroundColor: 'white'
  },
  badgeText: {
    color: '#2563eb',
    fontWeight: 'bold'
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'white',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16
  },
  logoutText: {
    color: 'white',
    marginLeft: 6,
    fontWeight: '600'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#3b82f6'
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 12,
    color: '#1f2937'
  },
  addButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#10b981',
    padding: 8,
    borderRadius: 8
  },
  addButtonText: {
    color: 'white',
    marginRight: 8,
    fontWeight: 'bold'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3
  },
  colorBar: {
    height: 6
  },
  cardContent: {
    padding: 16
  },
  roleAndStoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeBadge: {
    backgroundColor: 'white',
    marginLeft: 8,
  }, 
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  materialName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  materialCategory: {
    fontSize: 14,
    color: '#6b7280'
  },
  badgeLight: {
    backgroundColor: '#bfdbfe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12
  },
  stockBox: {
    alignItems: 'center'
  },
  stockNumber: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  stockLabel: {
    fontSize: 12,
    color: '#6b7280'
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12
  },
  progressBarFill: {
    height: 8,
    borderRadius: 20
  },cardHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 12,
},
  detailsBtn: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8
  },
  detailsBtnText: {
    color: 'white',
    marginLeft: 6,
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16
  },
  modalInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
    textAlign: 'right'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#e5e7eb',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  cancelText: {
    textAlign: 'center',
    color: '#374151',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#22c55e',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  saveText: {
    textAlign: 'center',
    color: 'white',
    fontWeight: 'bold',
  },
  label: {
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 4,
    textAlign: 'right',
  },
  statusContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8
  },
  statusOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  statusOptionSelected: {
    backgroundColor: '#22c55e',
    borderColor: '#16a34a'
  },
  statusText: {
    color: '#374151',
    fontWeight: 'bold'
  },
  statusTextSelected: {
    color: 'white'
  },
  reserveModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
    textAlign: 'center',
    fontSize: 16,
  },
  reserveButtonsRow: {
    flexDirection: 'row',
    marginTop: 16,
    justifyContent: 'space-between',
    gap: 12
  },
  reserveBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    borderRadius: 12,
    flex: 1,
    marginLeft: 8
  },
  confirmBtn: {
    backgroundColor: '#22c55e'
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#22c55e',
    backgroundColor: 'white'
  },
  cancelBtnText: {
    color: '#22c55e',
    fontWeight: '600'
  },
  reserveBtnText: {
    color: 'white',
    marginLeft: 6,
    fontWeight: '600'
  },
  managementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  backButton: {
    padding: 4,
  },
  managementTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  managementContent: {
    flex: 1,
    padding: 16,
  },
  managementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  quantityLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  quantityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    marginLeft: 4,
    borderWidth: 1,
    minWidth: 32,
    justifyContent: 'center',
    alignItems: 'center', 
  },
  quantityValue: {
    color: 'white', 
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  itemType: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  itemActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: '#f59e0b',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
});