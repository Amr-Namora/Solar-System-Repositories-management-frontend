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
import AppLoader from '../component/AppLoader';
import { commonStyles } from '../styles/commonStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import {
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome5,
} from '@expo/vector-icons';

import { GradientCard } from '../component/GradientCard';
import { StatCard } from '../component/StatCard';
import MainLayout from '../component/MainLayout';
import { API_BASE_URL } from './api2';
import RefreshableScreen from '../component/RefreshableScreen'; // ✅ Import your component

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface MaterialItem {
  type: string;
  reserved?: boolean;
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

const Index: React.FC = () => {
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
  // ❌ REMOVED: const [refreshing, setRefreshing] = useState(false);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({});
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

      const response = await fetch(`${API_BASE_URL}/home/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch home data');

      const data: HomeApiResponse = await response.json();

      const materialsData = data.serialize.map((item: any, index: number) => ({
        id: index + 1,
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
    }
  };

  const fetchProductTypes = async (materialName: string, materialId: number) => {
    try {
      setMaterials(prev => prev.map(m =>
        m.id === materialId ? { ...m, loadingDetails: true } : m
      ));

      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('No token found');

      const response = await fetch(
        `${API_BASE_URL}/product_types/?product_name=${encodeURIComponent(materialName)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch product types');

      const data: ProductTypesResponse = await response.json();

      const itemsData = data.serialize.map((item: { type: string }) => ({
        type: item.type,
        reserved: false,
        details: [],
        loadingDetails: false
      }));

      setMaterials(prev => prev.map(m =>
        m.id === materialId ? { ...m, items: itemsData, loadingDetails: false } : m
      ));
    } catch (e) {
      console.error('Error fetching product types:', e);
      Alert.alert('خطأ', 'فشل في تحميل تفاصيل المادة');

      setMaterials(prev => prev.map(m =>
        m.id === materialId ? { ...m, loadingDetails: false } : m
      ));
    }
  };

  const fetchProductDetails = async (materialId: number, itemIndex: number, productName: string, productClass: string) => {
    try {
      setMaterials(prev => prev.map(m => {
        if (m.id === materialId && m.items) {
          const updatedItems = [...m.items];
          updatedItems[itemIndex] = {
            ...updatedItems[itemIndex],
            loadingDetails: true
          };
          return { ...m, items: updatedItems };
        }
        return m;
      }));

      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('No token found');

      const response = await fetch(
        `${API_BASE_URL}/product_details/?product_name=${encodeURIComponent(productName)}&product_class=${encodeURIComponent(productClass)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch product details');

      const data: ProductDetailsResponse = await response.json();

      setMaterials(prev => prev.map(m => {
        if (m.id === materialId && m.items) {
          const updatedItems = [...m.items];
          updatedItems[itemIndex] = {
            ...updatedItems[itemIndex],
            details: data.serialize,
            loadingDetails: false
          };
          return { ...m, items: updatedItems };
        }
        return m;
      }));
    } catch (e) {
      console.error('Error fetching product details:', e);
      Alert.alert('خطأ', 'فشل في تحميل تفاصيل المنتج');

      setMaterials(prev => prev.map(m => {
        if (m.id === materialId && m.items) {
          const updatedItems = [...m.items];
          updatedItems[itemIndex] = {
            ...updatedItems[itemIndex],
            loadingDetails: false
          };
          return { ...m, items: updatedItems };
        }
        return m;
      }));
    }
  };

  // ✅ Updated: Removed setRefreshing, made async to await fetches
  const onRefresh = async () => {
    await fetchSettings();
    await fetchHomeData();
  };

  const toggleExpand = async (material: Material) => {
    const isExpanded = expandedIds.includes(material.id);

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    if (isExpanded) {
      setExpandedIds((prev) => prev.filter((i) => i !== material.id));
    } else {
      setExpandedIds((prev) => [...prev, material.id]);

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
      setExpandedItems(prev => ({
        ...prev,
        [key]: false
      }));
    } else {
      setExpandedItems(prev => ({
        ...prev,
        [key]: true
      }));

      const material = materials.find(m => m.id === materialId);
      if (material && material.items && material.items[itemIndex]) {
        const item = material.items[itemIndex];

        if (!item.details || item.details.length === 0) {
          await fetchProductDetails(materialId, itemIndex, materialName, itemType);
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

  const materialColors = [
    '#3b82f6', // Blue
    '#22c55e', // Green
    '#f97316', // Orange
  ];

  const getMaterialColor = (id: number) => {
    return materialColors[id % materialColors.length];
  };

  return (
    <MainLayout userType="admin">
      {loading ? (
        <AppLoader />
      ) : (
        <RefreshableScreen onRefresh={onRefresh}>
          <View style={commonStyles.container}>
            <View style={commonStyles.header}>
              <Text style={commonStyles.title}>لوحة التحكم</Text>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <GradientCard
                title="قائمة المواد"
                desc="عرض جميع الاحصائيات"
                icon="list"
                gradient={['#6370a8ff', '#1432b8ff']}
                onPress={() => navigation.navigate('AdminDashboard' as never)}
              />
              <GradientCard
                title="إدارة المواد"
                desc="إضافة وتعديل المواد"
                icon="box"
                gradient={['#3b82f6', '#2563eb']}
                onPress={() => navigation.navigate('MainMaterial' as never)}
              />
              <GradientCard
                title="الإشعارات"
                desc="عرض الإشعارات والتنبيهات"
                icon="bell" // ✅ Changed to FontAwesome5 'bell'
                gradient={['#6366f1', '#4f46e5']}
                onPress={() => navigation.navigate('Notifications' as never)}
              />
              <GradientCard
                title="الحجوزات"
                desc="إدارة طلبات الحجز"
                icon="calendar-check" // ✅ Keep — already works
                gradient={['#8b5cf6', '#6d0b7a']}
                onPress={() => navigation.navigate('Reservations' as never)}
              />
             
              <GradientCard
                title="إدارة الورشات"
                desc="عرض وإضافة الورشات"
                icon="wrench"
                gradient={['#8b5cf6', '#7c3aed']}
                onPress={() => navigation.navigate('Workshops' as never)}
              />
                <GradientCard
                title="إدارة الفواتير"
                desc="عرض جميع العمليات"
                icon="receipt"
                gradient={['rgb(81, 28, 240)', '#8c71f0']}
                onPress={() => navigation.navigate('Customer' as never)}
              />
              {settings.is_boss && (
                <>
                                
                  <GradientCard
                    title="إدارة المستخدمين"
                    desc="عرض وإضافة مستخدمين"
                    icon="users"
                    gradient={['#7122c5', '#531580']}
                    onPress={() => navigation.navigate('AdminUsers' as never)}
                  />
                  <GradientCard
                    title="إدارة المتاجر"
                    desc="عرض وإضافة المتاجر"
                    icon="store"
                    gradient={['#6366f1', '#4f46e5']}
                    onPress={() => navigation.navigate('AdminStores' as never)}
                  />
                  <GradientCard
                    title="إدارة المستودعات"
                    desc="عرض وإضافة المستودعات"
                    icon="warehouse"
                    gradient={['#6366f1', '#4f46e5']}
                    onPress={() => navigation.navigate('AdminReposotories' as never)}
                  />
                </>
              )}
               <GradientCard
                title="سجل العمليات"
                desc="عرض جميع العمليات"
                icon="history"
                gradient={['#1469b8', '#0f6076']}
                onPress={() => navigation.navigate('History' as never)}
              />
            </View>
          </View>
        </RefreshableScreen>
      )}
    </MainLayout>
  );
};

const styles = StyleSheet.create({

  section: { padding: 20 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1e3a8a', textAlign: 'right' },
  headerSubtitle: { fontSize: 12, color: '#475569', textAlign: 'right' },
  sectionHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'right',
  },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-around', paddingHorizontal: 12, gap: 12 },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 12,
    justifyContent: 'center'
  },

  /* Material-specific styles (kept for future expansion) */
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

export default Index;