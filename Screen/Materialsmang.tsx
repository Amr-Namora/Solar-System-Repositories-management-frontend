import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,

  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Animated,
  Easing
} from 'react-native';
import { getStatusBarHeight } from 'react-native-status-bar-height';
import AppLoader from '../component/AppLoader';
import { Feather } from '@expo/vector-icons';
import { API_BASE_URL } from './api2';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RefreshableScreen from '../component/RefreshableScreen'; // Import the RefreshableScreen component

export function MaterialsManagementScreen({ route, navigation }) {
  const material = route?.params?.material;
  const openClassId = route?.params?.openClassId;
  const openDisplayName = route?.params?.openDisplayName;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState('');
  const [reserveModalVisible, setReserveModalVisible] = useState(false);
  const [reserveAmount, setReserveAmount] = useState<string>('');
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('متاح');
  const [isManager, setIsManager] = useState(false);
  const [isBoss, setisBoss] = useState(false);
  const [editModalType, setEditModalType] = useState(''); // 'name' or 'status'
  // Add these state variables near the top of the component
  const [newQuantity, setNewQuantity] = useState('');
  const [newStatus, setNewStatus] = useState('متاح');
  // Add these state variables from the home page
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [reserveQuantity, setReserveQuantity] = useState('');
  const [userType, setUserType] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedParentMaterialId, setSelectedParentMaterialId] = useState<number | null>(null);
  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(300))[0];
// Add these state variables near the other state declarations
const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
const [newMaterial, setNewMaterial] = useState({
  amount: '',
  status: 'متاح'
});
const statusOptions = ['متاح', 'قيد الوصول', 'مخفي'];
  useEffect(() => {
    if (material) {
      fetchProductTypes();
    }
    checkUserType();
  }, []);

  // If navigated with a class_id, open details modal directly
  useEffect(() => {
    if (openClassId) {
      const minimalMaterial = {
        id: openClassId,
        name: openDisplayName || 'التفاصيل',
        type: openDisplayName || 'التفاصيل',
      };
      setSelectedMaterial(minimalMaterial);
      fetchProductDetails(minimalMaterial);
    }
  }, [openClassId]);
