// src/screens/Notifications.tsx
import { commonStyles } from '../styles/commonStyles';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  useWindowDimensions,
  FlatList,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MainLayout from '../component/MainLayout';
import { API_BASE_URL } from './api2';
import AppLoader from '../component/AppLoader';

const { width, height } = Dimensions.get('window');

type UserType = 'admin' | 'employee' | 'shared';

interface Notification {
  id: number;
  message: string;
  time: string;
  createAt: string;
  date: string;
  type: 'اضافة' | 'حجز' | 'الغاء حجز' | 'تسليم' | 'تعديل' | 'تنبيه';
  is_read: boolean;
  details?: string;
}

const ARABIC_MONTHS = [
  'كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران',
  'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'
];

const formatTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const notificationDate = new Date(timestamp);
  const diffInMs = now.getTime() - notificationDate.getTime();
  
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);
  
  if (diffInSeconds < 60) return 'الآن';
  if (diffInMinutes < 60) {
    if (diffInMinutes === 1) return 'منذ دقيقة';
    if (diffInMinutes === 2) return 'منذ دقيقتين';
    if (diffInMinutes > 2 && diffInMinutes < 11) return `منذ ${diffInMinutes} دقائق`;
    return `منذ ${diffInMinutes} دقيقة`;
  }
  if (diffInHours < 24) {
    if (diffInHours === 1) return 'منذ ساعة';
    if (diffInHours === 2) return 'منذ ساعتين';
    if (diffInHours > 2 && diffInHours < 11) return `منذ ${diffInHours} ساعات`;
    return `منذ ${diffInHours} ساعة`;
  }
  if (diffInDays < 7) {
    if (diffInDays === 1) return 'منذ يوم';
    if (diffInDays === 2) return 'منذ يومين';
    if (diffInDays > 2 && diffInDays < 11) return `منذ ${diffInDays} أيام`;
    return `منذ ${diffInDays} يوم`;
  }
  if (diffInWeeks < 4) {
    if (diffInWeeks === 1) return 'منذ أسبوع';
    if (diffInWeeks === 2) return 'منذ أسبوعين';
    if (diffInWeeks > 2 && diffInWeeks < 11) return `منذ ${diffInWeeks} أسابيع`;
    return `منذ ${diffInWeeks} أسبوع`;
  }
  if (diffInMonths < 12) {
    if (diffInMonths === 1) return 'منذ شهر';
    if (diffInMonths === 2) return 'منذ شهرين';
    if (diffInMonths > 2 && diffInMonths < 11) return `منذ ${diffInMonths} أشهر`;
    return `منذ ${diffInMonths} شهر`;
  }
  if (diffInYears === 1) return 'منذ سنة';
  if (diffInYears === 2) return 'منذ سنتين';
  if (diffInYears > 2 && diffInYears < 11) return `منذ ${diffInYears} سنوات`;
  
  const day = notificationDate.getDate();
  const month = ARABIC_MONTHS[notificationDate.getMonth()];
  const year = notificationDate.getFullYear();
  return `${day} ${month} ${year}`;
};

