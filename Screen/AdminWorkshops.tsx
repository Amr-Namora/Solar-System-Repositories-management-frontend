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
  FlatList,
  ScrollView,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { commonStyles } from '../styles/commonStyles';
import { Picker } from '@react-native-picker/picker';
import { getStatusBarHeight } from 'react-native-status-bar-height';
import { Ionicons, MaterialIcons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import MainLayout from '../component/MainLayout';
import RefreshableScreen from '../component/RefreshableScreen';
import { API_BASE_URL } from './api2';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppLoader from '../component/AppLoader';
// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

I18nManager.forceRTL(true);

interface Workshop {
  id: number;
  name: string;
  location?: string;
  is_working: string;
  manager?: number;
  manager_name?: string;
}

interface Product {
  id: number;
  name: string;
  description: string;
  total_available: number;
  total_on_way: number;
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

interface WorkshopMaterialItem {
  id: number;
  type: string;
  available_amount: number;
  reserved: boolean;
  details: WorkshopMaterialDetail[];
  loadingDetails: boolean;
}

interface WorkshopMaterialDetail {
  id: number;
  amount: number;
  is_available: string;
  description: string;
  name: string;
  type: string;
}

interface WorkshopMaterial {
  id: number;
  used_in_workshop:number;
  product_name: string;
  class_name: string;
  amount: number;
  reposotory_name: string;
  reservation_status: string;
  workshop_isworking: string;
  items?: WorkshopMaterialItem[];
  loadingDetails?: boolean;
}

const AdminWorkshops = () => {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [showAddWorkshopModal, setShowAddWorkshopModal] = useState(false);
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [showAssignManagerModal, setShowAssignManagerModal] = useState(false);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [repositoriesLoading, setRepositoriesLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [assignManagerLoading, setAssignManagerLoading] = useState(false);
  const [workshopMaterials, setWorkshopMaterials] = useState<WorkshopMaterial[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);
  const [currentWorkshop, setCurrentWorkshop] = useState<Workshop | null>(null);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);  
  const [showEditQuantityModal, setShowEditQuantityModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<WorkshopMaterial | null>(null);
  const [newQuantity, setNewQuantity] = useState('');
  const [editQuantityLoading, setEditQuantityLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState<{[key: string]: boolean}>({});
  const [newWorkshop, setNewWorkshop] = useState({
    name: '',
    location: '',
  });
  const [repositoriesForReturn, setRepositoriesForReturn] = useState<Repository[]>([]);
const [repositoriesForReturnLoading, setRepositoriesForReturnLoading] = useState(false);
  const [materialForm, setMaterialForm] = useState({
    product: '',
    productType: '',
    amount: '',
    warehouse: '',
  });
  const [selectedRepository, setSelectedRepository] = useState<string>('');
const [selectedRepositoryId, setSelectedRepositoryId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addMaterialLoading, setAddMaterialLoading] = useState(false);
 const openEditQuantityModal = (material: WorkshopMaterial) => {
  setEditingMaterial(material);
  setNewQuantity(material.amount.toString());
  setSelectedRepository('');
  setSelectedRepositoryId(null);
  setShowEditQuantityModal(true);
  
  // Use the new API for repositories in edit modal
  fetchRepositoriesForReturn();
};
const fetchRepositoriesForReturn = async () => {
  try {
    setRepositoriesForReturnLoading(true);
    const token = await AsyncStorage.getItem('access_token');
    if (!token) throw new Error('لم يتم العثور على رمز المصادقة');
    
    // Use the reposotory API endpoint
    const response = await fetch(`${API_BASE_URL}/reposotories/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (!response.ok) throw new Error('فشل في جلب المستودعات للإرجاع');
    const data = await response.json();
    
    if (data.reposotories && Array.isArray(data.reposotories)) {
      setRepositoriesForReturn(data.reposotories);
    }
  } catch (error) {
    console.error('Error fetching repositories for return:', error);
    Alert.alert('خطأ', error.message || 'فشل في تحميل المستودعات للإرجاع');
  } finally {
    setRepositoriesForReturnLoading(false);
  }
};

  const fetchRepositories = async () => {
    try {
      setRepositoriesLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('لم يتم العثور على رمز المصادقة');
      const response = await fetch(`${API_BASE_URL}/reposotories_for_workshop/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('فشل في جلب المستودعات');
      const data = await response.json();
      if (data.reposotories && Array.isArray(data.reposotories)) {
        setRepositories(data.reposotories);
      }
    } catch (error) {
      console.error('Error fetching repositories:', error);
      Alert.alert('خطأ', error.message || 'فشل في تحميل المستودعات');
    } finally {
      setRepositoriesLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('لم يتم العثور على رمز المصادقة');
      const response = await fetch(`${API_BASE_URL}/users_workshops/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('فشل في جلب المستخدمين');
      const data = await response.json();
      if (data.users && Array.isArray(data.users)) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('خطأ', error.message || 'فشل في تحميل المستخدمين');
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchWorkshops = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('لم يتم العثور على رمز المصادقة');
      const response = await fetch(`${API_BASE_URL}/workshops/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('فشل في جلب الورش');
      const data = await response.json();
      const fetchedWorkshops = Array.isArray(data.workshops) ? data.workshops : [];
      setWorkshops(fetchedWorkshops);
    } catch (error) {
      console.error('Error fetching workshops:', error);
      Alert.alert('خطأ', error.message || 'فشل في تحميل الورش');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('لم يتم العثور على رمز المصادقة');
      const response = await fetch(`${API_BASE_URL}/homeRead/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('فشل في جلب المواد');
      const data = await response.json();
      if (data.serialize && Array.isArray(data.serialize)) {
        setProducts(data.serialize);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('خطأ', error.message || 'فشل في تحميل المواد');
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchProductTypes = async (productId: string) => {
    if (!productId) return;
    try {
      setTypesLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('لم يتم العثور على رمز المصادقة');
      const response = await fetch(`${API_BASE_URL}/product_types/?product_id=${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('فشل في جلب أنواع المواد');
      const data = await response.json();
      if (data.serialize && Array.isArray(data.serialize)) {
        setProductTypes(data.serialize);
      }
    } catch (error) {
      console.error('Error fetching product types:', error);
      Alert.alert('خطأ', error.message || 'فشل في تحميل أنواع المواد');
    } finally {
      setTypesLoading(false);
    }
  };

  const fetchWorkshopMaterials = async (workshopId: number) => {
    try {
      setMaterialsLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('لم يتم العثور على رمز المصادقة');
      console.log(`Fetching materials for workshop ID: ${workshopId}`);
      const response = await fetch(`${API_BASE_URL}/Workshop_details/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workshop_id: workshopId,
        }),
      });
      if (!response.ok) {
        console.error(`API Error: ${response.status} - ${response.statusText}`);
        throw new Error(`فشل في جلب مواد الورشة (${response.status})`);
      }
      const data = await response.json();
      console.log('Workshop_details API Response:', data);
      if (data.reservations && Array.isArray(data.reservations)) {
        const transformedMaterials = data.reservations.map((reservation, index) => ({
          id: reservation.id || index + 1,
          product_name: reservation.name || 'غير محدد',
          class_name: reservation.type || 'غير محدد',
          amount: reservation.amount || 0,
          reposotory_name: reservation.reposotory || 'غير محدد',
          reservation_status: reservation.reservation_type || 'غير محدد',
          workshop_isworking: reservation.workshop_isworking || 'غير محدد',
          used_in_workshop: reservation.used_in_workshop || 0,
          items: [],
          loadingDetails: false
        }));
        setWorkshopMaterials(transformedMaterials);
        console.log('Transformed materials:', transformedMaterials);
      } else {
        console.log('No reservations data found in API response');
        setWorkshopMaterials([]);
      }
    } catch (error) {
      console.error('Error fetching workshop materials:', error);
      Alert.alert('خطأ', error.message || 'فشل في تحميل مواد الورشة');
      setWorkshopMaterials([]);
    } finally {
      setMaterialsLoading(false);
    }
  };
const handleConfirmReservation = async (material: WorkshopMaterial) => {
  try {
    const token = await AsyncStorage.getItem('access_token');
    if (!token) {
      Alert.alert('خطأ', 'لم يتم العثور على رمز المصادقة');
      return;
    }

    const response = await fetch(`${API_BASE_URL}/confirm_reservation/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Reservation_id: material.id,
        username: 'admin', // You might want to get the actual username from AsyncStorage
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.error || 'فشل في تأكيد الاستلام');
    }

    Alert.alert('نجاح', 'تم تأكيد الاستلام بنجاح');
    
    // Refresh the materials list
    if (selectedWorkshopId) {
      fetchWorkshopMaterials(selectedWorkshopId);
    }
  } catch (error) {
    console.error('Error confirming reservation:', error);
    Alert.alert('خطأ', error.message || 'حدث خطأ أثناء تأكيد الاستلام');
  }
};
  const fetchMaterialTypes = async (materialId: number, materialName: string) => {
    try {
      setWorkshopMaterials(prev => prev.map(m => 
        m.id === materialId ? {...m, loadingDetails: true} : m
      ));
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('No token found');
      const response = await fetch(
        `${API_BASE_URL}/product_types/?product_id=${encodeURIComponent(materialId)}`, 
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) throw new Error('Failed to fetch product types');
      const data = await response.json();
      const itemsData = data.serialize.map((item) => ({
        id: item.id,
        type: item.type,
        available_amount: item.available_amount || 0,
        reserved: false,
        details: [],
        loadingDetails: false
      }));
      setWorkshopMaterials(prev => prev.map(m => 
        m.id === materialId ? {...m, items: itemsData, loadingDetails: false} : m
      ));
    } catch (e) {
      console.error('Error fetching product types:', e);
      Alert.alert('خطأ', 'فشل في تحميل تفاصيل المادة');
      setWorkshopMaterials(prev => prev.map(m => 
        m.id === materialId ? {...m, loadingDetails: false} : m
      ));
    }
  };

  const fetchMaterialDetails = async (materialId: number, itemIndex: number, classId: number, productClass: string) => {
    try {
      setWorkshopMaterials(prev => prev.map(m => {
        if (m.id === materialId && m.items) {
          const updatedItems = [...m.items];
          updatedItems[itemIndex] = {
            ...updatedItems[itemIndex],
            loadingDetails: true
          };
          return {...m, items: updatedItems};
        }
        return m;
      }));
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('No token found');
      const response = await fetch(
        `${API_BASE_URL}/product_details/?class_id=${encodeURIComponent(String(classId))}`, 
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) throw new Error('Failed to fetch product details');
      const data = await response.json();
      setWorkshopMaterials(prev => prev.map(m => {
        if (m.id === materialId && m.items) {
          const updatedItems = [...m.items];
          updatedItems[itemIndex] = {
            ...updatedItems[itemIndex],
            details: data.serialize,
            loadingDetails: false
          };
          return {...m, items: updatedItems};
        }
        return m;
      }));
    } catch (e) {
      console.error('Error fetching product details:', e);
      Alert.alert('خطأ', 'فشل في تحميل تفاصيل المنتج');
      setWorkshopMaterials(prev => prev.map(m => {
        if (m.id === materialId && m.items) {
          const updatedItems = [...m.items];
          updatedItems[itemIndex] = {
            ...updatedItems[itemIndex],
            loadingDetails: false
          };
          return {...m, items: updatedItems};
        }
        return m;
      }));
    }
  };

  useEffect(() => {
    fetchWorkshops();
    fetchRepositories();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWorkshops();
  };

  const openWorkshopDetails = async (workshop: Workshop) => {
    console.log("Opening workshop details for:", workshop.name, "ID:", workshop.id);
    setCurrentWorkshop(workshop);
    setSelectedWorkshopId(workshop.id);
    setShowMaterials(true);
    await fetchWorkshopMaterials(workshop.id);
  };

  const openAddMaterialModal = async () => {
    setMaterialForm({ product: '', productType: '', amount: '', warehouse: '' });
    setShowAddMaterialModal(true);
    await fetchProducts();
  };

  const openAssignManagerModal = async (workshopId: number) => {
    setSelectedWorkshopId(workshopId);
    setSelectedUser('');
    setShowAssignManagerModal(true);
    await fetchUsers();
  };

  const handleProductSelect = (productId: string) => {
    setMaterialForm({ ...materialForm, product: productId, productType: '' });
    setProductTypes([]);
    if (productId) {
      fetchProductTypes(productId);
    }
  };

  const getArabicErrorMessage = (errorMessage: string): string => {
    const errorMap: { [key: string]: string } = {
      'ليس لديك ما يكفي من المواد في المستودع': 'ليس لديك ما يكفي من المواد في المستودع',
      'data you entered is not enough': 'البيانات التي أدخلتها غير كافية',
      'فشل في إضافة المادة إلى الورشة': 'فشل في إضافة المادة إلى الورشة',
      'workshop not found': 'الورشة غير موجودة',
      'class not found': 'نوع المادة غير موجود',
      'repository not found': 'المستودع غير موجود',
      'insufficient amount': 'الكمية غير كافية',
    };
    for (const [key, value] of Object.entries(errorMap)) {
      if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }
    return 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى';
  };

  const handleAddMaterial = async () => {
    if (!materialForm.product || !materialForm.productType || !materialForm.amount || !materialForm.warehouse) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول');
      return;
    }
    const amountValue = parseInt(materialForm.amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      Alert.alert('خطأ', 'يرجى إدخال كمية صحيحة');
      return;
    }
    const selectedRepository = repositories.find(repo => repo.name === materialForm.warehouse);
    if (!selectedRepository) {
      Alert.alert('خطأ', 'المستودع المحدد غير صحيح');
      return;
    }
    try {
      setAddMaterialLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Alert.alert('خطأ', 'لم يتم العثور على رمز المصادقة');
        return;
      }
      const response = await fetch(`${API_BASE_URL}/addClassToWorkshop/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workshop_id: selectedWorkshopId,
          class_id: materialForm.productType,
          amount: amountValue,
          reposotory_id: selectedRepository.id,
        }),
      });
      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        console.error('Parse error:', parseError);
        throw new Error('استجابة غير صالحة من الخادم');
      }
      if (responseData && responseData.error) {
        const errorMessage = responseData.error;
        if (errorMessage.includes('ليس لديك ما يكفي من المواد في المستودع')) {
          Alert.alert('خطأ', 'ليس لديك ما يكفي من المواد في المستودع');
        } else if (errorMessage.includes('data you entered is not enough')) {
          Alert.alert('خطأ', 'البيانات المدخلة غير كافية');
        } else if (errorMessage.includes('المنتج الذي طلبته موجود في المستودع الاخر')) {
          console.log('المنتج الذي طلبته موجود في المستودع الاخر')
          Alert.alert('خطأ', 'المنتج الذي طلبته موجود في المستودع الاخر');
        }
        else {
          Alert.alert('خطأ', `حدث خطأ: ${errorMessage}`);
        }
        return;
      }
      if (!response.ok) {
        const errorMessage = responseData?.error || `خطأ في الخادم (${response.status})`;
        Alert.alert('خطأ', errorMessage);
        return;
      }
      Alert.alert('نجاح', 'تمت إضافة المادة إلى الورشة بنجاح');
      setShowAddMaterialModal(false);
      setMaterialForm({ product: '', productType: '', amount: '', warehouse: '' });
      setProductTypes([]);
      if (selectedWorkshopId) {
        fetchWorkshopMaterials(selectedWorkshopId);
      }
    } catch (error) {
      console.error('API Error:', error);
      if (error.message.includes('Network request failed')) {
        Alert.alert('خطأ', 'فشل في الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت');
      } else {
        Alert.alert('خطأ', error.message || 'حدث خطأ غير متوقع');
      }
    } finally {
      setAddMaterialLoading(false);
    }
  };

  const handleEndWorkshop = () => {
    if (!currentWorkshop) return;
    Alert.alert(
      'تأكيد إنهاء الورشة',
      'هل تريد انهاء هذه الورشة؟',
      [
        {
          text: 'إلغاء',
          style: 'cancel',
        },
        {
          text: 'نعم',
          onPress: () => callEndWorkshopAPI(),
        },
      ],
      { cancelable: true }
    );
  };

  const callEndWorkshopAPI = async () => {
    if (!currentWorkshop) return;
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Alert.alert('خطأ', 'لم يتم العثور على رمز المصادقة');
        return;
      }
      const response = await fetch(`${API_BASE_URL}/end_workshop/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workshop_id: currentWorkshop.id,
        }),
      });
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || 'فشل في إنهاء الورشة');
      }
      Alert.alert('نجاح', 'تم إنهاء الورشة بنجاح');
      setShowMaterials(false);
      fetchWorkshops();
    } catch (error) {
      console.error('Error ending workshop:', error);
      Alert.alert('خطأ', error.message || 'حدث خطأ أثناء إنهاء الورشة');
    }
  };

  const handleAssignManager = async () => {
    if (!selectedUser) {
      Alert.alert('خطأ', 'يرجى اختيار مدير للورشة');
      return;
    }
    try {
      setAssignManagerLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('لم يتم العثور على رمز المصادقة');
      const response = await fetch(`${API_BASE_URL}/Assign_manager_Workshop/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workshop_id: selectedWorkshopId,
          username: selectedUser,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشل في تعيين المدير');
      }
      Alert.alert('نجاح', 'تم تعيين مدير الورشة بنجاح');
      setShowAssignManagerModal(false);
      setSelectedUser('');
      fetchWorkshops();
    } catch (error) {
      Alert.alert('خطأ', error.message || 'حدث خطأ أثناء تعيين المدير');
    } finally {
      setAssignManagerLoading(false);
    }
  };

  const handleAddWorkshop = async () => {
    const { name, location } = newWorkshop;
    if (!name.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم الورشة');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('لم يتم العثور على رمز المصادقة');
      const response = await fetch(`${API_BASE_URL}/addWorkshop/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          location: location.trim() || '',
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'فشل في إضافة الورشة');
      }
      Alert.alert('نجاح', 'تمت إضافة الورشة بنجاح');
      setShowAddWorkshopModal(false);
      setNewWorkshop({ name: '', location: '' });
      fetchWorkshops();
    } catch (error) {
      Alert.alert('خطأ', error.message || 'حدث خطأ أثناء الإضافة');
    }
  };

  const handleDeleteWorkshop = async (workshopId: number, workshopName: string) => {
    Alert.alert(
      'تأكيد التعطيل',
      `هل أنت متأكد من تعطيل الورشة "${workshopName}"؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تعطيل',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('access_token');
              if (!token) throw new Error('لم يتم العثور على رمز المصادقة');
              const response = await fetch(
                `${API_BASE_URL}/WorkshopToggleStatusView/?workshop_id=${workshopId}`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                }
              );
              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'فشل في تعطيل الورشة');
              }
              Alert.alert('نجاح', 'تم تعطيل الورشة بنجاح');
              fetchWorkshops();
            } catch (error) {
              Alert.alert('خطأ', error.message || 'حدث خطأ أثناء التعطيل');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };
const handleUpdateQuantity = async () => {
  if (!editingMaterial || !newQuantity.trim() || !selectedRepositoryId) {
    Alert.alert('خطأ', 'يرجى إدخال كمية صحيحة واختيار مستودع');
    return;
  }

  const amountValue = parseInt(newQuantity);
  if (isNaN(amountValue) || amountValue <= 0) {
    Alert.alert('خطأ', 'يرجى إدخال كمية صحيحة');
    return;
  }

  // Validate that new amount is not greater than current amount
  if (amountValue > editingMaterial.amount) {
    Alert.alert('خطأ', 'الكمية الجديدة لا يمكن أن تكون أكبر من الكمية الحالية');
    return;
  }

  try {
    setEditQuantityLoading(true);
    const token = await AsyncStorage.getItem('access_token');
    if (!token) {
      Alert.alert('خطأ', 'لم يتم العثور على رمز المصادقة');
      return;
    }

    // Call the unused_amount API
    const response = await fetch(`${API_BASE_URL}/unused_amount/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reservation_id: editingMaterial.id,
        amount: amountValue,
        reposotory_id: selectedRepositoryId,
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      // Handle specific error messages from the backend
      let errorMessage = responseData.error || 'فشل في تحديث الكمية';
      
      if (errorMessage.includes('الكمية التي ادخلتها اكبر من الكمية المستخدمة في الورشة')) {
        errorMessage = 'الكمية التي أدخلتها أكبر من الكمية المستخدمة في الورشة';
      }
      
      throw new Error(errorMessage);
    }

    Alert.alert('نجاح', 'تم تحديث الكمية وإرجاع الفائض بنجاح');
    setShowEditQuantityModal(false);
    setEditingMaterial(null);
    setNewQuantity('');
    setSelectedRepository('');
    setSelectedRepositoryId(null);

    // Refresh the materials list
    if (selectedWorkshopId) {
      fetchWorkshopMaterials(selectedWorkshopId);
    }
  } catch (error) {
    console.error('Error updating quantity:', error);
    Alert.alert('خطأ', error.message || 'حدث خطأ أثناء تحديث الكمية');
  } finally {
    setEditQuantityLoading(false);
  }
};
  const toggleExpand = (material: WorkshopMaterial) => {
  const isExpanded = expandedIds.includes(material.id);
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  if (isExpanded) {
    setExpandedIds((prev) => prev.filter((i) => i !== material.id));
  } else {
    setExpandedIds((prev) => [...prev, material.id]);
    // Remove the fetchMaterialTypes call - we don't need it here
  }
};

  const toggleItemExpand = async (materialId: number, itemIndex: number, materialName: string, itemType: string) => {
    const key = `${materialId}-${itemIndex}`;
    const isExpanded = expandedItems[key];
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (isExpanded) {
      setExpandedItems(prev => ({
        ...prev,
        [key]: false
      }));
    } else {
      setExpandedItems(prev => ({
        ...prev,
        [key]: true
      }));
      const material = workshopMaterials.find(m => m.id === materialId);
      if (material && material.items && material.items[itemIndex]) {
        const item = material.items[itemIndex];
        if (!item.details || item.details.length === 0) {
          await fetchMaterialDetails(materialId, itemIndex, item.id, itemType);
        }
      }
    }
  };

