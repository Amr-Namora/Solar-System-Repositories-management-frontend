// StoreMaterials.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  LayoutAnimation,
  UIManager,
  Platform,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MaterialCommunityIcons,
  Ionicons,
} from '@expo/vector-icons';
import { API_BASE_URL } from './api2';
import { commonStyles } from '../styles/commonStyles';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Store {
  id: number;
  name: string;
  location: string;
}

interface ProductDetail {
  id: number;
  amount: number;
  is_available: string;
  description: string;
  name: string;
  type: string;
}

interface MaterialItem {
  id: number;
  type: string;
  available_amount: string;
  details?: ProductDetail[];
  loadingDetails?: boolean;
}

interface Material {
  id: number;
  name: string;
  amount: number;
  details?: string;
  items?: MaterialItem[];
  loadingDetails?: boolean;
}

interface ProductDetailsResponse {
  serialize: ProductDetail[];
  is_boss: boolean;
}

interface ProductTypesResponse {
  serialize: { id: number; type: string; available_amount: string }[];
  is_boss: boolean;
}

interface HomeApiResponse {
  serialize: {
    id: number;
    name: string;
    description?: string;
    total_available: number;
    total_on_way: number;
  }[];
  is_boss: boolean;
  total: number;
  available: number;
  on_way: number;
}

interface StoreMaterialsProps {
  store: Store;
  onClose: () => void;
}