const Notificationss: React.FC = () => {
  const [userType, setUserType] = useState<UserType>('shared');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const scale = Math.min(windowWidth / 375, windowHeight / 812);
  const scaledSize = (size: number) => Math.round(size * scale);
  const scaledPadding = (padding: number) => Math.round(padding * scale);

  useEffect(() => {
    (async () => {
      const stored = (await AsyncStorage.getItem('userType')) as UserType;
      if (stored) setUserType(stored);
    })();
  }, []);

  const fetchNotifications = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      if (append) setLoadingMore(true);
      else if (!refreshing) setLoading(true);

      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/notification/?page=${page}&limit=${itemsPerPage}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      const fetchedNotifications = Array.isArray(data.notifications) ? data.notifications : [];
      
      if (append) {
        setNotifications((prev) => [...prev, ...fetchedNotifications]);
      } else {
        setNotifications(fetchedNotifications);
      }
      setHasMore(fetchedNotifications.length === itemsPerPage);

    } catch (e) {
      console.error(e);
      Alert.alert('خطأ', 'فشل في جلب الإشعارات');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [itemsPerPage, refreshing]);

  useEffect(() => {
    if (userType) {
      fetchNotifications(1, false);
    }
  }, [userType, fetchNotifications]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setCurrentPage(1);
    await fetchNotifications(1, false);
  }, [fetchNotifications]);

  const loadMoreNotifications = async () => {
    // Note: If you have a searchQuery active, don't paginate to avoid confusion
    if (loading || refreshing || loadingMore || !hasMore || searchQuery) return;
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    await fetchNotifications(nextPage, true);
  };

  const markAsRead = useCallback(async (id: number) => {
    try {
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/notification/${id}/mark_as_read/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: false } : n));
      }
    } catch (e) {
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: false } : n));
    }
  }, []);

  const getNotificationColor = useCallback((type: Notification['type']) => {
    switch (type) {
      case 'اضافة': return { backgroundColor: '#E9D5FF', color: '#6B21A8' };
      case 'حجز': return { backgroundColor: '#DBEAFE', color: '#1E40AF' };
      case 'الغاء حجز': return { backgroundColor: '#FECACA', color: '#991B1B' };
      case 'تسليم': return { backgroundColor: '#D1FAE5', color: '#065F46' };
      case 'تعديل': return { backgroundColor: '#FED7AA', color: '#C2410C' };
      case 'تنبيه': return { backgroundColor: '#FFF7ED', color: '#C2410C' };
      default: return { backgroundColor: '#F3F4F6', color: '#374151' };
    }
  }, []);

  const getNotificationIcon = useCallback((type: Notification['type']): string => {
    switch (type) {
      case 'اضافة': return '➕';
      case 'حجز': return '📝';
      case 'الغاء حجز': return '❌';
      case 'تسليم': return '✅';
      case 'تعديل': return '✏️';
      case 'تنبيه': return '⚠️';
      default: return '📋';
    }
  }, []);

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <ActivityIndicator size="small" color="#3b82f6" />
        <Text style={{ marginTop: 8, color: '#6b7280' }}>جاري تحميل المزيد...</Text>
      </View>
    );
  };

  const renderListHeader = () => {
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    return (
      <View>
        <View style={commonStyles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={commonStyles.title}>الإشعارات</Text>
            {/* {unreadCount > 0 && (
              <View style={{ backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>{unreadCount} جديد</Text>
              </View>
            )} */}
          </View>
        </View>

        {/* Search Bar */}
        <View style={responsiveStyles.searchContainer}>
            <TextInput
              style={responsiveStyles.searchInput}
              placeholder="ابحث عن إشعار..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
        </View>
      </View>
    );
  };

  if (loading && !refreshing && notifications.length === 0) {
    return <AppLoader />;
  }

  // Filter Data
  const filteredNotifications = notifications.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const messageType = (item.message || '').toLowerCase();
    const messageDetails = (item.details || '').toLowerCase();
    const messageTypeName = (item.type || '').toLowerCase();
    
    return (
      messageType.includes(query) ||
      messageDetails.includes(query) ||
      messageTypeName.includes(query)
    );
  });

  // Internal responsive styles based on scale
  const responsiveStyles = StyleSheet.create({
    searchContainer: {
      marginBottom: scaledPadding(16),
      marginHorizontal: scaledPadding(16),
      marginTop: scaledPadding(8),
    },
    searchInput: {
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderRadius: scaledSize(12),
      paddingHorizontal: scaledPadding(16),
      paddingVertical: scaledPadding(12),
      fontSize: scaledSize(14),
      textAlign: 'right',
      includeFontPadding: false,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: scaledSize(1) },
      shadowOpacity: 0.05,
      shadowRadius: scaledSize(2),
      elevation: 1,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: scaledPadding(40),
      backgroundColor: '#f8fafc',
      borderRadius: scaledSize(12),
      marginTop: scaledPadding(20),
      marginHorizontal: scaledPadding(16),
      minHeight: scaledSize(300),
    },
    emptyIcon: {
      backgroundColor: '#e0f2ff',
      padding: scaledPadding(16),
      borderRadius: scaledSize(30),
      marginBottom: scaledPadding(16),
      width: scaledSize(64),
      height: scaledSize(64),
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      fontSize: scaledSize(16),
      color: '#64748b',
      fontWeight: '500',
      textAlign: 'center',
      includeFontPadding: false,
    },
  });

  return (
    <MainLayout userType={userType}>
      <View style={[commonStyles.container, { flex: 1, paddingBottom: 0 }]}>
       <FlatList
  data={filteredNotifications}
  keyExtractor={(item) => item.id.toString()}
  
  // 1. أضف القوسين () لاستدعاء الدالة مباشرة بدل تمريرها كمرجع
  ListHeaderComponent={renderListHeader()} 
  
  // 2. أضف هذا السطر لمنع إغلاق الكيبورد عند النقر الخاطئ داخل القائمة
  keyboardShouldPersistTaps="handled" 
  
  onRefresh={handleRefresh}
  refreshing={refreshing}
  onEndReached={loadMoreNotifications}
  onEndReachedThreshold={0.5}
  ListFooterComponent={renderFooter}
  contentContainerStyle={{ paddingBottom: 20 }}
  // ... (احتفظ بباقي الخصائص كما هي لديك)
       
          ListEmptyComponent={
            !loadingMore ? (
              <View style={responsiveStyles.emptyState}>
                <View style={responsiveStyles.emptyIcon}>
                  <Text style={{ fontSize: scaledSize(28) }}>📭</Text>
                </View>
                <Text style={responsiveStyles.emptyText}>
                  {searchQuery ? 'لا توجد نتائج مطابقة' : 'لا توجد إشعارات'}
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const colors = getNotificationColor(item.type);
            return (
              <TouchableOpacity
                onPress={() => !item.is_read && markAsRead(item.id)}
                style={{
                  backgroundColor: item.is_read ? '#FFFFFF' : '#F8FAFC',
                  padding: scaledPadding(16),
                  marginHorizontal: scaledPadding(16),
                  marginVertical: scaledPadding(6),
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: item.is_read ? '#E2E8F0' : '#CBD5E1',
                  flexDirection: 'row-reverse',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <View style={{
                  width: scaledSize(48),
                  height: scaledSize(48),
                  borderRadius: 24,
                  backgroundColor: colors.backgroundColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: scaledPadding(12)
                }}>
                  <Text style={{ fontSize: scaledSize(20) }}>{getNotificationIcon(item.type)}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{
                      color: colors.color,
                      fontWeight: 'bold',
                      fontSize: scaledSize(14)
                    }}>
                      {item.type}
                    </Text>
                    <View style={{ alignItems: 'flex-end' }}>
                       <Text style={{ color: '#9CA3AF', fontSize: scaledSize(12) }}>
                         {formatTimeAgo(item.createAt || item.time)}
                       </Text>
                    </View>
                  </View>
                  <Text style={{
                    color: item.is_read ? '#4B5563' : '#111827',
                    fontWeight: item.is_read ? 'normal' : 'bold',
                    fontSize: scaledSize(14),
                    textAlign: 'right'
                  }}>
                    {item.message}
                  </Text>
                  {item.details && (
                    <Text style={{ color: '#6B7280', fontSize: scaledSize(13), marginTop: 4, textAlign: 'right' }}>
                      {item.details}
                    </Text>
                  )}
                </View>

                {!item.is_read && (
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#3B82F6', marginRight: 10 }} />
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </MainLayout>
  );
};

export default Notificationss;