return (
  <MainLayout userType="admin">
    <RefreshableScreen onRefresh={handleRefresh}>
      <View style={commonStyles.container}>
        {!showMaterials ? (
          <>
            <View style={commonStyles.header}>
              <Text style={commonStyles.title}>إدارة الورشات</Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowAddWorkshopModal(true)}>
              <Feather name="plus" size={20} color="white" />
              <Text style={styles.addButtonText}>إضافة ورشة جديدة</Text>
            </TouchableOpacity>
              {loading ? (
        <AppLoader />
      ) :  workshops.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="build" size={64} color="#cbd5e1" />
                <Text style={styles.emptyText}>لا توجد ورش مسجلة</Text>
              </View>
            ) : (
              <FlatList
                data={workshops}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    onPress={() => openWorkshopDetails(item)}
                    style={styles.workshopCard}
                  >
                    <View style={styles.workshopInfo}>
                      <View style={[
                        styles.workshopIcon, 
                        { backgroundColor: item.is_working === 'stopped' ? '#fecaca' : '#dbeafe' }
                      ]}>
                        <MaterialIcons 
                          name="build" 
                          size={24} 
                          color={item.is_working === 'stopped' ? '#dc2626' : '#2563eb'} 
                        />
                      </View>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.workshopName}>{item.name}</Text>
                        {item.location ? (
                          <Text style={styles.workshopDetail}>📍 {item.location}</Text>
                        ) : null}
                        {item.manager_name ? (
                          <Text style={styles.workshopDetail}> المسؤول : {item.manager_name}</Text>
                        ) : null}
                        {item.is_working === 'stopped' && (
                          <Text style={[styles.workshopDetail, { color: '#dc2626' }]}>
                            ⚠️ معطلة
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.workshopActions}>
                      {item.manager === null && item.is_working !== 'done' &&(
                        <TouchableOpacity
                          style={[styles.actionButton, styles.assignManagerBtn]}
                          onPress={() => openAssignManagerModal(item.id)}
                          disabled={item.is_working === 'stopped'}
                        >
                          <Text style={[
                            styles.actionButtonText,
                            item.is_working === 'stopped' && { color: '#9ca3af' }
                          ]}>
                            تعيين مدير
                          </Text>
                        </TouchableOpacity>
                      )}
                      {item.is_working === 'not started yet' && (
                        <TouchableOpacity
                          style={[styles.actionButton, styles.deleteBtn]}
                          onPress={() => handleDeleteWorkshop(item.id, item.name)}
                        >
                          <Text style={[
                            styles.actionButtonText,
                          ]}>
                           معطلة
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </>
        ) : (
          <View style={styles.materialsContainer}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setShowMaterials(false)}>
                <Ionicons name="arrow-back" size={24} color="#2563eb" />
              </TouchableOpacity>
              <Text style={styles.workshopTitle}>{currentWorkshop?.name}</Text>
              {currentWorkshop?.is_working !== 'stopped' &&currentWorkshop?.is_working !== 'done' && currentWorkshop.manager_name!==null &&(
                <TouchableOpacity
                  style={styles.addMaterialButton}
                  onPress={openAddMaterialModal}
                >
                  <Feather name="plus" size={18} color="white" />
                  <Text style={styles.addMaterialButtonText}>إضافة مادة</Text>
                </TouchableOpacity>
              )}
            </View>

            {materialsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>جاري تحميل المواد...</Text>
              </View>
            ) : workshopMaterials.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="inventory" size={64} color="#cbd5e1" />
                <Text style={styles.emptyText}>لا توجد مواد مسجلة في هذه الورشة</Text>
              </View>
            ) : (
              <ScrollView style={styles.materialsList}>
                {workshopMaterials.map((material) => {
                  const isExpanded = expandedIds.includes(material.id);
                  const materialColor = '#3b82f6';
                  return (
                    <View key={material.id} style={[
                      styles.materialCard,
                      isExpanded && styles.expandedCard,
                      { borderLeftColor: materialColor, borderLeftWidth: 4 }
                    ]}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => toggleExpand(material)}
                        style={styles.materialHeader}
                      >
                        <View style={styles.materialInfo}>
                          <Text style={styles.materialName}>{material.product_name}</Text>
                        </View>
                        <View style={styles.amountContainer}>
                            { material.used_in_workshop !== 0 && (
                              <View style={[styles.amountBadge, { backgroundColor: materialColor }]}>
                            
                            <Text style={styles.amountText}>{material.used_in_workshop}</Text>
                          </View>
                )}
                                            { material.used_in_workshop === 0 && (

                          <View style={[styles.amountBadge, { backgroundColor: materialColor }]}>
                            
                            <Text style={styles.amountText}>{material.amount}</Text>
                          </View>)}
                          <MaterialCommunityIcons
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={24}
                            color={materialColor}
                          />
                        </View>
                      </TouchableOpacity>
                      {isExpanded && (
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
                                    style={[
                                      styles.itemRow,
                                      isItemExpanded && styles.itemRowExpanded
                                    ]}
                                    onPress={() => toggleItemExpand(material.id, idx, material.product_name, item.type)}
                                  >
                                    <View style={styles.itemInfo}>
                                      <MaterialCommunityIcons 
                                        name="cube-outline" 
                                        size={16} 
                                        color={materialColor} 
                                        style={styles.itemIcon}
                                      />
                                      <View>
                                        <Text style={[styles.itemName, { color: materialColor }]}>
                                          {item.type}
                                        </Text>
                                        <Text style={[styles.itemName, { color: '#64748b', fontSize: 14, marginTop: 4 }]}>
                                          متاح: {item.available_amount}
                                        </Text>
                                      </View>
                                    </View>
                                    <MaterialCommunityIcons
                                      name={isItemExpanded ? 'chevron-up' : 'chevron-down'}
                                      size={20}
                                      color={materialColor}
                                    />
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
                                              <View style={[
                                                styles.statusBadge,
                                                detail.is_available === 'متاح' && { backgroundColor: '#22c55e' },
                                                detail.is_available === 'قيد الوصول' && { backgroundColor: '#f97316' },
                                                detail.is_available === 'محجوز' && { backgroundColor: '#ef4444' },
                                                detail.is_available === 'مخفي' && { backgroundColor: '#64748b' }
                                              ]}>
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
                              { material.used_in_workshop !== 0 && (
                              <Text style={styles.noItemsLine}>
                                <Text style={styles.noItemsLabel}>الكمية التي نفذت:</Text> {material.used_in_workshop}
                              </Text>
                )}<Text style={styles.noItemsLine}>
                                <Text style={styles.noItemsLabel}>الحجز:</Text>{' '}
                                {
                                  material.reservation_status === 'cancelled' ? 'تم الغاء الطلب' :
                                  material.reservation_status === 'requested for workshops' ? 'مطلوب للشراء' :

                                  material.reservation_status === 'delivered' ? 'وصل الطلب' :
                                  material.reservation_status === 'sent' ? 'تم ارسال الطلب' :
                                  material.reservation_status === 'pending' ? 'لم يتم ارسال الطلب بعد' :
                                  material.reservation_status
                                }
                              </Text>
                            </View>
                          )}

                          {/* Edit Quantity Button - MOVED TO THE END OF MATERIAL DETAILS */}
                          {/* In your material card - update the edit button text */}
{ material.used_in_workshop === 0 && material.reservation_status === 'delivered' && (
<TouchableOpacity
  style={styles.editQuantityButton}
  onPress={() => openEditQuantityModal(material)}
>
  <Feather name="edit-2" size={16} color="#3b82f6" />
  <Text style={styles.editQuantityText}>تعديل وإرجاع فائض</Text>
</TouchableOpacity>

)}
 <TouchableOpacity
      style={styles.confirmButton}
      onPress={() => handleConfirmReservation(material)}
    >
      <Feather name="check" size={16} color="#22c55e" />
      <Text style={styles.confirmButtonText}>تم الاستلام</Text>
    </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}

                {/* ✅ Moved "End Workshop" button to the bottom of the list */}
                {currentWorkshop?.is_working === 'Yes' && currentWorkshop.manager_name!==null &&(
                  <View style={styles.endWorkshopButtonContainer}>
                    <TouchableOpacity
                      style={styles.endWorkshopButton}
                      onPress={handleEndWorkshop}
                    >
                      <Feather name="power" size={18} color="white" />
                      <Text style={styles.endWorkshopButtonText}>تنفيذ الورشة</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        )}

        {/* Add Workshop Modal */}
        <Modal visible={showAddWorkshopModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>إضافة ورشة جديدة</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="اسم الورشة *"
                placeholderTextColor="#9ca3af"
                value={newWorkshop.name}
                onChangeText={(text) => setNewWorkshop({ ...newWorkshop, name: text })}
                textAlign="right"
              />
              <TextInput
                style={styles.modalInput}
                placeholder="الموقع (اختياري)"
                placeholderTextColor="#9ca3af"
                value={newWorkshop.location}
                onChangeText={(text) => setNewWorkshop({ ...newWorkshop, location: text })}
                textAlign="right"
              />
              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.modalButton, styles.cancelBtn]}
                  onPress={() => setShowAddWorkshopModal(false)}
                >
                  <Text style={styles.cancelText}>إلغاء</Text>
                </Pressable>
                <Pressable 
                  style={[styles.modalButton, styles.saveBtn]} 
                  onPress={handleAddWorkshop}
                  disabled={!newWorkshop.name.trim()}
                >
                  <Text style={styles.saveText}>إضافة</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Add Material Modal */}
        <Modal visible={showAddMaterialModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>إضافة مادة إلى الورشة</Text>
              <View style={styles.pickerContainer}>
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
                      <Picker.Item 
                        label="اختر المادة..." 
                        value="" 
                        color="#94a3b8"
                        style={{ fontSize: 16, paddingVertical: 12 }}
                      />
                      {products.map((product) => (
                        <Picker.Item 
                          key={product.id} 
                          label={product.name} 
                          value={product.id.toString()} 
                          style={{ 
                            fontSize: 16,
                            fontWeight: '500',
                            paddingVertical: 12,
                          }}
                        />
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
                      <Picker.Item 
                        label="اختر نوع المادة..." 
                        value="" 
                        color="#94a3b8"
                        style={{ fontSize: 16, paddingVertical: 12 }}
                      />
                      {productTypes.map((type) => (
                        <Picker.Item 
                          key={type.id} 
                          label={`${type.type} ${type.available_amount !== null ? `(متاح: ${type.available_amount})` : ''} ${!type.is_working ? '(غير نشط)' : ''}`} 
                          value={type.id.toString()} 
                          color={!type.is_working ? '#94a3b8' : '#0f172a'}
                          style={{ 
                            fontSize: 16,
                            fontWeight: type.is_working ? '500' : '400',
                            paddingVertical: 12,
                          }}
                          enabled={type.is_working}
                        />
                      ))}
                    </Picker>
                  </View>
                )}
              </View>
              <TextInput
                style={styles.modalInput}
                placeholder="الكمية"
                placeholderTextColor="#94a3b8"
                value={materialForm.amount}
                onChangeText={(text) => setMaterialForm({ ...materialForm, amount: text })}
                keyboardType="numeric"
                textAlign="right"
              />
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
                      onValueChange={(itemValue) => setMaterialForm({ ...materialForm, warehouse: itemValue })}
                      style={styles.picker}
                      dropdownIconColor="#4B5563"
                    >
                      <Picker.Item 
                        label="اختر المستودع..." 
                        value="" 
                        color="#94a3b8"
                        style={{ fontSize: 16, paddingVertical: 12 }}
                      />
                      {repositories.map((repo) => (
                        <Picker.Item 
                          key={repo.id} 
                          label={repo.name} 
                          value={repo.name} 
                          style={{ 
                            fontSize: 16,
                            fontWeight: '500',
                            paddingVertical: 12,
                          }}
                        />
                      ))}
                    </Picker>
                  </View>
                )}
              </View>
              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.modalButton, styles.cancelBtn]}
                  onPress={() => setShowAddMaterialModal(false)}
                >
                  <Text style={styles.cancelText}>إلغاء</Text>
                </Pressable>
                <Pressable 
                  style={[styles.modalButton, styles.saveBtn]} 
                  onPress={handleAddMaterial}
                  disabled={addMaterialLoading}
                >
                  {addMaterialLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.saveText}>إضافة</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Assign Manager Modal */}
        <Modal visible={showAssignManagerModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, styles.elevatedModal]}>
              <Text style={styles.modalTitle}>تعيين مدير الورشة</Text>
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
                    <Picker.Item label="اختر مدير للورشة..." value="" color="#9CA3AF" />
                    {users.map((user) => (
                      <Picker.Item key={user.id} label={user.username} value={user.username} />
                    ))}
                  </Picker>
                )}
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelButton, styles.elevatedButton]}
                  onPress={() => setShowAssignManagerModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelText}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    styles.elevatedButton,
                    !selectedUser && styles.saveButtonDisabled,
                  ]}
                  onPress={handleAssignManager}
                  activeOpacity={selectedUser ? 0.8 : 1}
                  disabled={!selectedUser || assignManagerLoading}
                >
                  {assignManagerLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text
                      style={[
                        styles.saveText,
                        !selectedUser && styles.saveTextDisabled,
                      ]}
                    >
                      تعيين المدير
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Edit Quantity Modal */}
      {/* Edit Quantity Modal */}
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

      <TextInput
        style={styles.modalInput}
        placeholder="الكمية الجديدة"
        placeholderTextColor="#94a3b8"
        value={newQuantity}
        onChangeText={setNewQuantity}
        keyboardType="numeric"
        textAlign="right"
      />

      {/* Repository Selection */}
   {/* Repository Selection */}
