import React, { useState, useEffect, useRef } from 'react';
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
  FlatList,
  ScrollView,
  LayoutAnimation,
  UIManager,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { commonStyles } from '../styles/commonStyles';
import { Picker } from '@react-native-picker/picker';
import { Ionicons, MaterialIcons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import MainLayout from '../component/MainLayout';
import { API_BASE_URL } from './api2';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppLoader from '../component/AppLoader';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
I18nManager.forceRTL(true);

interface bill {
  id: number;
  client_name: string;
  details?: string;
  is_working: string;
  seller?: number;
  seller_name?: string;
  allowed_users?: number[]; 
  is_manager?:boolean;
  can_edit?:boolean;
}

interface Product {
  id: number;
  name: string;
  description: string;
  total_available: number;
  total_on_way: number;
  reposotory: string;
}

interface ProductType {
  id: number;
  type: string;
  available_amount: number;
  is_empyt: boolean;
  is_working: boolean;
}

interface Repository {
  id: number;
  name: string;
}

interface User {
  id: number;
  username: string;
}

interface billMaterialItem {
  id: number;
  type: string;
  available_amount: number;
  reserved: boolean;
  details: billMaterialDetail[];
  loadingDetails: boolean;
}

interface billMaterialDetail {
  id: number;
  amount: number;
  is_available: string;
  description: string;
  name: string;
  type: string;
}

interface billMaterial {
  id: number;
  used_in_bill: number;
  product_name: string;
  class_name: string;
  amount: number;
  reposotory_name: string;
  reservation_status: string;
  bill_isworking: string;
  items?: billMaterialItem[];
  loadingDetails?: boolean;
}

const Customer = () => {
  const [activeTab, setActiveTab] = useState<'active' | 'ended'>('active');
  const [bills, setbills] = useState<bill[]>([]);
  const [endedbills, setEndedbills] = useState<bill[]>([]);
  
  // Pagination State
  const [activePage, setActivePage] = useState(1);
  const [endedPage, setEndedPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [hasMoreActive, setHasMoreActive] = useState(true);
  const [hasMoreEnded, setHasMoreEnded] = useState(true);
  const [loadingMoreActive, setLoadingMoreActive] = useState(false);
  const [loadingMoreEnded, setLoadingMoreEnded] = useState(false);

  const [showAddbillModal, setShowAddbillModal] = useState(false);
  const [showEditbillModal, setShowEditbillModal] = useState(false);
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [showAssignManagerModal, setShowAssignManagerModal] = useState(false);
  const [selectedbillId, setSelectedbillId] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [repositoriesLoading, setRepositoriesLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  
  // States for allowed users logic
  const [usersForBill, setUsersForBill] = useState<User[]>([]);
  const [showAddUsersModal, setShowAddUsersModal] = useState(false);
  const [showEditUsersModal, setShowEditUsersModal] = useState(false);
  const [selectedAllowedUsers, setSelectedAllowedUsers] = useState<number[]>([]);
  const [selectedEditAllowedUsers, setSelectedEditAllowedUsers] = useState<number[]>([]);

  const [selectedUser, setSelectedUser] = useState<string>('');
  const [billMaterials, setbillMaterials] = useState<billMaterial[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);
  const [currentbill, setCurrentbill] = useState<bill | null>(null);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [showEditQuantityModal, setShowEditQuantityModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<billMaterial | null>(null);
  const [newQuantity, setNewQuantity] = useState('');
  const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({});
  
  const [newbill, setNewbill] = useState({ client_name: '', details: '' });
// Change this line:
const [editbill, setEditbill] = useState({ id: 0, client_name: '', details: '', is_manager: false, seller_name: '' });
  const [billsForTransferLoading, setbillsForTransferLoading] = useState(false);
  const [billsForTransfer, setbillsForTransfer] = useState<bill[]>([]);
  const [selectedbillForTransfer, setSelectedbillForTransfer] = useState<string>('');
  const [selectedbillIdForTransfer, setSelectedbillIdForTransfer] = useState<number | null>(null);
  const [userType, setUserType] = useState<string>('');
  const [userTypeLoading, setUserTypeLoading] = useState(true);
  const [repositoriesForReturn, setRepositoriesForReturn] = useState<Repository[]>([]);
  const [repositoriesForReturnLoading, setRepositoriesForReturnLoading] = useState(false);
  const [materialForm, setMaterialForm] = useState({ product: '', productType: '', amount: '', warehouse: '' });
  const [selectedRepository, setSelectedRepository] = useState<string>('');
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addMaterialLoading, setAddMaterialLoading] = useState(false);
  const [transferDestinationType, setTransferDestinationType] = useState<'repository' | 'bill' | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const [scrollOffset, setScrollOffset] = useState<number>(0);
  const [shouldRestoreScroll, setShouldRestoreScroll] = useState(false);

  const openEditQuantityModal = (material: billMaterial) => {
    setEditingMaterial(material);
    setNewQuantity(material.amount.toString());
    setSelectedRepository('');
    setSelectedRepositoryId(null);
    setSelectedbillForTransfer('');
    setSelectedbillIdForTransfer(null);
    setTransferDestinationType(null);
    setShowEditQuantityModal(true);
  };

  const fetchRepositories = async () => {
    try {
      setRepositoriesLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/reposotories_for_bill/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.reposotories) setRepositories(data.reposotories);
    } catch (error: any) {
      console.error(error);
    } finally {
      setRepositoriesLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/users_bills/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.users) setUsers(data.users);
    } catch (error: any) {
      console.error(error);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchUsersForBill = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/users_for_allowed_users_in_bill/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.users) setUsersForBill(data.users);
    } catch (error: any) {
      console.error(error);
    }
  };

  const fetchbills = async (page: number = 1, append: boolean = false) => {
    try {
      if (append) setLoadingMoreActive(true);
      else if (!refreshing) setLoading(true);

      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/bills/?page=${page}&limit=${itemsPerPage}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      const fetchedbills = Array.isArray(data.bills) ? data.bills : [];

      if (append) {
        setbills((prev) => [...prev, ...fetchedbills]);
      } else {
        setbills(fetchedbills);
      }
      setHasMoreActive(fetchedbills.length === itemsPerPage);
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'فشل في تحميل الفواتير');
    } finally {
      setLoading(false);
      setLoadingMoreActive(false);
      setRefreshing(false);
    }
  };

  const fetchEndedbills = async (page: number = 1, append: boolean = false) => {
    try {
      if (append) setLoadingMoreEnded(true);

      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/ended_bills/?page=${page}&limit=${itemsPerPage}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      const fetchedbills = Array.isArray(data.ended_bills) ? data.ended_bills : [];

      if (append) {
        setEndedbills((prev) => [...prev, ...fetchedbills]);
      } else {
        setEndedbills(fetchedbills);
      }
      setHasMoreEnded(fetchedbills.length === itemsPerPage);
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'فشل في تحميل الفواتير المنتهية');
    } finally {
      setLoadingMoreEnded(false);
    }
  };

  const fetchProducts = async (repoId: number | string = '') => {
    if (userType === 'admin' && !repoId) return; 
    try {
      setProductsLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/home_for_reposotory_bill/?reposotory_id=${repoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setProducts(data.serialize || []);
    } catch (error: any) {
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchProductTypes = async (productId: string) => {
    if (!productId) return;
    try {
      setTypesLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/product_types/?product_id=${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setProductTypes(data.serialize || []);
    } catch (error: any) {
      console.error(error);
    } finally {
      setTypesLoading(false);
    }
  };

  const fetchbillMaterials = async (billId: number) => {
    try {
      setMaterialsLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/bill_details/?bill_id=${billId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.reservations && Array.isArray(data.reservations)) {
        const transformedMaterials = data.reservations.map((reservation: any, index: number) => ({
          id: reservation.id || index + 1,
          product_name: reservation.name || 'غير محدد',
          class_name: reservation.type || 'غير محدد',
          amount: reservation.amount || 0,
          reposotory_name: reservation.reposotory || 'غير محدد',
          reservation_status: reservation.reservation_type || 'غير محدد',
          bill_isworking: reservation.bill_isworking || 'غير محدد',
          used_in_bill: reservation.used_in_bill || 0,
          items: [],
          loadingDetails: false,
        }));
        setbillMaterials(transformedMaterials);
      } else {
        setbillMaterials([]);
      }
    } catch (error: any) {
      setbillMaterials([]);
    } finally {
      setMaterialsLoading(false);
    }
  };

  const fetchMaterialDetails = async (materialId: number, itemIndex: number, classId: number, productClass: string) => {
    try {
      setbillMaterials((prev) => prev.map((m) => {
        if (m.id === materialId && m.items) {
          const updatedItems = [...m.items];
          updatedItems[itemIndex] = { ...updatedItems[itemIndex], loadingDetails: true };
          return { ...m, items: updatedItems };
        }
        return m;
      }));
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/product_details/?class_id=${encodeURIComponent(String(classId))}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setbillMaterials((prev) => prev.map((m) => {
        if (m.id === materialId && m.items) {
          const updatedItems = [...m.items];
          updatedItems[itemIndex] = { ...updatedItems[itemIndex], details: data.serialize, loadingDetails: false };
          return { ...m, items: updatedItems };
        }
        return m;
      }));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const storedUserType = await AsyncStorage.getItem('userType');
        setUserType(storedUserType ?? '');
        setUserTypeLoading(false);
        await fetchbills(1, false);
        await fetchEndedbills(1, false);
        await fetchRepositories();
        await fetchUsersForBill();
      } catch (error) {
        setUserTypeLoading(false);
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!showMaterials && shouldRestoreScroll && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: scrollOffset, animated: false });
        setShouldRestoreScroll(false);
      }, 100);
    }
  }, [showMaterials]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setActivePage(1);
    setEndedPage(1);
    await fetchbills(1, false);
    await fetchEndedbills(1, false);
  };

  const loadMoreActiveBills = async () => {
    if (loading || refreshing || loadingMoreActive || !hasMoreActive) return;
    const nextPage = activePage + 1;
    setActivePage(nextPage);
    await fetchbills(nextPage, true);
  };

  const loadMoreEndedBills = async () => {
    if (loading || refreshing || loadingMoreEnded || !hasMoreEnded) return;
    const nextPage = endedPage + 1;
    setEndedPage(nextPage);
    await fetchEndedbills(nextPage, true);
  };

  const openbillDetails = async (bill: bill) => {
    setShouldRestoreScroll(true);
    setCurrentbill(bill);
    setSelectedbillId(bill.id);
    setShowMaterials(true);
    await fetchbillMaterials(bill.id);
  };

  const openAddMaterialModal = async () => {
    setMaterialForm({ product: '', productType: '', amount: '', warehouse: '' });
    setProducts([]); 
    setProductTypes([]); 
    setShowAddMaterialModal(true);
    if (userType !== 'admin') {
      await fetchProducts('');
    }
  };

  const openAssignManagerModal = async (billId: number) => {
    setSelectedbillId(billId);
    setSelectedUser('');
    setShowAssignManagerModal(true);
    await fetchUsers();
  };
