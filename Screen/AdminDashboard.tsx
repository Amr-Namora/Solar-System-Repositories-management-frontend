import React, { useEffect, useState } from 'react';
import {
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { commonStyles } from '../styles/commonStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import AppLoader from '../component/AppLoader';
import {
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome5,
} from '@expo/vector-icons';

import MainLayout from '../component/MainLayout';
import RefreshableScreen from '../component/RefreshableScreen'; // Import RefreshableScreen
import { API_BASE_URL } from './api2';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface MaterialItem {
  id: number;
  type: string;
  reserved?: boolean;
  details?: ProductDetail[];
  loadingDetails?: boolean;
  available_amount: string;
}

interface Material {
  id: number;
  name: string;
  amount: number;
  details?: string;
  items?: MaterialItem[];
  loadingDetails?: boolean;
}

interface SettingsResponse {
  history: any[];
  reserved: number;
  total: number;
  materials: number;
  non_approved_reservations: number;
  is_boss?: boolean;
}

interface HomeApiResponse {
  serialize: any[];
  is_boss: boolean;
  total: number;
  available: number;
  on_way: number;
}

interface ProductTypesResponse {
  serialize: { type: string }[];
  is_boss: boolean;
}

interface ProductDetail {
  id: number;
  amount: number;
  is_available: string;
  description: string;
  name: string;
  type: string;
}

interface ProductDetailsResponse {
  serialize: ProductDetail[];
  is_boss: boolean;
}

const AdminDashboard: React.FC = () => {
  const [settings, setSettings] = useState<SettingsResponse>({
    history: [],
    reserved: 0,
    total: 0,
    materials: 0,
    non_approved_reservations: 0,
    is_boss: false,
  });
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [expandedItems, setExpandedItems] = useState<{[key: string]: boolean}>({});
  const navigation = useNavigation();

  useEffect(() => {
    AsyncStorage.getItem('userType').then((stored) => {
      if (stored !== 'admin') {
        navigation.navigate('Home' as never);
      } else {
        fetchSettings();
        fetchHomeData();
      }
    });
  }, []);

  const fetchSettings = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/settings/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch settings');
      const data: SettingsResponse = await res.json();
      setSettings(data);
    } catch (e) {
      console.error('Error fetching settings:', e);
    }
  };

  const fetchHomeData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('No token found');
      
      const response = await fetch(`${API_BASE_URL}/homeRead/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('Failed to fetch home data');
      
      const data: HomeApiResponse = await response.json();
      
      // Map API data to our material structure
      const materialsData = data.serialize.map((item: any, index: number) => ({
        id: item.id,
        name: item.name,
        amount: (item.total_available || 0) + (item.total_on_way || 0),
        details: item.description,
        items: [],
        loadingDetails: false
      }));

      setMaterials(materialsData);
    } catch (e) {
      console.error('Error fetching home data:', e);
      Alert.alert('خطأ', 'فشل في تحميل البيانات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchProductTypes = async (materialName, materialId) => {
    try {
      // Set loading state for this material
      setMaterials(prev => prev.map(m => 
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
      
      // Map API data to our material items structure with available amount
      const itemsData = data.serialize.map((item) => ({
        id: item.id,
        type: item.type,
        available_amount: item.available_amount || 0, // Add available amount
        reserved: false,
        details: [],
        loadingDetails: false
      }));
  
      // Update the material with the fetched items
      setMaterials(prev => prev.map(m => 
        m.id === materialId ? {...m, items: itemsData, loadingDetails: false} : m
      ));

    } catch (e) {
      console.error('Error fetching product types:', e);
      Alert.alert('خطأ', 'فشل في تحميل تفاصيل المادة');
      
      // Reset loading state on error
      setMaterials(prev => prev.map(m => 
        m.id === materialId ? {...m, loadingDetails: false} : m
      ));
    }
  };

  const fetchProductDetails = async (materialId: number, itemIndex: number, classId: number, productClass: string) => {
    try {
      // Set loading state for this item
      setMaterials(prev => prev.map(m => {
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
      
      const data: ProductDetailsResponse = await response.json();
      
      // Update the item with the fetched details
      setMaterials(prev => prev.map(m => {
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
      
      // Reset loading state on error
      setMaterials(prev => prev.map(m => {
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

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchSettings(), fetchHomeData()]);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const toggleExpand = async (material: Material) => {
    const isExpanded = expandedIds.includes(material.id);
    
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    if (isExpanded) {
      // If already expanded, collapse it
      setExpandedIds((prev) => prev.filter((i) => i !== material.id));
    } else {
      // If not expanded, expand it and fetch details if not already loaded
      setExpandedIds((prev) => [...prev, material.id]);
      
      // Fetch product types if items are empty
      if (!material.items || material.items.length === 0) {
        await fetchProductTypes(material.name, material.id);
      }
    }
  };

  const toggleItemExpand = async (materialId: number, itemIndex: number, materialName: string, itemType: string) => {
    const key = `${materialId}-${itemIndex}`;
    const isExpanded = expandedItems[key];
    
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    if (isExpanded) {
      // If already expanded, collapse it
      setExpandedItems(prev => ({
        ...prev,
        [key]: false
      }));
    } else {
      // If not expanded, expand it
      setExpandedItems(prev => ({
        ...prev,
        [key]: true
      }));
      
      // Get the material and item
      const material = materials.find(m => m.id === materialId);
      if (material && material.items && material.items[itemIndex]) {
        const item = material.items[itemIndex];
        
        // Fetch product details if not already loaded
        if (!item.details || item.details.length === 0) {
          await fetchProductDetails(materialId, itemIndex, item.id, itemType);
        }
      }
    }
  };

  const stats = {
    totalMaterials: settings.materials,
    totalEmployees: settings.total,
    pendingReservations: settings.reserved,
    totalValue: settings.non_approved_reservations,
  };

  // Array of colors for material cards
  const materialColors = [
    '#3b82f6', // Blue
    '#22c55e', // Green
    '#f97316', // Orange
  ];

  // Get a color based on material id
  const getMaterialColor = (id: number) => {
    return materialColors[id % materialColors.length];
  };

  if (loading) {
      return (
    <MainLayout userType="admin">
      <AppLoader />
    </MainLayout>
  );
}
  return (
     <MainLayout userType="admin">
        <RefreshableScreen onRefresh={handleRefresh}>
          <View style={commonStyles.container}>
            <View style={commonStyles.header}>
              <Text style={commonStyles.title}>الاحصائيات</Text>
            </View>

          {/* Materials List */}
          <View style={styles.section}>
            {materials.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="package-variant-closed" size={48} color="#9ca3af" />
                <Text style={styles.emptyStateText}>لا توجد مواد متاحة</Text>
              </View>
            ) : (
              materials.map((material) => {
                const isExpanded = expandedIds.includes(material.id);
                const materialColor = getMaterialColor(material.id);
                
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
                        <Text style={styles.materialName}>{material.name}</Text>
                        {material.details && (
                          <Text style={styles.materialDetails}>{material.details}</Text>
                        )}
                      </View>
                      <View style={styles.amountContainer}>
                        <View style={[styles.amountBadge, { backgroundColor: materialColor }]}>
                          <Text style={styles.amountText}>{material.amount}</Text>
                        </View>
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
                                  onPress={() => toggleItemExpand(material.id, idx, material.name, item.type)}
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
                            <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#94a3b8" />
                            <Text style={styles.noItemsText}>لا توجد عناصر لهذه المادة</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </View>
      </RefreshableScreen>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
 
  section: { padding: 20 },

  /* Material Card Styles */
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
  materialDetails: { 
    fontSize: 14, 
    color: '#64748b', 
    textAlign: 'right',
    lineHeight: 20,
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
  itemRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
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
  detailTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
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
  detailDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'right',
    lineHeight: 22,
    marginBottom: 16,
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
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loader: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
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
  noItems: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  noItemsText: {
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    marginTop: 20,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
    textAlign: 'center',
  },
});

export default AdminDashboard;