<View style={styles.pickerContainer}>
  <Text style={styles.pickerLabel}>اختر المستودع للإرجاع:</Text>
  {repositoriesForReturnLoading ? (
    <View style={styles.pickerLoadingContainer}>
      <ActivityIndicator size="small" color="#3b82f6" />
      <Text style={styles.loadingTextSmall}>جاري تحميل المستودعات...</Text>
    </View>
  ) : (
    <View style={styles.pickerWrapper}>
      <Picker
        selectedValue={selectedRepository}
        onValueChange={(itemValue, itemIndex) => {
          setSelectedRepository(itemValue);
          if (itemValue && repositoriesForReturn[itemIndex - 1]) {
            setSelectedRepositoryId(repositoriesForReturn[itemIndex - 1].id);
          } else {
            setSelectedRepositoryId(null);
          }
        }}
        style={styles.picker}
        dropdownIconColor="#4B5563"
      >
        <Picker.Item 
          label="اختر المستودع..." 
          value="" 
          color="#94a3b8"
          style={{ fontSize: 16, paddingVertical: 12 }}
        />
        {repositoriesForReturn.map((repo) => (
          <Picker.Item 
            key={repo.id} 
            label={repo.name} 
            value={repo.name} 
            style={{ 
              fontSize: 16,
              fontWeight: '500',
              paddingVertical: 12,
            }}
          />
        ))}
      </Picker>
    </View>
  )}
