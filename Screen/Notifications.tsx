// src/screens/Notifications.tsx
import { commonStyles, scaledSize, scaledPadding } from 'styles/commonStyles';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MainLayout from '../component/MainLayout';
import RefreshableScreen from '../component/RefreshableScreen';
import { API_BASE_URL } from './api2';
import { getStatusBarHeight } from 'react-native-status-bar-height';
import AppLoader from '../component/AppLoader';

const { width, height } = Dimensions.get('window');

// must match MainLayout.tsx
type UserType = 'admin' | 'employee' | 'shared';

// mirror your Django serializer fields
interface Notification {
  id: number;
  message: string;
  time: string;
  createAt:string;
  date: string;
  type: 'اضافة' | 'حجز' | 'الغاء حجز' | 'تسليم' | 'تعديل' | 'تنبيه';
  is_read: boolean;
  details?: string;
}

// Arabic month names
const ARABIC_MONTHS = [
  'كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران',
  'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'
];

// Function to format the timestamp in a user-friendly Arabic way
const formatTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const notificationDate = new Date(timestamp);
  const diffInMs = now.getTime() - notificationDate.getTime();
  
  // Convert to different time units
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);
  
  // Return appropriate string based on time difference
  if (diffInSeconds < 60) {
    return 'الآن';
  } else if (diffInMinutes < 60) {
    if (diffInMinutes === 1) return 'منذ دقيقة';
    if (diffInMinutes === 2) return 'منذ دقيقتين';
    if (diffInMinutes > 2 && diffInMinutes < 11) return `منذ ${diffInMinutes} دقائق`;
    return `منذ ${diffInMinutes} دقيقة`;
  } else if (diffInHours < 24) {
    if (diffInHours === 1) return 'منذ ساعة';
    if (diffInHours === 2) return 'منذ ساعتين';
    if (diffInHours > 2 && diffInHours < 11) return `منذ ${diffInHours} ساعات`;
    return `منذ ${diffInHours} ساعة`;
  } else if (diffInDays < 7) {
    if (diffInDays === 1) return 'منذ يوم';
    if (diffInDays === 2) return 'منذ يومين';
    if (diffInDays > 2 && diffInDays < 11) return `منذ ${diffInDays} أيام`;
    return `منذ ${diffInDays} يوم`;
  } else if (diffInWeeks < 4) {
    if (diffInWeeks === 1) return 'منذ أسبوع';
    if (diffInWeeks === 2) return 'منذ أسبوعين';
    if (diffInWeeks > 2 && diffInWeeks < 11) return `منذ ${diffInWeeks} أسابيع`;
    return `منذ ${diffInWeeks} أسبوع`;
  } else if (diffInMonths < 12) {
    if (diffInMonths === 1) return 'منذ شهر';
    if (diffInMonths === 2) return 'منذ شهرين';
    if (diffInMonths > 2 && diffInMonths < 11) return `منذ ${diffInMonths} أشهر`;
    return `منذ ${diffInMonths} شهر`;
  } else if (diffInYears === 1) {
    return 'منذ سنة';
  } else if (diffInYears === 2) {
    return 'منذ سنتين';
  } else if (diffInYears > 2 && diffInYears < 11) {
    return `منذ ${diffInYears} سنوات`;
  } else {
    // For dates older than a year, show the full date
    const day = notificationDate.getDate();
    const month = ARABIC_MONTHS[notificationDate.getMonth()];
    const year = notificationDate.getFullYear();
    return `${day} ${month} ${year}`;
  }
};