// Change your function to this:
 const openEditBillModal = (bill: bill) => {
  setEditbill({ 
    id: bill.id, 
    client_name: bill.client_name, 
    details: bill.details || '',
    is_manager: bill.is_manager || false,
    seller_name: bill.seller_name || '' // <--- Add this line
  });
  setSelectedEditAllowedUsers(bill.allowed_users || []); 
  setShowEditbillModal(true);
};
  const handleProductSelect = (productId: string) => {
    setMaterialForm({ ...materialForm, product: productId, productType: '' });
    setProductTypes([]);
    if (productId) fetchProductTypes(productId);
  };

  const handleAddMaterial = async () => {
    if (!materialForm.product || !materialForm.productType || !materialForm.amount) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول الأساسية');
      return;
    }
    if (userType === 'admin' && !materialForm.warehouse) {
      Alert.alert('خطأ', 'يرجى اختيار المستودع المورد');
      return;
    }
    const amountValue = parseInt(materialForm.amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      Alert.alert('خطأ', 'يرجى إدخال كمية صحيحة');
      return;
    }
    let repoIdToSend: number | string = ''; 
    if (userType === 'admin') {
      const selectedRepository = repositories.find((repo) => repo.name === materialForm.warehouse);
      if (!selectedRepository) {
        Alert.alert('خطأ', 'المستودع المحدد غير صحيح');
        return;
      }
      repoIdToSend = selectedRepository.id;
    }

    try {
      setAddMaterialLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/addClassToBill/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Bill_id: selectedbillId,
          class_id: materialForm.productType,
          amount: amountValue,
          reposotory_id: repoIdToSend,
        }),
      });
      const responseData = await response.json();
      if (responseData && responseData.error) {
        Alert.alert('خطأ', responseData.error);
        return;
      }
      if (!response.ok) {
        Alert.alert('خطأ', responseData?.error || `خطأ في الخادم`);
        return;
      }
      Alert.alert('نجاح', 'تمت إضافة المادة إلى الفاتورة بنجاح');
      setShowAddMaterialModal(false);
      if (selectedbillId) fetchbillMaterials(selectedbillId);
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'حدث خطأ غير متوقع');
    } finally {
      setAddMaterialLoading(false);
    }
  };

  const handleEndbill = () => {
    if (!currentbill) return;
    Alert.alert('تأكيد إنهاء الفاتورة', 'هل تريد انهاء هذه الفاتورة؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'نعم', onPress: () => callEndbillAPI() },
    ], { cancelable: true });
  };

  const callEndbillAPI = async () => {
    if (!currentbill) return;
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/end_bill/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ bill_id: currentbill.id }),
      });
      if (!response.ok) throw new Error('فشل في إنهاء الفاتورة');
      Alert.alert('نجاح', 'تم إنهاء الفاتورة بنجاح');
      setShowMaterials(false);
      setActivePage(1);
      setEndedPage(1);
      fetchbills(1, false);
      fetchEndedbills(1, false);
    } catch (error: any) {
      Alert.alert('خطأ', error.message);
    }
  };

  const handleAddbill = async () => {
    const { client_name, details } = newbill;
    if (!client_name.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم الفاتورة');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/addBill/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          client_name: client_name.trim(), 
          details: details.trim() || '',
          allowed_users_id: selectedAllowedUsers
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'فشل في إضافة الفاتورة');
      }      
      Alert.alert('نجاح', 'تمت إضافة الفاتورة بنجاح');
      setShowAddbillModal(false);
      setNewbill({ client_name: '', details: '' });
      setSelectedAllowedUsers([]);
      setActivePage(1);
      fetchbills(1, false);
    } catch (error: any) {
      Alert.alert('خطأ', error.message);
    }
  };

  const handleEditbill = async () => {
    const { id, client_name, details } = editbill;
    if (!client_name.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم الفاتورة');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/edit_bill/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          bill_id: id,
          client_name: client_name.trim(), 
          details: details.trim() || '',
          allowed_users_id: selectedEditAllowedUsers
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'فشل في تعديل الفاتورة');
      }      
      Alert.alert('نجاح', 'تم تعديل الفاتورة بنجاح');
      setShowEditbillModal(false);