</View>
      
      <View style={styles.modalActions}>
        <Pressable
          style={[styles.modalButton, styles.cancelBtn]}
          onPress={() => {
            setShowEditQuantityModal(false);
            setEditingMaterial(null);
            setNewQuantity('');
            setSelectedRepository('');
            setSelectedRepositoryId(null);
          }}
        >
          <Text style={styles.cancelText}>إلغاء</Text>
        </Pressable>
        <Pressable 
          style={[styles.modalButton, styles.saveBtn]} 
          onPress={handleUpdateQuantity}
          disabled={editQuantityLoading || !newQuantity.trim() || !selectedRepository}
        >
          {editQuantityLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.saveText}>تحديث وإرجاع</Text>
          )}
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
  workshopCard: {
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
  workshopInfo: {
    flexDirection: 'row-reverse',
    flex: 1,
    alignItems: 'center',
  },
  workshopIcon: {
    backgroundColor: '#dbeafe',
    borderRadius: 25,
    padding: 8,
    marginLeft: 10,
  },
  workshopName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 4,
    textAlign: 'right',
  },
  workshopDetail: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'right',
  },
  workshopActions: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  assignManagerBtn: {
    backgroundColor: '#fef3c7',
  },
  deleteBtn: {
    backgroundColor: '#fee2e2',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },editQuantityButton: {
  flexDirection: 'row-reverse',
  alignItems: 'center',
  backgroundColor: '#f0f9ff',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 6,
  borderWidth: 1,
  borderColor: '#3b82f6',
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
  disabledPickerOption: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
  disabledPickerOptionText: {
    color: '#9ca3af',
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
    backgroundColor: '#F3F4F6',
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
  workshopTitle: {
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
  expandedCard: {
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  materialHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  materialInfo: { 
    flex: 1, 
    marginRight: 12 
  },
  materialName: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1f2937', 
    textAlign: 'right', 
    marginBottom: 6,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 10,
  },
  amountText: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#FFF' 
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
  buttonRow: {
  flexDirection: 'row-reverse',
  justifyContent: 'flex-start',
  alignItems: 'center',
  marginTop: 8,
  gap: 8,
},
confirmButton: {
  flexDirection: 'row-reverse',
  alignItems: 'center',
  backgroundColor: '#f0fdf4',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 6,
  borderWidth: 1,
  borderColor: '#22c55e',
},
confirmButtonText: {
  color: '#22c55e',
  fontSize: 12,
  fontWeight: '600',
  marginRight: 4,
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
    justifyContent: 'center'
  },
  loadingTextSmall: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748b'
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },

  // ✅ New styles for the bottom "End Workshop" button
  endWorkshopButtonContainer: {
    marginTop: 20,
    marginBottom: 30,
    alignItems: 'center',
  },
  endWorkshopButton: {
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
  endWorkshopButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
 

});

export default AdminWorkshops;