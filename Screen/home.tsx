import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { I18nManager } from 'react-native';
import { API_BASE_URL } from './api2';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import MainLayout from '../component/MainLayout';
import { getStatusBarHeight } from 'react-native-status-bar-height';
import AppLoader from '../component/AppLoader';
import { unregisterPushTokenFromBackend } from '../utils/pushNotifications'; // adjust path

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
  onWayStock: number;
  requestedStock: number;
  iconKey: IconName;
  colorStart: string;
  colorEnd: string;
  reposotory: string;
  items: MaterialDetail[];
}

interface Repository {
  id: number;
  name: string;
  location: string;
  is_working: string;
}

const getProductMeta = (name: string) => {
  const defaultMeta = {
    category: 'فئة عامة',
    icon: 'package-variant' as IconName,
    colorStart: '#22c55e',
    colorEnd: '#15803d',
  };
  const mapping: Record<
    string,
    { category: string; icon: IconName; colorStart: string; colorEnd: string }
  > = {};
  for (const [key, value] of Object.entries(mapping)) {
    if (name.includes(key)) return value;
  }
  return defaultMeta;
};

const validIcons: Record<IconName, string> = {
  battery: 'battery',
  'weather-sunny': 'weather-sunny',
  'cable-data': 'cable-data',
  'package-variant': 'package-variant',
};