const Notificationss: React.FC = () => {
  const [userType, setUserType] = useState<UserType>('shared');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const { width: windowWidth, height: windowHeight, fontScale } = useWindowDimensions();
  
  // Responsive scaling factors
  const scale = Math.min(windowWidth / 375, windowHeight / 812); // Base on iPhone 13 dimensions
  const scaledSize = (size: number) => Math.round(size * scale);
  const scaledPadding = (padding: number) => Math.round(padding * scale);

  // load userType
  useEffect(() => {
    (async () => {
      const stored = (await AsyncStorage.getItem('userType')) as UserType;
      if (stored) setUserType(stored);
    })();
  }, []);

  // fetch from /notification/
  const fetchNotifications = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/notification/`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setNotifications(data.notifications);
    } catch (e) {
      console.error(e);
      Alert.alert('خطأ', 'فشل في جلب الإشعارات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (userType) {
      fetchNotifications();
    }
  }, [userType, fetchNotifications]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
  }, [fetchNotifications]);

  // mark read
  const markAsRead = useCallback((id: number) =>
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      )
    ), []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // UI helpers
  const getNotificationColor = useCallback((type: Notification['type']) => {
    switch (type) {
      case 'اضافة':
        return { backgroundColor: '#E9D5FF', color: '#6B21A8' };
      case 'حجز':
        return { backgroundColor: '#DBEAFE', color: '#1E40AF' };
      case 'الغاء حجز':
        return { backgroundColor: '#FECACA', color: '#991B1B' };
      case 'تسليم':
        return { backgroundColor: '#D1FAE5', color: '#065F46' };
      case 'تعديل':
        return { backgroundColor: '#FED7AA', color: '#C2410C' };
      case 'تنبيه':
        return { backgroundColor: '#FFF7ED', color: '#C2410C' };
      default:
        return { backgroundColor: '#F3F4F6', color: '#374151' };
    }
  }, []);

  const getNotificationIcon = useCallback((type: Notification['type']): string => {
    switch (type) {
      case 'اضافة':
        return '➕';
      case 'حجز':
        return '📝';
      case 'الغاء حجز':
        return '❌';
      case 'تسليم':
        return '✅';
      case 'تعديل':
        return '✏️';
      case 'تنبيه':
        return '⚠️';
      default:
        return '📋';
    }
  }, []);

  // Responsive styles
  const responsiveStyles = StyleSheet.create({
   
    subtitle: {
      fontSize: scaledSize(14),
      color: '#e0f2fe',
      textAlign: 'right',
      marginTop: scaledPadding(4),
      includeFontPadding: false,
    },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: scaledPadding(40),
      backgroundColor: '#f8fafc',
      borderRadius: scaledSize(12),
      minHeight: scaledSize(200),
    },
    loadingText: {
      marginTop: scaledPadding(16),
      fontSize: scaledSize(16),
      color: '#3b82f6',
      fontWeight: '500',
      textAlign: 'right',
      includeFontPadding: false,
    },
    notificationsContainer: {
      flex: 1,
    },
    card: {
      backgroundColor: '#fff',
      padding: scaledPadding(16),
      marginBottom: scaledPadding(12),
      borderRadius: scaledSize(12),
      borderWidth: 1,
      borderColor: '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: scaledSize(2) },
      shadowOpacity: 0.05,
      shadowRadius: scaledSize(4),
      elevation: 2,
      minHeight: scaledSize(100),
    },
    unreadCard: {
      borderLeftWidth: scaledSize(4),
      borderLeftColor: '#3b82f6',
      backgroundColor: '#f0f9ff',
    },
    cardHeader: {
      flexDirection: 'row-reverse',
      alignItems: 'flex-start',
      gap: scaledPadding(12),
    },
    icon: {
      fontSize: scaledSize(20),
      marginTop: scaledPadding(2),
      minWidth: scaledSize(24),
    },
    cardRow: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: scaledPadding(8),
      flexWrap: 'wrap',
      gap: scaledPadding(8),
    },
    badge: {
      paddingHorizontal: scaledPadding(12),
      paddingVertical: scaledPadding(4),
      borderRadius: scaledSize(12),
      maxWidth: '60%',
    },
    badgeText: {
      fontSize: scaledSize(12),
      fontWeight: '600',
      textAlign: 'right',
      includeFontPadding: false,
    },
    date: {
      alignItems: 'flex-end',
      minWidth: scaledSize(80),
    },
    dateText: {
      fontSize: scaledSize(12),
      color: '#64748b',
      textAlign: 'right',
      includeFontPadding: false,
    },
    message: {
      fontSize: scaledSize(14),
      color: '#475569',
      textAlign: 'right',
      lineHeight: scaledSize(20),
      marginBottom: scaledPadding(8),
      includeFontPadding: false,
    },
    unreadMessage: {
      color: '#1e293b',
      fontWeight: '500',
    },
    details: {
      fontSize: scaledSize(12),
      color: '#64748b',
      textAlign: 'right',
      fontStyle: 'italic',
      marginBottom: scaledPadding(8),
      includeFontPadding: false,
      lineHeight: scaledSize(18),
    },
    newIndicator: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: scaledPadding(6),
    },
    dot: {
      width: scaledSize(8),
      height: scaledSize(8),
      borderRadius: scaledSize(4),
      backgroundColor: '#3b82f6',
    },
    newText: {
      fontSize: scaledSize(12),
      color: '#3b82f6',
      fontWeight: '600',
      textAlign: 'right',
      includeFontPadding: false,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: scaledPadding(40),
      backgroundColor: '#f8fafc',
      borderRadius: scaledSize(12),
      marginTop: scaledPadding(20),
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
    <RefreshableScreen onRefresh={handleRefresh}>
      {/* ✅ Use commonStyles.container */}
      <View style={commonStyles.container}>
        {/* ✅ Use commonStyles.header and commonStyles.title */}
        <View style={commonStyles.header}>
          <Text style={commonStyles.title}>الإشعارات</Text>
          {/* Optional: <Text style={commonStyles.subtitle}>...</Text> */}
        </View>

        {/* Rest of content — use responsiveStyles for screen-specific parts */}
           {loading ? (
        <AppLoader />
      ) : (
            <View style={responsiveStyles.notificationsContainer}>
              {notifications.length > 0 ? (
                notifications.map((n) => {
                  const col = getNotificationColor(n.type);
                  return (
                    <TouchableOpacity
                      key={n.id}
                      onPress={() => markAsRead(n.id)}
                    >
                      <View
                        style={[
                          responsiveStyles.card,
                          !n.is_read && responsiveStyles.unreadCard,
                        ]}
                      >
                        <View style={responsiveStyles.cardHeader}>
                          <Text style={responsiveStyles.icon}>
                            {getNotificationIcon(n.type)}
                          </Text>
                          <View style={{ flex: 1 }}>
                            <View style={responsiveStyles.cardRow}>
                              <View style={[responsiveStyles.badge, { backgroundColor: col.backgroundColor }]}>
                                <Text style={[responsiveStyles.badgeText, { color: col.color }]}>
                                  {n.type}
                                </Text>
                              </View>
                              <View style={responsiveStyles.date}>
                                <Text style={responsiveStyles.dateText}>
                                  {n.time}
                                </Text>
                                <Text style={responsiveStyles.dateText}>
                                  {n.date}
                                </Text>
                              </View>
                            </View>
                            <Text
                              style={[
                                responsiveStyles.message,
                                !n.is_read && responsiveStyles.unreadMessage,
                              ]}
                            >
                              {n.message}
                            </Text>
                            {n.details && (
                              <Text style={responsiveStyles.details}>
                                {n.details}
                              </Text>
                            )}
                            
                              <View style={responsiveStyles.newIndicator}>
                                <View style={responsiveStyles.dot} />
                                <Text style={responsiveStyles.newText}>
                                  {formatTimeAgo(n.createAt)}
                                </Text>
                              </View>
                            
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={responsiveStyles.emptyState}>
                  <View style={responsiveStyles.emptyIcon}>
                    <Text style={{ fontSize: scaledSize(28) }}>📋</Text>
                  </View>
                  <Text style={responsiveStyles.emptyText}>لا توجد إشعارات</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </RefreshableScreen>
    </MainLayout>
  );
};

export default Notificationss;