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
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { commonStyles } from '../styles/commonStyles';
import { I18nManager } from 'react-native';
import { API_BASE_URL } from './api2';
import AppLoader from '../component/AppLoader';
import RefreshableScreen from '../component/RefreshableScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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
  product_id?: number;
  class_id?: number;
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

// ✅ دالة لحفظ مسودة الفاتورة في AsyncStorage
const saveInvoiceDraft = async (item: MaterialDetail, quantity: number, repositoryId?: number) => {
  try {
    const draft = {
      class_id: item.class_id || item.id,
      product_name: item.type,
      class_name: item.name,
      amount: quantity,
      repository_id: repositoryId,
      timestamp: new Date().toISOString(),
    };
    await AsyncStorage.setItem('invoice_draft', JSON.stringify(draft));
    return true;
  } catch (error) {
    console.error('Error saving draft:', error);
    return false;
  }
};

// ✅ دالة لحذف مسودة الفاتورة
const clearInvoiceDraft = async () => {
  try {
    await AsyncStorage.removeItem('invoice_draft');
  } catch (error) {
    console.error('Error clearing draft:', error);
  }
};

// ✅ المكون الفرعي لعرض تفاصيل المادة مع زر البيع
function MyStoreScreen({ route, navigation }: any) {
  const { material } = route.params || {};
  const [items, setItems] = useState<MaterialDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  
  // ✅ حالات مودال البيع
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedSellItem, setSelectedSellItem] = useState<MaterialDetail | null>(null);
  const [sellQuantity, setSellQuantity] = useState('');
  const [selectedRepository, setSelectedRepository] = useState<number | null>(null);
  const [sellLoading, setSellLoading] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      fetchMaterialItems();
      fetchRepositories();
    }, [])
  );

  const fetchMaterialItems = async () => {
    if (!material?.name) return;
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('Authentication token not found');
      
      const response = await fetch(
        `${API_BASE_URL}/product_details/?product_name=${encodeURIComponent(material.name)}`, 
        { headers: { 'Authorization': `Bearer ${token}` } }
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
        product_id: item.product_id,
        class_id: item.class_id,
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
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('فشل في جلب المستودعات');
      const data = await response.json();
      setRepositories(Array.isArray(data.reposotories) ? data.reposotories : []);
    } catch (error) {
      console.error('Error fetching repositories:', error);
    }
  };

  // ✅ فتح مودال البيع
  const openSellModal = (item: MaterialDetail) => {
    setSelectedSellItem(item);
    setSellQuantity('');
    setSelectedRepository(null);
    setShowSellModal(true);
  };

  // ✅ تأكيد عملية البيع وحفظ المسودة
  const handleSellConfirm = async () => {
    if (!selectedSellItem || !sellQuantity) {
      Alert.alert('خطأ', 'يرجى إدخال الكمية');
      return;
    }
    const qty = parseInt(sellQuantity);
    if (isNaN(qty) || qty <= 0 || qty > selectedSellItem.available) {
      Alert.alert('خطأ', 'الكمية غير صحيحة أو غير متوفرة');
      return;
    }
    
    setSellLoading(true);
    try {
      // ✅ حفظ المسودة والانتقال لصفحة الفواتير
      const saved = await saveInvoiceDraft(selectedSellItem, qty, selectedRepository || undefined);
      if (saved) {
        Alert.alert('نجاح', 'تم إضافة المادة للفاتورة', [
          {
            text: 'متابعة',
            onPress: () => {
              setShowSellModal(false);
              // ✅ الانتقال لصفحة الفواتير مع إشارة لوجود مسودة
              navigation.navigate('Customer', { hasDraft: true });
            }
          },
          { text: 'لاحقاً', style: 'cancel', onPress: () => setShowSellModal(false) }
        ]);
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل في حفظ الفاتورة');
      console.error(error);
    } finally {
      setSellLoading(false);
    }
  };

  const handleItemPress = (item: MaterialDetail) => {
    navigation.navigate('MaterialDetails', { item, material });
  };

  if (loading) return <AppLoader />;

  return (
    <View style={commonStyles.container}>
      {/* Header */}
      <View style={styles.managementHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-right" size={24} color="#2563eb" />
        </TouchableOpacity>
        <Text style={styles.managementTitle}>إدارة {material?.name}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Items List */}
      <ScrollView style={styles.managementContent} showsVerticalScrollIndicator={false}>
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
                }]}>
                  <Text style={styles.quantityValue}>{item.quantity}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.itemActions}>
              {/* ✅ زر البيع الجديد */}
              <TouchableOpacity 
                style={[styles.actionButton, styles.sellButton]}
                onPress={() => openSellModal(item)}
                disabled={item.available === 0}
              >
                <Feather name="shopping-cart" size={16} color="white" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.editButton]}
                onPress={() => Alert.alert('تعديل', `سيتم تعديل ${item.name}`)}
              >
                <Feather name="edit" size={16} color="white" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ✅ Modal بيع المادة */}
      <Modal visible={showSellModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>بيع مادة</Text>
            <Text style={styles.label}>المادة: {selectedSellItem?.name}</Text>
            <Text style={styles.label}>النوع: {selectedSellItem?.type}</Text>
            <Text style={styles.availableText}>
              المتوفر: <Text style={styles.availableValue}>{selectedSellItem?.available}</Text>
            </Text>
            
            <Text style={styles.label}>الكمية المطلوبة</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="أدخل الكمية"
              keyboardType="numeric"
              value={sellQuantity}
              onChangeText={setSellQuantity}
              textAlign="right"
            />
            
            <Text style={styles.label}>المستودع المصدر (اختياري)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.repoScroll}>
              {repositories.map((repo) => (
                <TouchableOpacity
                  key={repo.id}
                  style={[
                    styles.repoChip,
                    selectedRepository === repo.id && styles.repoChipSelected
                  ]}
                  onPress={() => setSelectedRepository(repo.id)}
                >
                  <Text style={[
                    styles.repoChipText,
                    selectedRepository === repo.id && styles.repoChipTextSelected
                  ]}>
                    {repo.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowSellModal(false)}
              >
                <Text style={styles.cancelText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, sellLoading && styles.saveButtonDisabled]}
                onPress={handleSellConfirm}
                disabled={sellLoading || !sellQuantity}
              >
                {sellLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveText}>إضافة للفاتورة</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ✅ الصفحة الرئيسية للمواد (MaterialsScreen)
export default function MaterialsScreen() {
  const navigation = useNavigation();
  const [userType, setUserType] = useState<string>('');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [stats, setStats] = useState({ total: 0, available: 0, onWay: 0 });
  const [storeName, setStoreName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [newMaterial, setNewMaterial] = useState({ name: '', amount: '', status: 'متاح' });
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
    await Promise.all([fetchHomeData(), fetchRepositories()]);
    setRefreshing(false);
  };

  const fetchHomeData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/myStore/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch data');
      const data = await response.json();
      
      setStoreName(data.store || 'المتجر الرئيسي');
      setStats({ total: data.total, available: data.available, onWay: data.on_way });
      
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
    } finally {
      setLoading(false);
    }
  };

  const fetchRepositories = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;
      const response = await fetch(`${API_BASE_URL}/reposotories/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) return;
      const data = await response.json();
      setRepositories(Array.isArray(data.reposotories) ? data.reposotories : []);
    } catch (error) {
      console.error('Error fetching repositories:', error);
    }
  };

  const handleSelectMaterial = (material: Material) => {
    navigation.navigate('StoreMaterial', { material });
  };

  const handleAddMaterial = async () => {
    if (!newMaterial.name.trim() || !newMaterial.amount) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول');
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
          type: newMaterial.name,
          product_id: selectedMaterial?.id,
          amount: newMaterial.amount,
          is_available: newMaterial.status
        }),
      });
      if (!response.ok) throw new Error('Failed to add class');
      Alert.alert('تم', 'تمت إضافة المادة بنجاح');
      setNewMaterial({ name: '', amount: '', status: 'متاح' });
      setShowAddMaterialModal(false);
      fetchHomeData();
    } catch (error) {
      Alert.alert('خطأ', error.message || 'فشل في إضافة المادة');
    }
  };

  const renderIcon = (iconKey: IconName) => {
    const iconName = validIcons[iconKey] || 'package-variant';
    return <MaterialCommunityIcons name={iconName as any} size={24} color="white" />;
  };

  if (loading) return <AppLoader />;

  return (
    <MainLayout userType={userType as any}>
      <RefreshableScreen onRefresh={handleRefresh}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.userInfo}>
              <View style={styles.roleAndStoreContainer}>
                <View style={[styles.badge, styles.adminBadge]}>
                  <Text style={styles.badgeText}>مسؤول المستودع</Text>
                </View>
                <View style={[styles.badge, styles.storeBadge]}>
                  <Text style={styles.badgeText}>{storeName}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={{ flex: 1, marginTop: 16 }}>
            <Text style={styles.sectionTitle}>فئات المواد</Text>
            {materials.map((material) => (
              <View key={material.id} style={styles.card}>
                <View style={[styles.colorBar, { backgroundColor: material.colorStart }]} />
                <View style={styles.cardContent}>
                  <TouchableOpacity 
                    style={styles.cardContentTouchable}
                    onPress={() => handleSelectMaterial(material)}
                    activeOpacity={0.95}
                  >
                    <View style={styles.cardHeader}>
                      <View style={[styles.iconCircle, { backgroundColor: material.colorStart }]}>
                        {renderIcon(material.iconKey)}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.materialName}>{material.name}</Text>
                        <Text style={styles.materialCategory}>{material.category}</Text>
                      </View>
                      <View style={styles.badgeLight}>
                        <Text>{material.items.length} نوع</Text>
                      </View>
                    </View>
                    <View style={styles.stockRow}>
                      <View style={styles.stockBox}>
                        <Text style={styles.stockNumber}>{material.requestedStock}</Text>
                        <Text style={styles.stockLabel}>مطلوب</Text>
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
                  </TouchableOpacity>
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
                </View>
              </View>
            ))}
          </View>

          {/* Add Material Modal */}
          <Modal visible={showAddMaterialModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>إضافة مادة جديدة</Text>
                <Text style={styles.label}>اسم المادة</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newMaterial.name}
                  onChangeText={(text) => setNewMaterial({...newMaterial, name: text})}
                />
                <Text style={styles.label}>الكمية</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={newMaterial.amount}
                  onChangeText={(text) => setNewMaterial({...newMaterial, amount: text})}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAddMaterialModal(false)}>
                    <Text style={styles.cancelText}>إلغاء</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={handleAddMaterial}>
                    <Text style={styles.saveText}>إضافة</Text>
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
  container: { flex: 1, backgroundColor: '#f0fdfa', paddingHorizontal: 12, paddingTop: getStatusBarHeight() + 16 },
  header: { backgroundColor: '#2563eb', padding: 16, borderRadius: 16 },
  userInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 12, justifyContent: 'space-between' },
  badge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 16, backgroundColor: 'white' },
  badgeText: { color: '#2563eb', fontWeight: 'bold' },
  roleAndStoreContainer: { flexDirection: 'row', alignItems: 'center' },
  storeBadge: { marginLeft: 8 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginVertical: 12, color: '#1f2937' },
  card: { backgroundColor: 'white', borderRadius: 12, marginBottom: 16, overflow: 'hidden', elevation: 3 },
  colorBar: { height: 6 },
  cardContent: { padding: 16 },
  cardContentTouchable: { marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  materialName: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  materialCategory: { fontSize: 14, color: '#6b7280' },
  badgeLight: { backgroundColor: '#bfdbfe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
  stockRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  stockBox: { alignItems: 'center' },
  stockNumber: { fontSize: 16, fontWeight: 'bold' },
  stockLabel: { fontSize: 12, color: '#6b7280' },
  detailsBtn: { flexDirection: 'row', backgroundColor: '#2563eb', paddingVertical: 10, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  detailsBtnText: { color: 'white', marginRight: 6, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  modalInput: { backgroundColor: '#f3f4f6', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#ddd', marginBottom: 10, textAlign: 'right' },
  label: { fontWeight: 'bold', marginTop: 10, marginBottom: 4, textAlign: 'right' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  cancelButton: { backgroundColor: '#e5e7eb', padding: 10, borderRadius: 8, flex: 1, marginLeft: 8 },
  cancelText: { textAlign: 'center', color: '#374151', fontWeight: 'bold' },
  saveButton: { backgroundColor: '#22c55e', padding: 10, borderRadius: 8, flex: 1, marginRight: 8 },
  saveButtonDisabled: { backgroundColor: '#9ca3af' },
  saveText: { textAlign: 'center', color: 'white', fontWeight: 'bold' },
  managementHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  backButton: { padding: 4 },
  managementTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  managementContent: { flex: 1, padding: 16 },
  managementItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  itemType: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
  quantityContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  quantityLabel: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  quantityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, marginRight: 4, minWidth: 32, justifyContent: 'center', alignItems: 'center' },
  quantityValue: { color: 'white', fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
  itemActions: { flexDirection: 'row' },
  actionButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  sellButton: { backgroundColor: '#2563eb' },
  editButton: { backgroundColor: '#f59e0b' },
  availableText: { fontSize: 14, color: '#6b7280', marginVertical: 8, textAlign: 'right' },
  availableValue: { fontWeight: 'bold', color: '#22c55e' },
  repoScroll: { marginBottom: 16 },
  repoChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f3f4f6', marginRight: 8, borderWidth: 1, borderColor: '#ddd' },
  repoChipSelected: { backgroundColor: '#2563eb', borderColor: '#1d4ed8' },
  repoChipText: { fontSize: 13, color: '#374151' },
  repoChipTextSelected: { color: 'white', fontWeight: '600' },
});