export function MaterialsManagementScreen({ route, navigation }: any) {
  const { material } = route.params;
  const [items, setItems] = useState<MaterialDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [repositories, setRepositories] = useState<Repository[]>([]);

  useEffect(() => {
    fetchMaterialItems();
    fetchRepositories();
  }, []);

  const fetchMaterialItems = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      const response = await fetch(
        `${API_BASE_URL}/product_details/?product_name=${encodeURIComponent(
          material.name
        )}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
    } catch (error: any) {
      console.error(error);
    }
  };

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
          },
        },
      ]
    );
  };

  const handleItemPress = (item: MaterialDetail) => {
    navigation.navigate('MaterialDetails', { item, material });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>جاري تحميل العناصر...</Text>
      </View>
    );
  }

  return (
    <View style={styles.managementContainer}>
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
                <View
                  style={[
                    styles.quantityBadge,
                    {
                      backgroundColor: item.available === 0 ? '#f87171' : '#22c55e',
                      borderColor: item.available === 0 ? '#ef4444' : '#10b981',
                    },
                  ]}
                >
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
  const [selectedItem, setSelectedItem] = useState<MaterialDetail | null>(null);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [reserveQuantity, setReserveQuantity] = useState('');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    onWay: 0,
  });
  const [storeName, setStoreName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    amount: '',
    status: 'متاح',
  });
  const [newStatus, setNewStatus] = useState('متاح');
  const [editingCategory, setEditingCategory] = useState<Material | null>(null);
  const [editedCategoryName, setEditedCategoryName] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedParentMaterialId, setSelectedParentMaterialId] = useState<number | null>(null);

  // ✅ Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allMaterials, setAllMaterials] = useState<Material[]>([]);

  // ✅ Ref for FlatList
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const init = async () => {
      const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
      const storedUserType = await AsyncStorage.getItem('userType');
      if (!isLoggedIn) {
        navigation.navigate('Login' as never);
        return;
      }
      setUserType(storedUserType ?? '');
      await fetchHomeData(1, false);
      await fetchRepositories();
    };
    init();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(1);
    setHasMore(true);
    await fetchHomeData(1, false, selectedWarehouse);
    await fetchRepositories();
    setRefreshing(false);
  };

  // ✅ Updated fetchHomeData with pagination support
  const fetchHomeData = async (page: number = 1, append: boolean = false, repositoryName?: string) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else if (!refreshing) {
        setLoading(true);
      }

      const token = await AsyncStorage.getItem('access_token');
      let url = `${API_BASE_URL}/home/?page=${page}&limit=${itemsPerPage}`;
      if (repositoryName) {
        url += `&reposotory_name=${encodeURIComponent(repositoryName)}`;
      }
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch data');
      const data = await response.json();
      
      setStoreName(data.store || selectedWarehouse || 'المتجر الرئيسي');
      setStats({
        total: data.total,
        available: data.available,
        onWay: data.on_way,
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
          requestedStock: item.total_requested,
          reposotory: item.reposotory,
          iconKey: meta.icon,
          colorStart: meta.colorStart,
          colorEnd: meta.colorEnd,
          items: [],
        };
      });

      if (append) {
        setMaterials((prev) => [...prev, ...mappedMaterials]);
        setAllMaterials((prev) => [...prev, ...mappedMaterials]);
      } else {
        setMaterials(mappedMaterials);
        setAllMaterials(mappedMaterials);
      }

      // Check if there are more items
      const hasMoreItems = mappedMaterials.length === itemsPerPage;
      setHasMore(hasMoreItems);
    } catch (error) {
      Alert.alert('خطأ', 'فشل في تحميل البيانات');
      console.error(error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
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
    } catch (error: any) {
      console.error(error);
    }
  };

  const isAdmin = userType === 'admin';

  const handleLogout = async () => {
    await unregisterPushTokenFromBackend(API_BASE_URL);

    await AsyncStorage.removeItem('isLoggedIn');
    await AsyncStorage.removeItem('userType');
    await AsyncStorage.removeItem('access_token');
    navigation.navigate('Login' as never);
  };

  const handleSelectMaterial = (material: Material) => {
    navigation.navigate('MaterialsManagement', { material });
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
      const payload = {
        type: selectedItem.name,
        name: selectedItem.type,
        amount: qty.toString(),
      };
      const response = await fetch(`${API_BASE_URL}/reserve/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشل في الحجز');
      }
      Alert.alert('تم', `تم حجز ${qty} من ${selectedItem.name} بنجاح`);
      setCurrentPage(1);
      setHasMore(true);
      await fetchHomeData(1, false, selectedWarehouse);
      setShowReserveModal(false);
      setSelectedItem(null);
      setReserveQuantity('');
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'حدث خطأ أثناء الحجز');
      console.error('Reservation error:', error);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم الفئة');
      return;
    }
    if (!selectedWarehouse) {
      Alert.alert('خطأ', 'يرجى اختيار مستودع');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/add_product/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          description: newCategoryDescription.trim(),
          reposotory: selectedWarehouse,
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
      setCurrentPage(1);
      setHasMore(true);
      await fetchHomeData(1, false, selectedWarehouse);
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'فشل في إضافة الفئة');
      console.error(error);
    }
  };

  const handleAddMaterial = async () => {
    if (!newMaterial.name.trim()) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول');
      return;
    }
    if (selectedParentMaterialId === null) {
      Alert.alert('خطأ', 'لم يتم تحديد الفئة');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('access_token');
      const classResponse = await fetch(`${API_BASE_URL}/add_class/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: newMaterial.name,
          product_id: selectedParentMaterialId,
          amount: newMaterial.amount,
          is_available: newMaterial.status,
        }),
      });
      if (!classResponse.ok) {
        const errorData = await classResponse.json();
        if (
          errorData.error &&
          errorData.error.includes('هناك حجز مطلوب لصالح ورشة لهذه المادة')
        ) {
          Alert.alert(
            'خطأ',
            'هناك حجز مطلوب لصالح ورشة لهذه المادة. لا يمكنك إضافة كمية جديدة قبل معالجة الحجز.'
          );
          return;
        }
        throw new Error(errorData.error || 'Failed to add class');
      }
      Alert.alert('تم', 'تمت إضافة المادة بنجاح');
      setNewMaterial({ name: '', amount: '', status: 'متاح' });
      setShowAddMaterialModal(false);
      setSelectedParentMaterialId(null);
      setCurrentPage(1);
      setHasMore(true);
      await fetchHomeData(1, false, selectedWarehouse);
    } catch (error: any) {
      console.error('Add material error:', error);
      Alert.alert('خطأ', error.message || 'فشل في إضافة المادة');
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
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: editingItem.name,
          name: editingItem.type,
          amount: newQuantity,
          new_mode_is_available: newStatus,
          is_available: editingItem.status,
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
      setCurrentPage(1);
      setHasMore(true);
      await fetchHomeData(1, false, selectedWarehouse);
      setEditingItem(null);
      setNewQuantity('');
      setNewStatus('متاح');
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'فشل في تحديث الحالة');
      console.error(error);
    }
  };

  const handleSaveCategoryEdit = async () => {
    if (!editingCategory || !editedCategoryName.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم جديد');
      return;
    }
    if (editedCategoryName === editingCategory.name) {
      setEditingCategory(null);
      return;
    }
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/edit_product/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: editingCategory.id,
          new_name: editedCategoryName.trim(),
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشل في تعديل اسم الفئة');
      }
      Alert.alert('تم', 'تم تعديل اسم الفئة بنجاح');
      setEditingCategory(null);
      setCurrentPage(1);
      setHasMore(true);
      await fetchHomeData(1, false, selectedWarehouse);
    } catch (error: any) {
      console.error('Edit category error:', error);
      Alert.alert('خطأ', error.message || 'حدث خطأ أثناء التعديل');
    }
  };

  const renderIcon = (iconKey: IconName) => {
    const iconName = validIcons[iconKey] || 'package-variant';
    return <MaterialCommunityIcons name={iconName as any} size={24} color="white" />;
  };

  // ✅ Load more materials (Only requests when safely scrolled)
  const loadMoreMaterials = async () => {
    if (loading || refreshing || loadingMore || !hasMore) return;
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    await fetchHomeData(nextPage, true, selectedWarehouse);
  };

  // ✅ Render Footer
  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerContainer}>
        <ActivityIndicator size="small" color="#3b82f6" />
        <Text style={styles.footerText}>جاري تحميل المزيد...</Text>
      </View>
    );
  };

  // ✅ Empty Screen Placeholder
  const renderEmptyComponent = () => {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="package-variant" size={64} color="#cbd5e1" />
        <Text style={styles.emptyText}>لا توجد مواد مسجلة</Text>
      </View>
    );
  };

  // ✅ Extract List Header Logic
  const renderListHeader = () => (
    <View>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.roleAndStoreContainer}>
            <View style={[styles.badge, isAdmin ? styles.adminBadge : styles.employeeBadge]}>
              <Text style={styles.badgeText}>{isAdmin ? 'مسؤول النظام' : 'موظف'}</Text>
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

      <View style={{ marginTop: 16 }}>
        <View style={styles.warehouseCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>المستودعات</Text>
          </View>
          <TouchableOpacity
            style={styles.warehouseDropdown}
            onPress={() => setShowWarehouseDropdown(!showWarehouseDropdown)}
          >
            <View style={styles.dropdownContent}>
              <Text style={styles.warehouseDropdownText}>
                {selectedWarehouse || 'اختر مستودعًا'}
              </Text>
              <View style={styles.dropdownIcon}>
                <Feather
                  name={showWarehouseDropdown ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#475569"
                />
              </View>
            </View>
          </TouchableOpacity>
          {showWarehouseDropdown && (
            <View style={styles.warehouseOptions}>
              {repositories.map((repo) => (
                <TouchableOpacity
                  key={repo.id}
                  style={styles.warehouseOption}
                  onPress={async () => {
                    setSelectedWarehouse(repo.name);
                    setShowWarehouseDropdown(false);
                    setCurrentPage(1);
                    setHasMore(true);
                    await fetchHomeData(1, false, repo.name);
                  }}
                >
                  <Text style={styles.warehouseOptionText}>{repo.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>فئات المواد</Text>
        {isAdmin && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddCategoryModal(true)}
          >
            <Feather name="plus" size={16} color="white" />
            <Text style={styles.addButtonText}>إضافة فئة</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // ✅ Only show AppLoader on the first ever load when it's completely empty
  if (loading && !refreshing && materials.length === 0) {
    return <AppLoader />;
  }

  return (
    <MainLayout userType={userType as any}>
      <View style={[styles.container, { flex: 1, paddingBottom: 0 }]}>
        <FlatList
          ref={flatListRef}
          data={materials}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={!loadingMore ? renderEmptyComponent() : null}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          renderItem={({ item }) => (
            <View key={item.id} style={styles.card}>
              <View style={[styles.colorBar, { backgroundColor: item.colorStart }]} />
              <TouchableOpacity
                style={styles.cardContent}
                onPress={() => handleSelectMaterial(item)}
                activeOpacity={0.95}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.iconCircle, { backgroundColor: item.colorStart }]}>
                    {renderIcon(item.iconKey)}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.materialName}>{item.name}</Text>
                    <Text style={styles.materialCategory}>{item.reposotory}</Text>
                  </View>
                </View>
                <View style={styles.stockRow}>
                  {isAdmin && (
                    <View style={styles.stockBox}>
                      <Text style={styles.stockNumber}>{item.requestedStock}</Text>
                      <Text style={styles.stockLabel}>مطلوب للشراء</Text>
                    </View>
                  )}
                  {!isAdmin && (
                    <View style={styles.stockBox}>
                      <Text style={styles.stockNumber}>{item.totalStock}</Text>
                      <Text style={styles.stockLabel}>الاجمالي</Text>
                    </View>
                  )}
                  <View style={styles.stockBox}>
                    <Text style={[styles.stockNumber, { color: '#22c55e' }]}>
                      {item.availableStock}
                    </Text>
                    <Text style={styles.stockLabel}>متوفر</Text>
                  </View>
                  <View style={styles.stockBox}>
                    <Text style={[styles.stockNumber, { color: '#f97316' }]}>
                      {item.onWayStock}
                    </Text>
                    <Text style={styles.stockLabel}>قيد الوصول</Text>
                  </View>
                </View>
                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.max(
                          item.totalStock > 0
                            ? (item.availableStock / item.totalStock) * 100
                            : 0,
                          5
                        )}%`,
                        backgroundColor: item.colorStart,
                      },
                    ]}
                  />
                </View>
              </TouchableOpacity>
              {isAdmin && (
                <>
                  <TouchableOpacity
                    style={[styles.detailsBtn, { backgroundColor: '#487dee' }]}
                    onPress={() => {
                      setSelectedParentMaterialId(item.id);
                      setShowAddMaterialModal(true);
                    }}
                  >
                    <Feather name="plus" size={16} color="white" />
                    <Text style={styles.detailsBtnText}>إضافة مادة</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.detailsBtn, { backgroundColor: '#f7b94e', marginTop: 8 }]}
                    onPress={() => {
                      setEditingCategory(item);
                      setEditedCategoryName(item.name);
                    }}
                  >
                    <Feather name="edit" size={16} color="white" />
                    <Text style={styles.detailsBtnText}>تعديل الفئة</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
          onEndReached={loadMoreMaterials}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
        />

        {/* Modals Here */}
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
                  placeholderTextColor="#9ca3af" // <--- ADD THIS LINE (Gray color)

                value={newCategoryName}
                onChangeText={setNewCategoryName}
              />
              <TextInput
                style={styles.modalInput}
                placeholder=" وصف الفئة"
                placeholderTextColor="#9ca3af" // <--- ADD THIS LINE (Gray color)

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

        <Modal
          visible={showAddMaterialModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowAddMaterialModal(false);
            setSelectedParentMaterialId(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>إضافة مادة جديدة</Text>
              <Text style={styles.label}>اسم المادة</Text>
              <TextInput
                style={styles.modalInput}
                value={newMaterial.name}
                onChangeText={(text) =>
                  setNewMaterial({ ...newMaterial, name: text })
                }
              />
              <Text style={styles.label}>الكمية</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={newMaterial.amount}
                onChangeText={(text) =>
                  setNewMaterial({ ...newMaterial, amount: text })
                }
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
                    onPress={() => setNewMaterial({ ...newMaterial, status })}
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
                  onPress={() => {
                    setShowAddMaterialModal(false);
                    setSelectedParentMaterialId(null);
                  }}
                >
                  <Text style={styles.cancelText}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleAddMaterial}
                  disabled={!newMaterial.name}
                >
                  <Text style={styles.saveText}>إضافة</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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

        <Modal
          visible={!!editingCategory}
          transparent
          animationType="fade"
          onRequestClose={() => setEditingCategory(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>تعديل اسم الفئة</Text>
              <Text style={styles.label}>الاسم الحالي: {editingCategory?.name}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="الاسم الجديد"
                placeholderTextColor="#9ca3af" // <--- ADD THIS LINE (Gray color)

                value={editedCategoryName}
                onChangeText={setEditedCategoryName}
                textAlign="right"
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setEditingCategory(null)}
                >
                  <Text style={styles.cancelText}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveCategoryEdit}
                  disabled={!editedCategoryName.trim()}
                >
                  <Text style={styles.saveText}>حفظ</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
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
    borderRadius: 16,
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#bfdbfe',
    marginTop: 4,
    fontSize: 14,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    justifyContent: 'space-between',
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  adminBadge: {
    backgroundColor: 'white',
  },
  employeeBadge: {
    backgroundColor: 'white',
  },
  badgeText: {
    color: '#2563eb',
    fontWeight: 'bold',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'white',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  logoutText: {
    color: 'white',
    marginLeft: 6,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#4b5563',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 12,
    color: '#1f2937',
  },
  addButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#10b981',
    padding: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    marginRight: 8,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
  },
  colorBar: {
    height: 6,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  cardContent: {
    padding: 16,
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
    marginRight: 12,
  },
  materialName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  materialCategory: {
    fontSize: 14,
    color: '#6b7280',
  },
  badgeLight: {
    backgroundColor: '#bfdbfe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  stockBox: {
    alignItems: 'center',
  },
  stockNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  stockLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: 8,
    borderRadius: 20,
  },
  detailsBtn: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  detailsBtnText: {
    color: 'white',
    marginLeft: 6,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
  },
  modalInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
    textAlign: 'right',
    fontSize: 16,
    minHeight: 45,
    includeFontPadding: false,
  },
  detailCard: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
  },
  detailName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  detailType: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailDesc: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  detailStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  detailActions: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  reserveBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    borderRadius: 12,
    flex: 1,
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#e5e7eb',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  reserveBtnDisabled: {
    backgroundColor: '#94a3b8',
  },
  reserveBtnText: {
    color: 'white',
    marginLeft: 6,
    fontWeight: '600',
  },
  reserveButtonsRow: {
    flexDirection: 'row',
    marginTop: 16,
    justifyContent: 'space-between',
    gap: 12,
  },
  warehouseCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  warehouseDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  warehouseDropdownText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  warehouseOptions: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  warehouseOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  warehouseOptionText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'right',
  },
  confirmBtn: {
    backgroundColor: '#22c55e',
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#22c55e',
    backgroundColor: 'white',
  },
  cancelBtnText: {
    color: '#22c55e',
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  dropdownContent: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  dropdownIcon: {
    marginLeft: 8,
  },
  statusOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  statusOptionSelected: {
    backgroundColor: '#22c55e',
    borderColor: '#16a34a',
  },
  statusText: {
    color: '#374151',
    fontWeight: 'bold',
  },
  statusTextSelected: {
    color: 'white',
  },
  picker: {
    height: 50,
    color: '#374151',
    textAlign: 'right',
    backgroundColor: 'transparent',
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  cancelText: {
    textAlign: 'center',
    color: '#374151',
    fontWeight: 'bold',
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#2563eb',
  },
  warehouseSection: {
    marginBottom: 20,
  },
  managementContainer: {
    flex: 1,
    backgroundColor: 'white',
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
  itemQuantity: {
    fontSize: 14,
    color: '#4b5563',
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
  // ✅ Footer Styles for Pagination
  footerContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  footerText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#64748b',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    paddingBottom: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});