const handleAddMaterial = async () => {
  // if (!newMaterial.amount.trim()) {
  //   Alert.alert('خطأ', 'يرجى إدخال الكمية');
  //   return;
  // }
  
  if (selectedParentMaterialId === null) {
    Alert.alert('خطأ', 'لم يتم تحديد الفئة');
    return;
  }

  try {
    const token = await AsyncStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/add_class/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: material.id, // The main product ID
        class_id: selectedParentMaterialId, // The specific class ID from the item
        amount: newMaterial.amount,
        is_available: newMaterial.status
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      // Check for the specific error message about workshop reservation
      if (errorData.error && errorData.error.includes('هناك حجز مطلوب لصالح ورشة لهذه المادة')) {
        Alert.alert('خطأ', 'هناك حجز مطلوب لصالح ورشة لهذه المادة. لا يمكنك إضافة كمية جديدة قبل معالجة الحجز.');
        return;
      }
      
      throw new Error(errorData.error || 'Failed to add material');
    }

    Alert.alert('تم', 'تمت إضافة المادة بنجاح');
    setNewMaterial({ amount: '', status: 'متاح' });
    setShowAddMaterialModal(false);
    setSelectedParentMaterialId(null);
    
    // Refresh the list
    await fetchProductTypes();
  } catch (error) {
    console.error('Add material error:', error);
    Alert.alert('خطأ', error.message || 'فشل في إضافة المادة');
  }
};
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchProductTypes();
      await checkUserType();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!editingItem || !newQuantity || !newStatus) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('access_token');
      
      // Debug: Print the values
      console.log('handleUpdateStatus - editingItem:', editingItem);
      console.log('handleUpdateStatus - editingItem.id:', editingItem.id);
      console.log('handleUpdateStatus - newQuantity:', newQuantity);
      console.log('handleUpdateStatus - newStatus:', newStatus);
      
      const payload = {
        amount_id: editingItem.id,
        amount: newQuantity,
        new_mode_is_available: newStatus
      };
      
      console.log('handleUpdateStatus - payload:', payload);
      
      const response = await fetch(`${API_BASE_URL}/changetype/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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

      // Refresh list view, close any modals, then show success message
      if (selectedMaterial) {
        setSelectedMaterial(null);
      }
      await fetchProductTypes();
      setEditingItem(null);
      setNewQuantity('');
      setNewStatus('متاح');
      setTimeout(() => {
        Alert.alert('تم', 'تم تحديث الحالة بنجاح');
      }, 0);
    } catch (error) {
      Alert.alert('خطأ', error.message || 'فشل في تحديث الحالة');
      console.error(error);
    }
  };

  const checkUserType = async () => {
    try {
      const storedUserType = await AsyncStorage.getItem('userType');
      setUserType(storedUserType || '');
    } catch (error) {
      console.error('Error getting user type:', error);
    }
  };

  const isAdmin = userType === 'admin';

  const fetchProductTypes = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
  
      const response = await fetch(
        `${API_BASE_URL}/product_types/?product_id=${encodeURIComponent(material.id)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
  
      if (!response.ok) {
        throw new Error('Failed to fetch product types');
      }
  
      const data = await response.json();
      console.log('Full API Response:', data);
      console.log('API Response serialize:', data.serialize);
      setIsManager(data.is_manager);
      setisBoss(data.is_boss);
      
      // Map API data to our item structure with available amount
      console.log('API Response data.serialize:', data.serialize);
      const itemsData = data.serialize.map((item, index) => {
        console.log(`Item ${index}:`, item);
        console.log(`Item ${index} id:`, item.id);
        console.log(`Item ${index} type:`, item.type);
        return {
          id: item.id,
          name: item.type,
          type: material.name,
          is_empyt:item.is_empyt,
          is_working:item.is_working,

          quantity: 0, // Placeholder
          available: item.available_amount || 0, // Use the available amount from API
          description: '', // Placeholder
          status: 'متاح' // Placeholder
        };
      });
  
      setItems(itemsData);
      
      // Start animations when data is loaded
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      ]).start();
    } catch (error) {
      Alert.alert('خطأ', 'فشل في تحميل أنواع المنتج');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  // Add this function from the home page
  const fetchProductDetails = async (material) => {
    try {
      console.log('Fetching product details for:', material);
      setDetailsLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      console.log('API URL:', `${API_BASE_URL}/product_details/?class_id=${encodeURIComponent(material.id)}`);
      
      const response = await fetch(
        `${API_BASE_URL}/product_details/?class_id=${encodeURIComponent(material.id)}`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      console.log('Response status:', response.status);
      
      if (!response.ok) throw new Error('Failed to fetch details');
      
      const data = await response.json();
      console.log('Response data:', data);
      
      const items = data.serialize.map((item) => ({
        id: item.id,
        name: item.type,
        type: item.name,
        quantity: item.amount,
        available: item.is_available === 'متاح' ? item.amount : 0,
        description: item.description,
        status: item.is_available,
      }));
      
      // Update the selected material with the fetched details
      setSelectedMaterial(prev => ({
        ...prev,
        items,
      }));
    } catch (error) {
      console.error('Error fetching product details:', error);
      Alert.alert('خطأ', 'فشل في تحميل تفاصيل المنتج');
    } finally {
      setDetailsLoading(false);
    }
  };

  // Add this function from the home page
  const openReserveModal = (item) => {
    setSelectedItem(item);
    setReserveQuantity('');
    setShowReserveModal(true);
  };

  // Add this function from the home page
  const confirmReservation = async () => {
    if (!selectedItem || !reserveQuantity) {
      Alert.alert('خطأ', 'يرجى إدخال الكمية المطلوبة');
      return;
    }
    
    const qty = Number(reserveQuantity);
    if (qty <= 0) {
      Alert.alert('خطأ', 'الكمية غير صحيحة');
      return;
    }
    if (qty > selectedItem.available) {
      Alert.alert('خطأ', 'لا يوجد ما يكفي من الموارد');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const payload = {
        amount_id: selectedItem.id,
        amount: qty.toString()
      };
      console.log('here ',payload)
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

      // Close reserve modal, refresh list, show list view, then show success message
      setShowReserveModal(false);
      setReserveQuantity('');
      await fetchProductTypes();
      setSelectedItem(null);
      setSelectedMaterial(null);
      setTimeout(() => {
        Alert.alert('تم', `تم حجز ${qty} من ${selectedItem.name} بنجاح`);
      }, 0);
      
    } catch (error) {
      Alert.alert('خطأ', error.message || 'حدث خطأ أثناء الحجز');
      console.error('Reservation error:', error);
    }
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditModalType('name'); // Set modal type to name editing
  };

  const saveEditName = async () => {
    if (editName.trim() === '') {
      Alert.alert('خطأ', 'يرجى إدخال اسم صحيح');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Call the API to update the type name
      const formData = new FormData();
      formData.append('class_id', editingItem.id.toString());
      formData.append('new_type', editName);
      const response = await fetch(
        `${API_BASE_URL}/class_type_name/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update type name');
      }

      // Update local state
      setItems(currentItems => 
        currentItems.map(i => 
          i.id === editingItem.id ? {...i, name: editName} : i
        )
      );
      
      setEditingItem(null);
      setEditName('');
      Alert.alert('تم', 'تم تعديل الاسم بنجاح');
    } catch (error) {
      Alert.alert('خطأ', 'فشل في تعديل الاسم');
      console.error(error);
    }
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditName('');
    setEditModalType('');
  };

  const handleUndeleteItem = async (item) => {
    console.log('Undelete button clicked for:', item.name);
    
    Alert.alert(
      'تفعيل المادة',
      `هل أنت متأكد من أنك تريد تفعيل ${item.name}؟`,
      [
        { text: 'إلغاء', style: 'cancel', onPress: () => console.log('Undelete cancelled') },
        { 
          text: 'تفعيل', 
          style: 'default',
          onPress: async () => {
            console.log('Undelete confirmed, making API call');
            try {
              const token = await AsyncStorage.getItem('access_token');
              
              if (!token) {
                throw new Error('Authentication token not found');
              }

              const url = `${API_BASE_URL}/class_type_undelete/`;
              console.log('API URL:', url);

              // إرسال البيانات كـ FormData كما فعلنا في الـ delete
              const formData = new FormData();
              formData.append('class_id', item.id.toString());

              const response = await fetch(url, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`
                },
                body: formData
              });

              console.log('API Response status:', response.status);
              
              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to undelete type');
              }

              // تحديث القائمة بعد التفعيل بنجاح
              await fetchProductTypes();
              Alert.alert('تم', `تم تفعيل ${item.name} بنجاح`);
            } catch (error) {
              console.error('Undelete error details:', error);
              Alert.alert('خطأ', error.message || 'فشل في تفعيل المادة');
            }
          }
        }
      ]
    );
  };
  const handleUpdateAmount = async () => {
    if (!editingItem || !newQuantity) {
      Alert.alert('خطأ', 'يرجى إدخال الكمية');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('access_token');
      
      const payload = {
        amount_id: editingItem.id,
        new_amount: newQuantity
      };
      
      const response = await fetch(`${API_BASE_URL}/edit_amount_Amount`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get('content-type');
      if (!response.ok) {
        let errorMessage = 'فشل في تعديل الكمية';
        if (contentType?.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } else {
          const text = await response.text();
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // تحديث البيانات وإغلاق النافذة
      if (selectedMaterial) {
        setSelectedMaterial(null);
      }
      await fetchProductTypes();
      setEditingItem(null);
      setNewQuantity('');
      setEditModalType('');
      
      setTimeout(() => {
        Alert.alert('تم', 'تم تحديث الكمية بنجاح');
      }, 0);
    } catch (error) {
      Alert.alert('خطأ', error.message || 'فشل في تحديث الكمية');
      console.error(error);
    }
  };

  const handleDeleteItem = async (item) => {
    console.log('Delete button clicked for:', item.name);
    
    Alert.alert(
      'الغاء التفعيل',
      ` هل أنت متأكد من أنك تريد الغاء تفعيل هذه المادة${item.name}؟`,
      [
        { text: 'إلغاء', style: 'cancel', onPress: () => console.log('Delete cancelled') },
        { 
          text: 'حذف', 
          style: 'destructive',
          onPress: async () => {
            console.log('Delete confirmed, making API call');
            try {
              const token = await AsyncStorage.getItem('access_token');
              console.log('Token retrieved:', token ? 'Yes' : 'No');
              
              if (!token) {
                throw new Error('Authentication token not found');
              }

              const url = `${API_BASE_URL}/class_type_delete/`;
              console.log('API URL:', url);

              // Call the API to delete the type
              const formData = new FormData();
              formData.append('class_id', item.id.toString());

              const response = await fetch(url, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`
                },
                body: formData
              });

              console.log('API Response status:', response.status);
              
              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete type');
              }

              // Refresh from server instead of removing locally
              await fetchProductTypes();
              Alert.alert('تم', `تم الغاء تفعيل ${item.name} بنجاح`);
            } catch (error) {
              console.error('Delete error details:', error);
              Alert.alert('خطأ', error.message || 'فشل في حذف النوع');
            }
          }
        }
      ]
    );
  };

  const handleItemPress = async (item) => {
    console.log('Item pressed:', item);
    setSelectedMaterial(item);
    
    try {
      // Create a material-like object with the necessary properties
      console.log('handleItemPress - item:', item);
      console.log('handleItemPress - item.id:', item.id);
      console.log('handleItemPress - item.name:', item.name);
      console.log('handleItemPress - material.name:', material.name);
      
      const materialItem = {
        name: material.name, // The main material name
        type: item.name,     // The specific item name (type)
        id: item.id
      };
      
      console.log('handleItemPress - materialItem:', materialItem);
      await fetchProductDetails(materialItem);
    } catch (error) {
      console.error('Error in handleItemPress:', error);
      Alert.alert('خطأ', 'فشل في تحميل التفاصيل');
    }
  };

  const closeDetailsModal = () => {
    setSelectedMaterial(null);
  };

  const handleReserveMaterial = () => {
    if (!reserveAmount || isNaN(parseInt(reserveAmount)) || parseInt(reserveAmount) <= 0) {
      Alert.alert('خطأ', 'يرجى إدخال كمية صحيحة');
      return;
    }

    const amount = parseInt(reserveAmount);
    if (amount > selectedMaterial.available) {
      Alert.alert('خطأ', `الكمية المتاحة هي ${selectedMaterial.available} فقط`);
      return;
    }

    // Update the available quantity
    setItems(currentItems => 
      currentItems.map(i => 
        i.id === selectedMaterial.id 
          ? {...i, available: i.available - amount} 
          : i
      )
    );

    // Update the selected material for the modal
    setSelectedMaterial({
      ...selectedMaterial,
      available: selectedMaterial.available - amount
    });

    setReserveModalVisible(false);
    setReserveAmount('');
    Alert.alert('تم', `تم حجز ${amount} من ${selectedMaterial.name} بنجاح`);
  };

  const handleStatusChange = () => {
    if (!selectedMaterial) return;

    // Update the status
    setItems(currentItems => 
      currentItems.map(i => 
        i.id === selectedMaterial.id 
          ? {...i, status: selectedStatus} 
          : i
      )
    );

    // Update the selected material for the modal
    setSelectedMaterial({
      ...selectedMaterial,
      status: selectedStatus
    });

    setStatusModalVisible(false);
    Alert.alert('تم', `تم تغيير حالة ${selectedMaterial.name} إلى ${selectedStatus}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>جاري تحميل العناصر...</Text>
      </View>
    );
  }

  return (
    <RefreshableScreen onRefresh={handleRefresh}>
      <View style={styles.container}>
        <Animated.View 
          style={[styles.managementHeader, {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }]}
        >
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Feather name="arrow-right" size={24} color="#2563eb" />
          </TouchableOpacity>
          <Text style={styles.managementTitle}>إدارة {material.name}</Text>
          <View style={{ width: 24 }} />
        </Animated.View>

        <View style={styles.managementContent}>
          {items.map((item, index) => (
            <Animated.View 
              key={item.id} 
              style={[
                styles.managementItem,
                item.is_working === false && { backgroundColor: '#6b7280' },
                {
                  opacity: fadeAnim,
                  transform: [
                    { 
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 300],
                        outputRange: [0, (index + 1) * 20]
                      }) 
                    }
                  ]
                }
              ]}
            >
              {/* المعلومات على اليمين - فقط اسم المادة */}
              <TouchableOpacity 
                style={styles.itemInfo}
                onPress={item.is_working === false ? undefined : () => handleItemPress(item)}
                disabled={item.is_working === false}
                activeOpacity={0.7}
              >
                <View>
  <Text style={[styles.itemName, item.is_working === false && { color: 'white' }]}>
    {item.name}
  </Text>
  <Text style={[
    styles.itemAvailableAmount, 
    item.is_working === false && { color: '#e2e8f0' } // Light gray for disabled state
  ]}>
    متاح: {item.available}
  </Text>
</View>   </TouchableOpacity>
              
              {/* الأزرار على اليسار */}
              <View style={styles.itemActions}>
  {/* Add Button - Only show for admin users */}
  {isAdmin && item.is_working !== false && (
    <TouchableOpacity 
      style={[styles.actionButton, styles.addButton]}
      onPress={() => {
        setSelectedParentMaterialId(item.id); // Set the class_id
        setShowAddMaterialModal(true);
      }}
      activeOpacity={0.8}
    >
      <Feather name="plus" size={16} color="white" />
    </TouchableOpacity>
  )}

  {item.is_working !== false && isAdmin && (
    <TouchableOpacity 
      style={[styles.actionButton, styles.editButton]}
      onPress={() => handleEditItem(item)}
      activeOpacity={0.8}
    >
      <Feather name="edit" size={16} color="white" />
    </TouchableOpacity>
  )}

  {isBoss && item.is_working !== false && (
    <>
      <TouchableOpacity 
        style={[
          styles.actionButton,
          styles.deleteButton,
          item.is_empyt === true && { backgroundColor: '#94a3b8' }
        ]}
        onPress={item.is_empyt === true ? undefined : () => handleDeleteItem(item)}
        disabled={item.is_empyt === true}
        activeOpacity={0.8}
      >
        <Feather name="trash" size={16} color="white" />
      </TouchableOpacity>
    </>
  )}
   { item.is_working === false && (
    <TouchableOpacity 
      style={[styles.actionButton, styles.undeleteButton]}
      onPress={() => handleUndeleteItem(item)}
      activeOpacity={0.8}
    >
      <Feather name="refresh-ccw" size={16} color="white" />
    </TouchableOpacity>
  )}

  {item.is_working !== false && (
    <TouchableOpacity 
      style={[styles.actionButton, styles.detailsButton]}
      onPress={() => handleItemPress(item)}
      activeOpacity={0.8}
    >
      <Feather name="info" size={16} color="white" />
    </TouchableOpacity>
  )}
</View>
            </Animated.View>
          ))}
          
          {items.length === 0 && (
            <View style={styles.emptyState}>
              <Feather name="package" size={48} color="#9ca3af" />
              <Text style={styles.emptyStateText}>لا توجد عناصر لهذه المادة</Text>
            </View>
          )}
        </View>

        {/* Edit Name Modal */}
        <Modal 
          visible={!!editingItem && editModalType === 'name'} 
          animationType="slide" 
          transparent={true}
          onRequestClose={cancelEdit}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, styles.elevatedModal]}>
              <Text style={styles.modalTitle}>تعديل الاسم</Text>
              
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="أدخل الاسم الجديد"
                  placeholderTextColor="#9ca3af" // <--- ADD THIS LINE (Gray color)

              />
              
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.cancelButton, styles.elevatedButton]}
                  onPress={cancelEdit}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelText}>إلغاء</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.saveButton, styles.elevatedButton]}
                  onPress={saveEditName}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveText}>حفظ</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Material Details Modal */}
        <Modal 
          visible={!!selectedMaterial} 
          animationType="slide" 
          onRequestClose={closeDetailsModal}
        >
          <View style={styles.modalContainer}>
            {detailsLoading ? (
        <AppLoader />
      ) : (
              <View style={{ flex: 1 }}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>تفاصيل {selectedMaterial?.name}</Text>
                  <TouchableOpacity 
                    onPress={closeDetailsModal}
                    style={styles.closeButton}
                    activeOpacity={0.7}
                  >
                    <Feather name="x" size={28} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ padding: 16 }}>
                  {selectedMaterial?.items && selectedMaterial.items.map((item) => (
                    <View key={item.id} style={styles.detailCard}>
                        {/* الزر المصغر في الزاوية العلوية اليمنى لتعديل الكمية */}
  {isAdmin && item.status !== 'محجوز' && item.status !== 'مطلوب للشراء' && (
    <TouchableOpacity
      style={[
        styles.actionButton, 
        styles.detailsButton, // استخدمنا لون أزرق موجود في الستايلات
        { 
          position: 'absolute', 
          top: 16, 
          left: 16, 
          width: 34,      // تصغير العرض
          height: 34,     // تصغير الارتفاع
          borderRadius: 17, // جعله دائرياً تماماً
          marginLeft: 0,  // إلغاء أي هوامش من الستايل الأصلي
          zIndex: 10      // لجعله قابلاً للنقر فوق أي عنصر
        }
      ]}
      onPress={() => {
        setEditingItem(item);
        setNewQuantity(item.quantity.toString());
        setEditModalType('amount');
      }}
    >
      <Feather name="edit-2" size={14} color="white" />
    </TouchableOpacity>
  )}

                      <Text style={styles.detailName}>{item.name}</Text>
                      <Text style={styles.detailType}>{item.type}</Text>
                      <Text style={styles.detailDesc}>{item.description}</Text>

                      <View style={styles.detailStatsRow}>
                        <Text>الكمية: {item.quantity}</Text>
                        <Text style={{ color: '#22c55e' }}>متوفر: {item.available}</Text>
                      </View>

                      <View style={styles.detailActions}>
                        <TouchableOpacity
                          style={[
                            styles.reserveBtn,
                            item.status !== 'متاح' && styles.reserveBtnDisabled,
                          ]}
                          disabled={item.status !== 'متاح'}
                          onPress={() => item.status === 'متاح' && openReserveModal(item)}
                        >
                          <Feather name="shopping-cart" size={16} color="white" />
                          <Text style={styles.reserveBtnText}>
                            {item.status}
                          </Text>
                        </TouchableOpacity>

           {isAdmin && item.status !== 'محجوز' &&item.status !== 'مطلوب للشراء' && (
  <TouchableOpacity
    style={[styles.reserveBtn, { backgroundColor: '#f59e0b' }]}
    onPress={() => {
      setEditingItem(item);
      setNewStatus(item.status);
      setNewQuantity(item.quantity.toString());
      setEditModalType('status'); // Set modal type to status editing
    }}
  >
    <Feather name="edit" size={16} color="white" />
    <Text style={styles.reserveBtnText}>تعديل الحالة</Text>
  </TouchableOpacity>
)}           
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </Modal>

        {/* Reserve Modal - Updated with home page design */}
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
                  placeholderTextColor="#9ca3af" // <--- ADD THIS LINE (Gray color)

                value={reserveQuantity}
                onChangeText={setReserveQuantity}
              />

              <View style={styles.reserveButtonsRow}>
                <TouchableOpacity
                  style={[styles.reserveBtn, styles.confirmBtn]}
                  onPress={confirmReservation}
                  disabled={!reserveQuantity || Number(reserveQuantity) <= 0}
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
          visible={!!editingItem && editModalType === 'status'}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setEditingItem(null);
            setEditModalType('');
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>تعديل حالة المادة</Text>
              <Text style={styles.label}>المادة: {editingItem?.name}</Text>
              <Text style={styles.label}>الكمية</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={newQuantity}
                onChangeText={setNewQuantity}
              />
              
              <Text style={styles.label}>الحالة الجديدة</Text>
              <View style={styles.statusContainer}>
                {['متاح', 'قيد الوصول', 'مخفي'].map((status) => (
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
                  onPress={() => {
                    setEditingItem(null);
                    setEditModalType('');
                  }}
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
        {/* Add Material Modal - adding view 2 */}
        {/* Edit Amount Modal */}
        <Modal
          visible={!!editingItem && editModalType === 'amount'}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setEditingItem(null);
            setEditModalType('');
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>تعديل كمية المادة</Text>
              <Text style={styles.label}>المادة: {editingItem?.name}</Text>
              
              <Text style={styles.label}>الكمية الجديدة</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={newQuantity}
                onChangeText={setNewQuantity}
                placeholder="أدخل الكمية"
                placeholderTextColor="#9ca3af"
              />
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setEditingItem(null);
                    setEditModalType('');
                  }}
                >
                  <Text style={styles.cancelText}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleUpdateAmount}
                >
                  <Text style={styles.saveText}>حفظ</Text>
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
      <Text style={styles.modalTitle}>إضافة كمية  </Text>
      
      <Text style={styles.label}>الكمية</Text>
      <TextInput
        style={styles.modalInput}
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
          // disabled={!newMaterial.amount}
        >
          <Text style={styles.saveText}>إضافة</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
      </View>
    </RefreshableScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
  paddingTop: getStatusBarHeight() + 16, // Add status bar height to padding
  },
  addButton: {
  backgroundColor: '#10b981', // Green color for add button
},
  // Header
  managementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 8,
    borderRadius: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  managementTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  
  // Management Content
  managementContent: {
    flex: 1,
    padding: 8,
  },
  managementItem: {
    flexDirection: 'row-reverse', // عكس الاتجاه لوضع المحتوى على اليمين
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemInfo: {
    flex: 1,
    alignItems: 'flex-end', // محاذاة النص لليمين
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
    textAlign: 'right',
  },
  itemStatus: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'right',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'right',
    marginTop: 4,
  },
  itemAvailable: {
    fontSize: 14,
    color: '#22c55e',
    textAlign: 'right',
    marginTop: 2,
    fontWeight: '600',
  },
  statusText: {
    fontWeight: 'bold',
  },
  availableStatus: {
    color: '#22c55e',
  },
  pendingStatus: {
    color: '#f59e0b',
  },
  hiddenStatus: {
    color: '#64748b',
  },
  itemActions: {
    flexDirection: 'row', // الأزرار ستكون من اليسار إلى اليمين
    marginLeft: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  editButton: {
    backgroundColor: '#f59e0b',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  detailsButton: {
    backgroundColor: '#3b82f6',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
    textAlign: 'center',
  },
  
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white'
  },
  itemAvailableAmount: {
  fontSize: 14,
  color: '#22c55e', // Green for "available" — you can also use '#64748b' for gray
  fontWeight: '600',
  textAlign: 'right',
  marginTop: 2,
},
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  closeButton: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20
  },
  elevatedModal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    textAlign: 'right',
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  
  // Detail Cards
  detailCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginVertical: 12,
  },
  elevatedCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'right',
  },
  detailType: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 8,
    textAlign: 'right',
  },
  detailDesc: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 22,
    textAlign: 'right',
  },
  detailStatsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  statItem: {
    alignItems: 'flex-end',
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  detailActions: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  
  // Buttons
  elevatedButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  reserveBtn: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 1,
    marginLeft: 8,
  },
  
  reserveBtnDisabled: {
    backgroundColor: '#94a3b8'
  },
  reserveBtnText: {
    color: 'white',
    marginRight: 6,
    fontWeight: '600'
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 12,
    flex: 1,
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#22c55e',
    padding: 12,
    borderRadius: 12,
    flex: 1,
    marginLeft: 8,
  },
  saveText: {
    textAlign: 'center',
    color: 'white',
    fontWeight: 'bold',
  },
  cancelText: {
    textAlign: 'center',
    color: '#64748b',
    fontWeight: 'bold',
  },
  
  // Reserve Modal
  reserveModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
  },
  label: {
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
    textAlign: 'right',
    color: '#475569',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
    textAlign: 'right',
    fontSize: 16,
    backgroundColor: 'white',
  },
  elevatedInput: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reserveButtonsRow: {
    flexDirection: 'row-reverse',
    marginTop: 20,
    justifyContent: 'space-between',
    gap: 12
  },
  confirmBtn: {
    backgroundColor: '#22c55e',
    padding: 14,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#64748b',
    fontWeight: '600'
  },
  
  // Status Options
  statusContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8
  },
  statusOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: 'white',
  },
  statusOptionSelected: {
    backgroundColor: '#22c55e',
    borderColor: '#16a34a'
  },
  statusTextSelected: {
    color: 'white'
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '500',
  },
 
  undeleteButton: {
    backgroundColor: '#0ea5e9', // لون أزرق فاتح مميز لزر الاسترجاع
  },
  
});