setEditbill({ id: 0, client_name: '', details: '', is_manager: false ,seller_name:''});
      setSelectedEditAllowedUsers([]);
      setActivePage(1);
      fetchbills(1, false);
      if (currentbill && currentbill.id === id) {
        setCurrentbill({...currentbill, client_name: client_name.trim(), details: details.trim(), allowed_users: selectedEditAllowedUsers});
      }
    } catch (error: any) {
      Alert.alert('خطأ', error.message);
    }
  };

  const toggleItemExpand = async (materialId: number, itemIndex: number, materialName: string, itemType: string) => {
    const key = `${materialId}-${itemIndex}`;
    const isExpanded = expandedItems[key];
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (isExpanded) {
      setExpandedItems((prev) => ({ ...prev, [key]: false }));
    } else {
      setExpandedItems((prev) => ({ ...prev, [key]: true }));
      const material = billMaterials.find((m) => m.id === materialId);
      if (material && material.items && material.items[itemIndex]) {
        const item = material.items[itemIndex];
        if (!item.details || item.details.length === 0) {
          await fetchMaterialDetails(materialId, itemIndex, item.id, itemType);
        }
      }
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollOffset(event.nativeEvent.contentOffset.y);
  };

  const renderFooter = (loadingMore: boolean) => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerContainer}>
        <ActivityIndicator size="small" color="#3b82f6" />
        <Text style={styles.footerText}>جاري تحميل المزيد...</Text>
      </View>
    );
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="build" size={64} color="#cbd5e1" />
      <Text style={styles.emptyText}>لا توجد فواتير مسجلة</Text>
    </View>
  );

  const renderEndedEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="check-circle" size={64} color="#cbd5e1" />
      <Text style={styles.emptyText}>لا توجد فواتير منتهية</Text>
    </View>
  );

  const renderListHeader = () => (
    <View>
      <View style={commonStyles.header}>
        <Text style={commonStyles.title}>إدارة الفواتير</Text>
      </View>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'active' && styles.tabButtonActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'active' && styles.tabButtonTextActive]}>
            الفواتير النشطة
          </Text>
          {activeTab === 'active' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'ended' && styles.tabButtonActive]}
          onPress={() => setActiveTab('ended')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'ended' && styles.tabButtonTextActive]}>
            الفواتير المنتهية
          </Text>
          {activeTab === 'ended' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>
      {activeTab === 'active' && (
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddbillModal(true)}>
          <Feather name="plus" size={20} color="white" />
          <Text style={styles.addButtonText}>إضافة فاتورة جديدة</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (userTypeLoading || (loading && !refreshing && bills.length === 0 && endedbills.length === 0)) {
    return <AppLoader />;
  }

  return (
    <MainLayout userType={userType || 'admin'}>
      <View style={[commonStyles.container, { flex: 1, paddingBottom: 0 }]}>
        {!showMaterials ? (
          <>
            {activeTab === 'active' ? (
              <FlatList
                ref={flatListRef}
                data={bills}
                keyExtractor={(item) => item.id.toString()}
                ListHeaderComponent={renderListHeader}
                ListEmptyComponent={!loadingMoreActive ? renderEmptyComponent() : null}
                onRefresh={handleRefresh}
                refreshing={refreshing}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => openbillDetails(item)}
                    style={styles.billCard}
                  >
                    <View style={styles.billInfo}>
                      <View
                        style={[
                          styles.billIcon,
                          { backgroundColor: item.is_working === 'stopped' ? '#fecaca' : '#dbeafe' },
                        ]}
                      >
                        <MaterialIcons
                          name="build"
                          size={24}
                          color={item.is_working === 'stopped' ? '#dc2626' : '#2563eb'}
                        />
                      </View>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.billName}>{item.client_name}</Text>
                        {item.details ? <Text style={styles.billDetail}>📍 {item.details}</Text> : null}
                        {item.seller_name ? <Text style={styles.billDetail}> البائع : {item.seller_name}</Text> : null}
                        {item.is_working === 'stopped' && (
                          <Text style={[styles.billDetail, { color: '#dc2626' }]}>⚠️ معطلة</Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                contentContainerStyle={{ paddingBottom: 20 }}
                onEndReached={loadMoreActiveBills}
                onEndReachedThreshold={0.5}
                ListFooterComponent={() => renderFooter(loadingMoreActive)}
              />
            ) : (
              <FlatList
                data={endedbills}
                keyExtractor={(item) => item.id.toString()}
                ListHeaderComponent={renderListHeader}
                ListEmptyComponent={!loadingMoreEnded ? renderEndedEmptyComponent() : null}
                onRefresh={handleRefresh}
                refreshing={refreshing}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => openbillDetails(item)}
                    style={styles.endedbillCard}
                  >
                    <View style={styles.billInfo}>
                      <View
                        style={[
                          styles.billIcon,
                          { backgroundColor: '#dcfce7', borderColor: '#10b981', borderWidth: 1 },
                        ]}
                      >
                        <MaterialIcons name="check-circle" size={24} color="#047857" />
                      </View>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.billName}>{item.client_name}</Text>
                        {item.details ? <Text style={styles.billDetail}>📍 {item.details}</Text> : null}
                        {item.seller_name ? <Text style={styles.billDetail}>المسؤول : {item.seller_name}</Text> : null}
                        <Text style={[styles.billDetail, { color: '#10b981' }]}>✅ منتهية</Text>
                      </View>
                    </View>
                    <View style={styles.endedBadge}>
                      <Text style={styles.endedBadgeText}>مكتملة</Text>
                    </View>
                  </TouchableOpacity>
                )}
                contentContainerStyle={{ paddingBottom: 20 }}
                onEndReached={loadMoreEndedBills}
                onEndReachedThreshold={0.5}
                ListFooterComponent={() => renderFooter(loadingMoreEnded)}
              />
            )}
          </>
        ) : (
          <View style={styles.materialsContainer}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setShowMaterials(false)}>
                <Ionicons name="arrow-back" size={24} color="#2563eb" />
              </TouchableOpacity>
              <Text style={styles.billTitle}>{currentbill?.client_name}</Text>
              
              <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
                {currentbill?.is_working !== 'stopped' &&
                  currentbill?.is_working !== 'done' && 
                  currentbill?.can_edit  && (
                    <TouchableOpacity
                      style={[styles.addMaterialButton, { backgroundColor: '#3b82f6' }]}
                      onPress={() => currentbill && openEditBillModal(currentbill)}
                    >
                      <Feather name="edit" size={18} color="white" />
                      <Text style={styles.addMaterialButtonText}>تعديل</Text>
                    </TouchableOpacity>
                )}
                {currentbill?.is_working !== 'stopped' &&
                  currentbill?.is_working !== 'done' &&
                  currentbill.seller_name !== null && 
                  currentbill?.can_edit  && (
                    <TouchableOpacity style={styles.addMaterialButton} onPress={openAddMaterialModal}>
                      <Feather name="plus" size={18} color="white" />
                      <Text style={styles.addMaterialButtonText}>إضافة مادة</Text>
                    </TouchableOpacity>
                  )}
              </View>
            </View>
            {materialsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>جاري تحميل المواد...</Text>
              </View>
            ) : billMaterials.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="inventory" size={64} color="#cbd5e1" />
                <Text style={styles.emptyText}>لا توجد مواد مسجلة في هذه الفاتورة</Text>
              </View>
            ) : (
              <ScrollView style={styles.materialsList}>
                {billMaterials.map((material) => {
                  const materialColor = '#3b82f6';
                  return (
                    <View
                      key={material.id}
                      style={[styles.materialCard, { borderLeftColor: materialColor, borderLeftWidth: 4 }]}
                    >
                      <View style={styles.materialInfo}>
                        <Text style={styles.materialName}>{material.product_name}</Text>
                      </View>
                      <View style={styles.itemsContainer}>
                        {material.loadingDetails ? (
                          <View style={styles.loadingContainerSmall}>
                            <ActivityIndicator size="small" color={materialColor} />
                            <Text style={styles.loadingTextSmall}>جاري تحميل التفاصيل...</Text>
                          </View>
                        ) : material.items && material.items.length > 0 ? (
                          material.items.map((item, idx) => {
                            const itemKey = `${material.id}-${idx}`;
                            const isItemExpanded = expandedItems[itemKey];
                            return (
                              <View key={idx} style={[styles.itemCard, { borderLeftColor: materialColor }]}>
                                <TouchableOpacity
                                  style={[styles.itemRow, isItemExpanded && styles.itemRowExpanded]}
                                  onPress={() => toggleItemExpand(material.id, idx, material.product_name, item.type)}
                                >
                                  <View style={styles.itemInfo}>
                                    <MaterialCommunityIcons name="cube-outline" size={16} color={materialColor} style={styles.itemIcon} />
                                    <View>
                                      <Text style={[styles.itemName, { color: materialColor }]}>{item.type}</Text>
                                      <Text style={[styles.itemName, { color: '#64748b', fontSize: 14, marginTop: 4 }]}>متاح: {item.available_amount}</Text>
                                    </View>
                                  </View>
                                  <MaterialCommunityIcons name={isItemExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={materialColor} />
                                </TouchableOpacity>
                                {isItemExpanded && (
                                  <View style={styles.itemDetails}>
                                    {item.loadingDetails ? (
                                      <View style={styles.loadingContainerSmall}>
                                        <ActivityIndicator size="small" color={materialColor} />
                                        <Text style={styles.loadingTextSmall}>جاري تحميل التفاصيل...</Text>
                                      </View>
                                    ) : item.details && item.details.length > 0 ? (
                                      item.details.map((detail, detailIdx) => (
                                        <View key={detailIdx} style={[styles.detailCard, { borderLeftColor: materialColor }]}>
                                          <View style={styles.detailHeader}>
                                            <View style={[styles.statusBadge, detail.is_available === 'متاح' && { backgroundColor: '#22c55e' }, detail.is_available === 'قيد الوصول' && { backgroundColor: '#f97316' }, detail.is_available === 'محجوز' && { backgroundColor: '#ef4444' }, detail.is_available === 'مخفي' && { backgroundColor: '#64748b' }]}>
                                              <Text style={styles.statusText}>{detail.is_available}</Text>
                                            </View>
                                          </View>
                                          <View style={styles.detailFooter}>
                                            <View style={styles.quantityContainer}>
                                              <Text style={styles.quantityLabel}>الكمية:</Text>
                                              <Text style={[styles.quantityValue, { color: materialColor }]}>{detail.amount}</Text>
                                            </View>
                                            <View style={styles.typeContainer}>
                                              <Text style={styles.typeLabel}>النوع:</Text>
                                              <Text style={[styles.typeValue, { color: materialColor }]}>{detail.type}</Text>
                                            </View>
                                          </View>
                                        </View>
                                      ))
                                    ) : (
                                      <View style={styles.noDetails}>
                                        <MaterialCommunityIcons name="information-outline" size={24} color="#94a3b8" />
                                        <Text style={styles.noDetailsText}>لا توجد تفاصيل متاحة</Text>
                                      </View>
                                    )}
                                  </View>
                                )}
                              </View>
                            );
                          })
                        ) : (
                          <View style={styles.noItems}>
                            <Text style={styles.noItemsLine}>
                              <Text style={styles.noItemsLabel}>النوع:</Text> {material.class_name}
                            </Text>
                            <Text style={styles.noItemsLine}>
                              <Text style={styles.noItemsLabel}>الكمية:</Text> {material.amount}
                            </Text>
                            <Text style={styles.noItemsLine}>
                              <Text style={styles.noItemsLabel}>المستودع:</Text> {material.reposotory_name}
                            </Text>
                          </View>
                        )}
                        {material.used_in_bill === -1 && material.reservation_status === 'delivered' && material.bill_isworking !== 'done' && (
                          <TouchableOpacity style={styles.editQuantityButton} onPress={() => openEditQuantityModal(material)}>
                            <Feather name="edit-2" size={16} color="#3b82f6" />
                            <Text style={styles.editQuantityText}>تعديل وإرجاع فائض</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
                {currentbill?.is_working === 'Yes' && currentbill?.can_edit  &&  (
                  <View style={styles.endbillButtonContainer}>
                    <TouchableOpacity style={styles.endbillButton} onPress={handleEndbill}>
                      <Feather name="power" size={18} color="white" />
                      <Text style={styles.endbillButtonText}>تنفيذ الفاتورة</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        )}

        {/* Add Bill Modal */}
        <Modal visible={showAddbillModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>إضافة فاتورة جديدة</Text>
              <TextInput style={styles.modalInput} placeholder="اسم الزبون *" placeholderTextColor="#9ca3af" value={newbill.client_name} onChangeText={(text) => setNewbill({ ...newbill, client_name: text })} textAlign="right" />
              <TextInput style={styles.modalInput} placeholder="التفاصيل (اختياري)" placeholderTextColor="#9ca3af" value={newbill.details} onChangeText={(text) => setNewbill({ ...newbill, details: text })} textAlign="right" />
              
              <View style={styles.storeSelection}>
                <View style={styles.labelWithInfoContainer}>
                  <Text style={[styles.storeLabel, { marginBottom: 0 }]}>المستخدمين المسموحين:</Text>
                  {userType === 'admin' &&(
                  <TouchableOpacity 
                    onPress={() => Alert.alert("توضيح", "المشرفين هم من سيرون تفاصيل هذه الفاتورة, يمكنك من هنا اضافة المزيد.")} 
                    style={styles.infoIconContainer}
                  >
                    <Ionicons name="information-circle-outline" size={22} color="#3b82f6" />
                  </TouchableOpacity>
                  )}
                  {userType !== 'admin' &&(
                  <TouchableOpacity 
                    onPress={() => Alert.alert("توضيح", "المشرفين ومن معك في نفس المستودع هم من سيرون تفاصيل هذه الفاتورة, يمكنك من هنا اضافة المزيد.")} 
                    style={styles.infoIconContainer}
                  >
                    <Ionicons name="information-circle-outline" size={22} color="#3b82f6" />
                  </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.pickerBeautifulContainer2}
                  onPress={() => setShowAddUsersModal(true)}
                >
                  <Text style={styles.pickerText}>
                    {selectedAllowedUsers.length > 0
                      ? `تم اختيار ${selectedAllowedUsers.length} مستخدم`
                      : "اختر المستخدمين المسموحين..."}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#4B5563" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalActions}>
                <Pressable style={[styles.modalButton, styles.cancelBtn]} onPress={() => { setShowAddbillModal(false); setSelectedAllowedUsers([]); }}>
                  <Text style={styles.cancelText}>إلغاء</Text>
                </Pressable>
                <Pressable style={[styles.modalButton, styles.saveBtn]} onPress={handleAddbill} disabled={!newbill.client_name.trim()}>
                  <Text style={styles.saveText}>إضافة</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Edit Bill Modal */}
        <Modal visible={showEditbillModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>تعديل بيانات الفاتورة</Text>
              <TextInput style={styles.modalInput} placeholder="اسم الزبون *" placeholderTextColor="#9ca3af" value={editbill.client_name} onChangeText={(text) => setEditbill({ ...editbill, client_name: text })} textAlign="right" />
              <TextInput style={styles.modalInput} placeholder="التفاصيل (اختياري)" placeholderTextColor="#9ca3af" value={editbill.details} onChangeText={(text) => setEditbill({ ...editbill, details: text })} textAlign="right" />
              
              <View style={styles.storeSelection}>
                <View style={styles.labelWithInfoContainer}>
                  <Text style={[styles.storeLabel, { marginBottom: 0 }]}>المستخدمين المسموحين:</Text>
                  {editbill.is_manager &&(
                  <TouchableOpacity 
                    onPress={() => Alert.alert("توضيح", "المشرفين هم من سيرون تفاصيل هذه الفاتورة, يمكنك من هنا اضافة المزيد.")} 
                    style={styles.infoIconContainer}
                  >
                    <Ionicons name="information-circle-outline" size={22} color="#3b82f6" />
                  </TouchableOpacity>
                  )}
                  {! editbill.is_manager  && (
                  <TouchableOpacity 
    onPress={() => Alert.alert(
      "توضيح", 
      `المشرفين ومن في نفس مستودع البائع (${editbill.seller_name}) هم من سيرون تفاصيل هذه الفاتورة, يمكنك من هنا اضافة المزيد.`
    )} 
    style={styles.infoIconContainer}
  >
    <Ionicons name="information-circle-outline" size={22} color="#3b82f6" />
  </TouchableOpacity>
                  )}
                  
                </View>

                <TouchableOpacity
                  style={styles.pickerBeautifulContainer2}
                  onPress={() => setShowEditUsersModal(true)}
                >
                  <Text style={styles.pickerText}>
                    {selectedEditAllowedUsers.length > 0
                      ? `تم اختيار ${selectedEditAllowedUsers.length} مستخدم`
                      : "اختر المستخدمين المسموحين..."}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#4B5563" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalActions}>
                <Pressable style={[styles.modalButton, styles.cancelBtn]} onPress={() => { setShowEditbillModal(false); setSelectedEditAllowedUsers([]); }}>
                  <Text style={styles.cancelText}>إلغاء</Text>
                </Pressable>
                <Pressable style={[styles.modalButton, styles.saveBtn]} onPress={handleEditbill} disabled={!editbill.client_name.trim()}>
                  <Text style={styles.saveText}>تحديث</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Users Selection Modal for Add Bill */}
        <Modal visible={showAddUsersModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: "80%" }]}>
              <Text style={styles.modalTitle}>اختر المستخدمين المسموحين</Text>

              <ScrollView style={styles.usersModalList}>
                {usersForBill.map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    style={[
                      styles.userModalItem,
                      selectedAllowedUsers.includes(user.id) && styles.userModalItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedAllowedUsers((prev) =>
                        prev.includes(user.id)
                          ? prev.filter((id) => id !== user.id)
                          : [...prev, user.id],
                      );
                    }}
                  >
                    <View
                      style={[
                        styles.modalCheckbox,
                        selectedAllowedUsers.includes(user.id) && styles.modalCheckboxSelected,
                      ]}
                    >
                      {selectedAllowedUsers.includes(user.id) && (
                        <Ionicons name="checkmark" size={16} color="white" />
                      )}
                    </View>
                    <Text style={styles.userModalName}>{user.username}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.modalButton, styles.cancelBtn]}
                  onPress={() => setShowAddUsersModal(false)}
                >
                  <Text style={styles.cancelText}>إلغاء</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalButton, styles.saveBtn]}
                  onPress={() => setShowAddUsersModal(false)}
                >
                  <Text style={styles.saveText}>تم</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Users Selection Modal for Edit Bill */}
        <Modal visible={showEditUsersModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: "80%" }]}>
              <Text style={styles.modalTitle}>اختر المستخدمين المسموحين</Text>

              <ScrollView style={styles.usersModalList}>
                {usersForBill.map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    style={[
                      styles.userModalItem,
                      selectedEditAllowedUsers.includes(user.id) && styles.userModalItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedEditAllowedUsers((prev) =>
                        prev.includes(user.id)
                          ? prev.filter((id) => id !== user.id)
                          : [...prev, user.id],
                      );
                    }}
                  >
                    <View
                      style={[
                        styles.modalCheckbox,
                        selectedEditAllowedUsers.includes(user.id) && styles.modalCheckboxSelected,
                      ]}
                    >
                      {selectedEditAllowedUsers.includes(user.id) && (
                        <Ionicons name="checkmark" size={16} color="white" />
                      )}
                    </View>
                    <Text style={styles.userModalName}>{user.username}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.modalButton, styles.cancelBtn]}
                  onPress={() => setShowEditUsersModal(false)}
                >
                  <Text style={styles.cancelText}>إلغاء</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalButton, styles.saveBtn]}
                  onPress={() => setShowEditUsersModal(false)}
                >
                  <Text style={styles.saveText}>تم</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={showAddMaterialModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>إضافة مادة إلى الفاتورة</Text>
              <View style={styles.pickerContainer}>
                {userType === 'admin' && (
                  <>
                <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>المستودع المورد:</Text>
                {repositoriesLoading ? (
                  <View style={styles.pickerLoadingContainer}>
                    <ActivityIndicator size="small" color="#3b82f6" />
                  </View>
                ) : (
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={materialForm.warehouse}
                      onValueChange={(itemValue) => {
                        setMaterialForm({ ...materialForm, warehouse: itemValue, product: '', productType: '' });
                        setProductTypes([]);
                        const selectedRepo = repositories.find((repo) => repo.name === itemValue);
                        if (selectedRepo) fetchProducts(selectedRepo.id);
                        else setProducts([]);
                      }}
                      style={styles.picker}
                      dropdownIconColor="#4B5563"
                    >
                      <Picker.Item label="اختر المستودع..." value="" color="#94a3b8" style={{ fontSize: 16, paddingVertical: 12 }} />
                      {repositories.map((repo) => (
                        <Picker.Item key={repo.id} label={repo.name} value={repo.name} style={{ fontSize: 16, fontWeight: '500', paddingVertical: 12 }} />
                      ))}
                    </Picker>
                  </View>
                )}
              </View>
              </>
            )}
                <Text style={styles.pickerLabel}>اختر المادة:</Text>
                {productsLoading ? (
                  <View style={styles.pickerLoadingContainer}>
                    <ActivityIndicator size="small" color="#3b82f6" />
                  </View>
                ) : (
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={materialForm.product}
                      onValueChange={(itemValue) => handleProductSelect(itemValue)}
                      style={styles.picker}
                      dropdownIconColor="#4B5563"
                    >
                      <Picker.Item label="اختر المادة..." value="" color="#94a3b8" style={{ fontSize: 16, paddingVertical: 12 }} />
                      {products.map((product) => (
                        <Picker.Item key={product.id} label={product.name} value={product.id.toString()} style={{ fontSize: 16, fontWeight: '500', paddingVertical: 12 }} />
                      ))}
                    </Picker>
                  </View>
                )}
              </View>
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>اختر نوع المادة:</Text>
                {typesLoading ? (
                  <View style={styles.pickerLoadingContainer}>
                    <ActivityIndicator size="small" color="#3b82f6" />
                  </View>
                ) : (
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={materialForm.productType}
                      onValueChange={(itemValue) => setMaterialForm({ ...materialForm, productType: itemValue })}
                      style={styles.picker}
                      dropdownIconColor="#4B5563"
                      enabled={!!materialForm.product}
                    >
                      <Picker.Item label="اختر نوع المادة..." value="" color="#94a3b8" style={{ fontSize: 16, paddingVertical: 12 }} />
                      {productTypes.map((type) => (
                        <Picker.Item 
                        key={type.id} 
                        label={`${type.type} ${type.available_amount !== null ? `(متاح: ${type.available_amount})` : `(متاح: 0)`} ${!type.is_working ? '(غير نشط)' : ''}`} 
                        value={type.id.toString()}
                        color={!type.is_working ? '#94a3b8' : undefined} 
                         style={{ fontSize: 16, fontWeight: type.is_working ? '500' : '400', paddingVertical: 12 }}
                          enabled={type.is_working} />
                      ))}
                    </Picker>
                  </View>
                )}
              </View>
              <TextInput style={styles.modalInput} placeholder="الكمية" placeholderTextColor="#94a3b8" value={materialForm.amount} onChangeText={(text) => setMaterialForm({ ...materialForm, amount: text })} keyboardType="numeric" textAlign="right" />
              <View style={styles.modalActions}>
                <Pressable style={[styles.modalButton, styles.cancelBtn]} onPress={() => setShowAddMaterialModal(false)}>
                  <Text style={styles.cancelText}>إلغاء</Text>
                </Pressable>
                <Pressable style={[styles.modalButton, styles.saveBtn]} onPress={handleAddMaterial} disabled={addMaterialLoading}>
                  {addMaterialLoading ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.saveText}>إضافة</Text>}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={showAssignManagerModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, styles.elevatedModal]}>
              <Text style={styles.modalTitle}>تعيين مدير الفاتورة</Text>
              <View style={styles.pickerBeautifulContainer}>
                {usersLoading ? (
                  <ActivityIndicator size="small" color="#3b82f6" />
                ) : (
                  <Picker
                    selectedValue={selectedUser}
                    onValueChange={(itemValue) => setSelectedUser(itemValue)}
                    style={styles.pickerBeautiful}
                    dropdownIconColor="#4B5563"
                  >
                    <Picker.Item label="اختر مدير للفاتورة..." value="" color="#9CA3AF" />
                    {users.map((user) => (
                      <Picker.Item key={user.id} label={user.username} value={user.username} />
                    ))}
                  </Picker>
                )}
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.cancelButton, styles.elevatedButton]} onPress={() => setShowAssignManagerModal(false)} activeOpacity={0.8}>
                  <Text style={styles.cancelText}>إلغاء</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={showEditQuantityModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>تعديل كمية المادة</Text>
              <View style={styles.quantityInfoContainer}>
                <Text style={styles.quantityInfoLabel}>المادة:</Text>
                <Text style={styles.quantityInfoValue}>{editingMaterial?.product_name}</Text>
              </View>
              <View style={styles.quantityInfoContainer}>
                <Text style={styles.quantityInfoLabel}>الكمية الحالية:</Text>
                <Text style={styles.quantityInfoValue}>{editingMaterial?.amount}</Text>
              </View>
              <Text style={styles.pickerLabel}>ادخل الكمية التي نفّذت</Text>
              <TextInput style={styles.modalInput} placeholder="الكمية الجديدة" placeholderTextColor="#94a3b8" value={newQuantity} onChangeText={setNewQuantity} keyboardType="numeric" textAlign="right" />
              <View style={styles.unifiedDestinationBox}>
                <Text style={styles.unifiedBoxTitle}>اختر المكان الذي تريد نقل البضائع اليه</Text>
                <View style={styles.toggleContainer}>
                  <TouchableOpacity style={[styles.toggleButton, transferDestinationType === 'repository' && styles.toggleButtonActive]} onPress={() => { setTransferDestinationType('repository'); setSelectedbillForTransfer(''); setSelectedbillIdForTransfer(null); }}>
                    <Text style={[styles.toggleButtonText, transferDestinationType === 'repository' && styles.toggleButtonTextActive]}>المستودع</Text>
                    {transferDestinationType === 'repository' && <View style={styles.toggleIndicator} />}
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.toggleButton, { borderRightWidth: 0 }, transferDestinationType === 'bill' && styles.toggleButtonActive]} onPress={() => { setTransferDestinationType('bill'); setSelectedRepository(''); setSelectedRepositoryId(null); }}>
                    <Text style={[styles.toggleButtonText, transferDestinationType === 'bill' && styles.toggleButtonTextActive]}>الفاتورة</Text>
                    {transferDestinationType === 'bill' && <View style={styles.toggleIndicator} />}
                  </TouchableOpacity>
                </View>
                {transferDestinationType === 'repository' && (
                  <View style={styles.dropdownContainer}>
                    {repositoriesForReturnLoading ? (
                      <View style={styles.pickerLoadingContainer}><ActivityIndicator size="small" color="#3b82f6" /><Text style={styles.loadingTextSmall}>جاري تحميل المستودعات...</Text></View>
                    ) : (
                      <View style={styles.pickerWrapper}>
                        <Picker selectedValue={selectedRepository} onValueChange={(itemValue, itemIndex) => { setSelectedRepository(itemValue); if (itemValue && repositoriesForReturn[itemIndex - 1]) { setSelectedRepositoryId(repositoriesForReturn[itemIndex - 1].id); } else { setSelectedRepositoryId(null); } }} style={styles.picker} dropdownIconColor="#4B5563">
                          <Picker.Item label="اختر المستودع..." value="" color="#94a3b8" style={{ fontSize: 16, paddingVertical: 12 }} />
                          {repositoriesForReturn.map((repo) => (<Picker.Item key={repo.id} label={repo.name} value={repo.name} style={{ fontSize: 16, fontWeight: '500', paddingVertical: 12 }} />))}
                        </Picker>
                      </View>
                    )}
                  </View>
                )}
                {transferDestinationType === 'bill' && (
                  <View style={styles.dropdownContainer}>
                    {billsForTransferLoading ? (
                      <View style={styles.pickerLoadingContainer}><ActivityIndicator size="small" color="#3b82f6" /><Text style={styles.loadingTextSmall}>جاري تحميل الفواتير...</Text></View>
                    ) : (
                      <View style={styles.pickerWrapper}>
                        <Picker selectedValue={selectedbillForTransfer} onValueChange={(itemValue, itemIndex) => { setSelectedbillForTransfer(itemValue); if (itemValue && billsForTransfer[itemIndex - 1]) { setSelectedbillIdForTransfer(billsForTransfer[itemIndex - 1].id); } else { setSelectedbillIdForTransfer(null); } }} style={styles.picker} dropdownIconColor="#4B5563">
                          <Picker.Item label="اختر فاتورة..." value="" color="#94a3b8" style={{ fontSize: 16, paddingVertical: 12 }} />
                          {billsForTransfer.map((bill) => (<Picker.Item key={bill.id} label={bill.client_name} value={bill.client_name} style={{ fontSize: 16, fontWeight: '500', paddingVertical: 12 }} />))}
                        </Picker>
                      </View>
                    )}
                  </View>
                )}
                {!transferDestinationType && <Text style={styles.placeholderText}>يرجى اختيار نوع المكان أولاً</Text>}
              </View>
              <View style={styles.modalActions}>
                <Pressable style={[styles.modalButton, styles.cancelBtn]} onPress={() => { setShowEditQuantityModal(false); setEditingMaterial(null); setNewQuantity(''); setSelectedRepository(''); setSelectedRepositoryId(null); setSelectedbillForTransfer(''); setSelectedbillIdForTransfer(null); setTransferDestinationType(null); }}>
                  <Text style={styles.cancelText}>إلغاء</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  footerContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
  },
  // ✅ Tab Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    position: 'relative',
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  tabButtonTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563eb',
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
  billCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  endedbillCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  endedBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  endedBadgeText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '700',
  },
  billInfo: {
    flexDirection: 'row-reverse',
    flex: 1,
    alignItems: 'center',
  },
  billIcon: {
    backgroundColor: '#dbeafe',
    borderRadius: 25,
    padding: 8,
    marginLeft: 10,
  },
  billName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 4,
    textAlign: 'right',
  },
  billDetail: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'right',
  },
  editQuantityButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3b82f6',
    marginTop: 8,
  },
  editQuantityText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  quantityInfoContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  quantityInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  quantityInfoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
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
  elevatedModal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 20,
    textAlign: 'center',
    color: '#1e3a8a',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 14,
    marginVertical: 8,
    textAlign: 'right',
    color: '#0f172a',
    fontSize: 16,
    backgroundColor: '#f8fafc',
  },
  pickerContainer: {
    marginVertical: 10,
  },
  pickerLabel: {
    fontWeight: '700',
    fontSize: 17,
    marginBottom: 10,
    textAlign: 'right',
    color: '#1e293b',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
  },
  picker: {
    width: '100%',
    height: 56,
    color: '#0f172a',
    fontSize: 16,
    textAlign: 'right',
    paddingHorizontal: 12,
  },
  pickerLoadingContainer: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  modalActions: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#dc2626',
  },
  cancelText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  saveBtn: {
    backgroundColor: '#16a34a',
  },
  saveText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  materialsContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  billTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e3a8a',
    textAlign: 'right',
    flex: 1,
    marginRight: 12,
  },
  addMaterialButton: {
    flexDirection: 'row-reverse',
    backgroundColor: '#22c55e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    gap: 6,
  },
  addMaterialButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  materialsList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  materialCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  materialInfo: {
    flex: 1,
    marginRight: 12,
  },
  materialName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'right',
    marginBottom: 6,
  },
  itemsContainer: {
    backgroundColor: '#FFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  itemCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    borderLeftWidth: 3,
  },
  itemRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  noItems: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
    marginVertical: 8,
  },
  noItemsLine: {
    fontSize: 15,
    color: '#1e293b',
    textAlign: 'right',
    lineHeight: 24,
  },
  noItemsLabel: {
    fontWeight: 'bold',
    color: '#64748b',
  },
  itemRowExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  itemInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  itemIcon: {
    marginLeft: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemDetails: {
    padding: 16,
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderLeftWidth: 3,
  },
  detailHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  detailFooter: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  quantityContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  quantityLabel: {
    fontSize: 14,
    color: '#64748b',
    marginHorizontal: 6,
  },
  quantityValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  typeContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  typeLabel: {
    fontSize: 14,
    color: '#64748b',
    marginHorizontal: 6,
  },
  typeValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  noDetails: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  noDetailsText: {
    fontSize: 14,
    color: '#94a3b8',
    marginRight: 8,
  },
  loadingContainerSmall: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTextSmall: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748b',
  },
  endbillButtonContainer: {
    marginTop: 20,
    marginBottom: 30,
    alignItems: 'center',
  },
  endbillButton: {
    flexDirection: 'row-reverse',
    backgroundColor: '#dc2626',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  endbillButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  unifiedDestinationBox: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  unifiedBoxTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'right',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f1f5f6',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    position: 'relative',
  },
  toggleButtonActive: {
    backgroundColor: '#3b82f6',
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: -0.2,
  },
  toggleButtonTextActive: {
    color: 'white',
  },
  toggleIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  dropdownContainer: {
    marginTop: 12,
  },
  placeholderText: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  pickerBeautifulContainer: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 24,
    overflow: 'hidden',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  pickerBeautiful: {
    width: '100%',
    height: 56,
    color: '#1F2937',
    textAlign: 'right',
    paddingRight: 16,
    fontSize: 18,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#b84a2e',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 0,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  elevatedButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  saveTextDisabled: {
    color: '#F9FAFB',
  },
  
  // ✅ Copied Styles from AdminUsers for selection blocks
  storeSelection: {
    marginVertical: 6,
  },
  labelWithInfoContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoIconContainer: {
    marginRight: 8,
    padding: 2,
  },
  storeLabel: {
    fontWeight: "bold",
    fontSize: 14,
    textAlign: "right",
    color: "#374151",
  },
  pickerBeautifulContainer2: {
    width: "100%",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    marginBottom: 8,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerText: {
    flex: 1,
    color: "#1F2937",
    textAlign: "right",
    fontSize: 18,
    paddingRight: 16,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    textAlign: "right",
    marginTop: 4,
  },
  usersModalList: {
    maxHeight: 300,
    width: "100%",
    marginVertical: 16,
  },
  userModalItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  userModalItemSelected: {
    backgroundColor: "#f0f9ff",
  },
  userModalName: {
    flex: 1,
    fontSize: 16,
    color: "#374151",
    textAlign: "right",
    marginRight: 12,
  },
  modalCheckbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  modalCheckboxSelected: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
});

export default Customer;