const StoreMaterials: React.FC<StoreMaterialsProps> = ({ store, onClose }) => {
  // 🔒 Guard against null/undefined store
  if (!store) {
    return null;
  }

  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetchStoreMaterials();
  }, [store.id]);

  const fetchStoreMaterials = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('لم يتم العثور على رمز المصادقة');

      const response = await fetch(`${API_BASE_URL}/home/?reposotory_name=${store.name}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('فشل في جلب مواد المتجر');

      const data: HomeApiResponse = await response.json();

      const materialsData = data.serialize.map((item) => ({
        id: item.id,
        name: item.name,
        amount: (item.total_available || 0) + (item.total_on_way || 0),
        details: item.description,
        items: [],
        loadingDetails: false,
      }));

      setMaterials(materialsData);
    } catch (error) {
      console.error('Error fetching store materials:', error);
      Alert.alert('خطأ', error.message || 'فشل في تحميل مواد المتجر');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductTypes = async (materialId: number) => {
    try {
      setMaterials((prev) =>
        prev.map((m) => (m.id === materialId ? { ...m, loadingDetails: true } : m))
      );

      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('لم يتم العثور على رمز المصادقة');

      const response = await fetch(
        `${API_BASE_URL}/product_types/?product_id=${encodeURIComponent(materialId)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error('فشل في جلب أنواع المنتجات');

      const data: ProductTypesResponse = await response.json();

      const itemsData = data.serialize.map((item) => ({
        id: item.id,
        type: item.type,
        available_amount: item.available_amount || '0',
        details: [],
        loadingDetails: false,
      }));

      setMaterials((prev) =>
        prev.map((m) => (m.id === materialId ? { ...m, items: itemsData, loadingDetails: false } : m))
      );
    } catch (error) {
      console.error('Error fetching product types:', error);
      Alert.alert('خطأ', error.message || 'فشل في تحميل أنواع المنتجات');
      setMaterials((prev) =>
        prev.map((m) => (m.id === materialId ? { ...m, loadingDetails: false } : m))
      );
    }
  };

  const fetchProductDetails = async (materialId: number, itemIndex: number, classId: number) => {
    try {
      setMaterials((prev) => {
        const updated = [...prev];
        const mat = updated.find((m) => m.id === materialId);
        if (mat && mat.items) {
          mat.items[itemIndex] = { ...mat.items[itemIndex], loadingDetails: true };
        }
        return updated;
      });

      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('لم يتم العثور على رمز المصادقة');

      const response = await fetch(
        `${API_BASE_URL}/product_details/?class_id=${encodeURIComponent(String(classId))}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error('فشل في جلب تفاصيل المنتج');

      const data: ProductDetailsResponse = await response.json();

      setMaterials((prev) => {
        const updated = [...prev];
        const mat = updated.find((m) => m.id === materialId);
        if (mat && mat.items) {
          mat.items[itemIndex] = {
            ...mat.items[itemIndex],
            details: data.serialize,
            loadingDetails: false,
          };
        }
        return updated;
      });
    } catch (error) {
      console.error('Error fetching product details:', error);
      Alert.alert('خطأ', error.message || 'فشل في تحميل تفاصيل المنتج');
      setMaterials((prev) => {
        const updated = [...prev];
        const mat = updated.find((m) => m.id === materialId);
        if (mat && mat.items) {
          mat.items[itemIndex] = { ...mat.items[itemIndex], loadingDetails: false };
        }
        return updated;
      });
    }
  };

  const toggleExpand = async (material: Material) => {
    const isExpanded = expandedIds.includes(material.id);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    if (isExpanded) {
      setExpandedIds((prev) => prev.filter((id) => id !== material.id));
    } else {
      setExpandedIds((prev) => [...prev, material.id]);
      if (!material.items || material.items.length === 0) {
        await fetchProductTypes(material.id);
      }
    }
  };

  const toggleItemExpand = async (materialId: number, itemIndex: number, classId: number, itemType: string) => {
    const key = `${materialId}-${itemIndex}`;
    const isExpanded = expandedItems[key];
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    if (isExpanded) {
      setExpandedItems((prev) => ({ ...prev, [key]: false }));
    } else {
      setExpandedItems((prev) => ({ ...prev, [key]: true }));
      const material = materials.find((m) => m.id === materialId);
      if (material && material.items && material.items[itemIndex]) {
        const item = material.items[itemIndex];
        if (!item.details || item.details.length === 0) {
          await fetchProductDetails(materialId, itemIndex, classId);
        }
      }
    }
  };

  const materialColors = ['#2563eb', '#22c55e', '#f97316'];
  const getMaterialColor = (id: number) => materialColors[id % materialColors.length];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>جاري تحميل مواد المتجر...</Text>
      </View>
    );
  }

  // 🔒 Extra safety: ensure materials is defined
  if (!materials) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>جاري تحميل البيانات...</Text>
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      {/* Header */}
      <View style={commonStyles.header}>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#1e3a8a" />
        </TouchableOpacity>
        <Text style={commonStyles.title}>مواد المتجر: {store.name}</Text>
      </View>

      {/* Materials List */}
      <ScrollView style={styles.section}>
        {materials.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="package-variant-closed" size={48} color="#9ca3af" />
            <Text style={styles.emptyStateText}>لا توجد مواد متاحة في هذا المتجر</Text>
          </View>
        ) : (
          materials.map((material) => {
            const isExpanded = expandedIds.includes(material.id);
            const materialColor = getMaterialColor(material.id);

            return (
              <View
                key={material.id}
                style={[
                  styles.materialCard,
                  isExpanded && styles.expandedCard,
                  { borderLeftColor: materialColor, borderLeftWidth: 4 },
                ]}
              >
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
                        <Text style={styles.loadingTextSmall}>جاري تحميل الأنواع...</Text>
                      </View>
                    ) : material.items && material.items.length > 0 ? (
                      material.items.map((item, idx) => {
                        const itemKey = `${material.id}-${idx}`;
                        const isItemExpanded = expandedItems[itemKey];

                        return (
                          <View key={idx} style={[styles.itemCard, { borderLeftColor: materialColor }]}>
                            <TouchableOpacity
                              style={[styles.itemRow, isItemExpanded && styles.itemRowExpanded]}
                              onPress={() => toggleItemExpand(material.id, idx, item.id, item.type)}
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
                                  <Text
                                    style={[
                                      styles.itemAvailable,
                                      { color: '#64748b', fontSize: 14, marginTop: 4 },
                                    ]}
                                  >
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
                                    <View
                                      key={detailIdx}
                                      style={[styles.detailCard, { borderLeftColor: materialColor }]}
                                    >
                                      <View style={styles.detailHeader}>
                                        <View
                                          style={[
                                            styles.statusBadge,
                                            detail.is_available === 'متاح' && { backgroundColor: '#22c55e' },
                                            detail.is_available === 'قيد الوصول' && { backgroundColor: '#f97316' },
                                            detail.is_available === 'محجوز' && { backgroundColor: '#ef4444' },
                                            detail.is_available === 'مخفي' && { backgroundColor: '#64748b' },
                                          ]}
                                        >
                                          <Text style={styles.statusText}>{detail.is_available}</Text>
                                        </View>
                                      </View>

                                      <View style={styles.detailFooter}>
                                        <View style={styles.quantityContainer}>
                                          <Text style={styles.quantityLabel}>الكمية:</Text>
                                          <Text style={[styles.quantityValue, { color: materialColor }]}>
                                            {detail.amount}
                                          </Text>
                                        </View>
                                      </View>
                                    </View>
                                  ))
                                ) : (
                                  <View style={styles.noDetails}>
                                    <MaterialCommunityIcons
                                      name="information-outline"
                                      size={24}
                                      color="#94a3b8"
                                    />
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
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6b7280',
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
    marginRight: 12,
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
    color: '#FFF',
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
  itemAvailable: {
    fontSize: 14,
    color: '#64748b',
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
    justifyContent: 'center',
  },
  loadingTextSmall: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748b',
  },
});

export default StoreMaterials;