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
  useWindowDimensions,
  Dimensions
} from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import MainLayout from '../component/MainLayout';
import RefreshableScreen from '../component/RefreshableScreen';
import { API_BASE_URL } from './api2';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStatusBarHeight } from 'react-native-status-bar-height';
import { commonStyles } from '../styles/commonStyles';
import AppLoader from '../component/AppLoader';

I18nManager.forceRTL(true);

interface HistoryRecord {
  id: number;
  type: 'sent'|'reservation' | 'delivery' | 'cancellation' | 'material_add' | 'material_remove' | 'user_add'|'edit_name'|'delete';
  description: string;
  userName: string;
  itemName?: string;
  quantity?: number;
  date: string;
  time: string;
  status: 'completed' | 'cancelled';
}
const typeOptions = [
  { value: 'all', label: 'جميع العمليات' },
  { value: 'اضافة كمية', label: 'اضافة كمية' },
  { value: 'اضافة مادة', label: 'اضافة مادة' },
  { value: 'اضافة نوع من مادة', label: 'اضافة نوع من مادة' },
  { value: 'حجز', label: 'حجز' },
  { value: 'الغاء حجز', label: 'الغاء حجز' },
  { value: 'تسليم', label: 'تسليم' },
  { value: 'تعديل', label: 'تعديل' },
  { value: 'ارسال', label: 'ارسال' },
  { value: 'حذف', label: 'حذف' },
  { value: 'تغيير اسم', label: 'تغيير اسم' },

];

const timeRangeLabels = [
  { label: 'يوم', value: 'day' },
  { label: 'أسبوع', value: 'week' },
  { label: 'شهر', value: 'month' },
  { label: 'مخصص', value: 'custom' },
];

// Map backend change types to frontend types
const mapBackendType = (backendType: string): HistoryRecord['type'] => {
  switch (backendType) {
    case 'حجز': return 'reservation';
    case 'تسليم': return 'delivery';
    case 'ارسال': return 'sent';
    case 'حذف': return 'delete';
    case 'تغيير اسم': return 'edit_name';

    case 'الغاء حجز': return 'cancellation';
    case 'اضافة كمية': 
    case 'اضافة مادة':
    case 'اضافة نوع من مادة': return 'material_add';
    case 'تعديل': return 'material_remove';
    default: return 'reservation';
  }
};

// Map backend change types to descriptive text
const mapToDescription = (record: any): string => {
  switch (record.change_type) {
    case 'حجز': return `تم إنشاء حجز لـ ${record.name}`;
    case 'تسليم': return `تم تسليم ${record.amount} من ${record.name}`;
    case 'حذف': return ` تم حذف جميع الكمية من   ${record.type}`;
    case 'تغيير اسم': return `تم تغيير اسم ${record.details} الى ${record.type}`;

    case 'ارسال': return `تم ارسال ${record.amount} من ${record.name}`;
    case 'الغاء حجز': return `تم إلغاء حجز لـ ${record.name}`;
    case 'اضافة كمية': return `تم إضافة كمية ${record.amount} لـ ${record.name}`;
    case 'اضافة مادة': return `تم إضافة مادة جديدة: ${record.name}`;
    case 'اضافة نوع من مادة': return `تم إضافة نوع جديد: ${record.type} لـ ${record.name}`;
    case 'تعديل': return `تم تعديل ${record.name}`;
    default: return record.change_type;
  }
};

const History = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState('start');
  const [timeRange, setTimeRange] = useState('all');
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendData, setBackendData] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const scale = Math.min(windowWidth / 375, windowHeight / 812);
  const scaledSize = (size: number) => Math.round(size * scale);
  const scaledPadding = (padding: number) => Math.round(padding * scale);

 const fetchHistory = async () => {
  try {
    setLoading(true);
    const token = await AsyncStorage.getItem('access_token');
    const params = new URLSearchParams();

    if (selectedType !== 'all') {
      params.append('change_type', selectedType);
    }

    // Handle time range filters
    if (timeRange === 'day') {
      params.append('created_range', 'today');  // Send "today" instead of formatted date
    } 
    else if (timeRange === 'week') {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
      
      params.append(
        'created_range', 
        `${startOfWeek.toISOString().split('T')[0]},${endOfWeek.toISOString().split('T')[0]}`
      );
    } 
    else if (timeRange === 'month') {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      params.append(
        'created_range', 
        `${startOfMonth.toISOString().split('T')[0]},${endOfMonth.toISOString().split('T')[0]}`
      );
    } 
    else if (timeRange === 'custom' && dateRange.startDate && dateRange.endDate) {
      const start = dateRange.startDate.toISOString().split('T')[0];
      const end = dateRange.endDate.toISOString().split('T')[0];
      params.append('created_range', `${start},${end}`);
    }

    const response = await fetch(`${API_BASE_URL}/history_changes/?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to fetch history');
    
    const data = await response.json();
    setBackendData(data.history);
    
    // Map backend data to frontend format
    const mappedHistory = data.history.map((record: any) => ({
      id: record.id,
      type: mapBackendType(record.change_type),
      description: mapToDescription(record),
      userName: record.username || 'Unknown',
      itemName: record.name,
      quantity: record.amount,
      date: new Date(record.createAt).toISOString().split('T')[0],
      time: new Date(record.createAt).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }),
      status: record.change_type === 'الغاء حجز' ? 'cancelled' : 'completed'
    }));

    setHistory(mappedHistory);
  } catch (error) {
    Alert.alert('خطأ', 'فشل في تحميل سجل العمليات');
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

  useEffect(() => {
    fetchHistory();
  }, [selectedType, timeRange, dateRange]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
  };

  // Filter history based on search term
  const filteredHistory = history.filter((record) => {
    return (
      record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.itemName && record.itemName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const handleDateSelection = (rangeType: string) => {
    setDatePickerMode(rangeType);
    setShowDatePicker(true);
  };

  const handleDateChange = (event: any, selectedDate: Date | undefined) => {
    setShowDatePicker(false);
    
    if (!selectedDate) return;

    if (datePickerMode === 'day') {
      setDateRange({
        startDate: selectedDate,
        endDate: selectedDate
      });
    } 
    else if (datePickerMode === 'week') {
      const weekStart = new Date(selectedDate);
      weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      setDateRange({
        startDate: weekStart,
        endDate: weekEnd
      });
    }
    else if (datePickerMode === 'month') {
      const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      
      setDateRange({
        startDate: monthStart,
        endDate: monthEnd
      });
    }
    else if (datePickerMode === 'start') {
      setDateRange(prev => ({
        startDate: selectedDate,
        endDate: prev.endDate
      }));
    }
    else if (datePickerMode === 'end') {
      setDateRange(prev => ({
        startDate: prev.startDate,
        endDate: selectedDate
      }));
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'اختر تاريخ';
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTypeIcon = (type: HistoryRecord['type']) => {
    switch (type) {
      case 'reservation': return <MaterialIcons name="inventory" size={20} color="#3b82f6" />;
      case 'delivery': return <Ionicons name="checkmark-circle-outline" size={20} color="#22c55e" />;
      case 'sent': return <Ionicons name="checkmark-circle-outline" size={20} color="#22c55e" />;
      case 'edit_name': return <Ionicons name="checkmark-circle-outline" size={20} color="#dc2626" />;
      case 'delete': return <Ionicons name="checkmark-circle-outline" size={20} color="#dc2626" />;

      case 'cancellation': return <Ionicons name="close-circle-outline" size={20} color="#dc2626" />;
      case 'material_add': return <Feather name="plus-circle" size={20} color="#f59e0b" />;
      case 'material_remove': return <Feather name="minus-circle" size={20} color="#f97316" />;
      case 'user_add': return <Ionicons name="person-add-outline" size={20} color="#7c3aed" />;
      default: return <MaterialIcons name="inventory" size={20} color="#6b7280" />;
    }
  };

  const getTypeColor = (type: HistoryRecord['type']) => {
    switch (type) {
      case 'reservation': return '#3b82f6';
      case 'delivery': return '#22c55e';
      case 'sent': return '#22c55e';

      case 'cancellation': return '#dc2626';
      case 'edit_name': return '#dc2626';
      case 'delete': return '#dc2626';

      case 'material_add': return '#f59e0b';
      case 'material_remove': return '#f97316';
      case 'user_add': return '#7c3aed';
      default: return '#6b7280';
    }
  };

  // Responsive styles
  const responsiveStyles = StyleSheet.create({
    container: {
      flex: 1,
      padding: scaledPadding(16),
      backgroundColor: '#f8fafc',
      paddingTop: getStatusBarHeight() + scaledPadding(16),
    },
    header: {
      marginBottom: scaledPadding(24),
      backgroundColor: '#3b82f6',
      padding: scaledPadding(16),
      borderRadius: scaledSize(12),
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: scaledSize(2) },
      shadowOpacity: 0.1,
      shadowRadius: scaledSize(4),
    },
    title: {
      fontSize: scaledSize(24),
      fontWeight: 'bold',
      color: '#fff',
      textAlign: 'right',
    },
    subtitle: {
      fontSize: scaledSize(14),
      color: '#e0f2fe',
      textAlign: 'right',
      marginTop: scaledPadding(4),
    },
    searchContainer: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      backgroundColor: '#fff',
      borderRadius: scaledSize(12),
      paddingHorizontal: scaledPadding(16),
      marginBottom: scaledPadding(20),
      borderWidth: 2,
      borderColor: '#3b82f6',
      elevation: 2,
      shadowColor: '#3b82f6',
      shadowOffset: { width: 0, height: scaledSize(2) },
      shadowOpacity: 0.1,
      shadowRadius: scaledSize(4),
    },
    searchIcon: {
      marginLeft: scaledPadding(8),
      color: '#3b82f6',
    },
    searchInput: {
      flex: 1,
      height: scaledSize(50),
      color: '#1e293b',
      textAlign: 'right',
      fontSize: scaledSize(16),
    },
    filterSection: {
      marginBottom: scaledPadding(20),
      backgroundColor: '#fff',
      borderRadius: scaledSize(12),
      padding: scaledPadding(20),
      borderWidth: 2,
      borderColor: '#e2e8f0',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: scaledSize(2) },
      shadowOpacity: 0.05,
      shadowRadius: scaledSize(4),
    },
    sectionLabel: {
      fontSize: scaledSize(18),
      fontWeight: '600',
      color: '#1e293b',
      marginBottom: scaledPadding(16),
      textAlign: 'right',
    },
    timeRangeButtons: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      marginBottom: scaledPadding(12),
      gap: scaledPadding(8),
    },
    timeRangeButton: {
      flex: 1,
      paddingVertical: scaledPadding(12),
      paddingHorizontal: scaledPadding(16),
      borderRadius: scaledSize(10),
      backgroundColor: '#f1f5f9',
      borderWidth: 2,
      borderColor: '#e2e8f0',
      alignItems: 'center',
      minHeight: scaledSize(44),
    },
    timeRangeText: {
      fontSize: scaledSize(14),
      fontWeight: '500',
      color: '#64748b',
    },
    customDateRange: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: scaledPadding(16),
      gap: scaledPadding(12),
    },
    dateInput: {
      flex: 1,
      padding: scaledPadding(16),
      borderRadius: scaledSize(10),
      borderWidth: 2,
      backgroundColor: '#f8fafc',
      alignItems: 'center',
      minHeight: scaledSize(50),
    },
    dateText: {
      textAlign: 'center',
      fontWeight: '500',
      fontSize: scaledSize(14),
    },
    dateSeparator: {
      marginHorizontal: scaledPadding(8),
      fontWeight: '600',
      fontSize: scaledSize(16),
    },
    pickerContainer: {
      borderWidth: 2,
      borderRadius: scaledSize(10),
      overflow: 'hidden',
      backgroundColor: '#f8fafc',
    },
    picker: {
      height: scaledSize(50),
      color: '#1e293b',
    },
    resultsContainer: {
      marginTop: scaledPadding(8),
    },
    recordCard: {
      backgroundColor: '#fff',
      borderRadius: scaledSize(12),
      padding: scaledPadding(20),
      marginBottom: scaledPadding(16),
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderLeftWidth: 4,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: scaledSize(2) },
      shadowOpacity: 0.05,
      shadowRadius: scaledSize(4),
      minHeight: scaledSize(150),
    },
    recordHeader: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: scaledPadding(12),
      flexWrap: 'wrap',
    },
    typeIndicator: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      flex: 1,
    },
    recordTitle: {
      fontSize: scaledSize(16),
      fontWeight: '600',
      marginHorizontal: scaledPadding(8),
    },
    recordDate: {
      fontSize: scaledSize(12),
      color: '#64748b',
      fontWeight: '500',
    },
    recordDescription: {
      fontSize: scaledSize(15),
      color: '#334155',
      marginBottom: scaledPadding(16),
      textAlign: 'right',
      lineHeight: scaledSize(22),
    },
    recordDetails: {
      flexDirection: 'row-reverse',
      flexWrap: 'wrap',
      gap: scaledPadding(16),
      marginBottom: scaledPadding(16),
    },
    detailItem: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      backgroundColor: '#f8fafc',
      paddingHorizontal: scaledPadding(12),
      paddingVertical: scaledPadding(6),
      borderRadius: scaledSize(8),
    },
    detailText: {
      fontSize: scaledSize(13),
      color: '#475569',
      fontWeight: '500',
    },
    footer: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    idText: {
      fontSize: scaledSize(12),
      color: '#64748b',
      fontWeight: '500',
    },
    statusBadge: {
      paddingVertical: scaledPadding(6),
      paddingHorizontal: scaledPadding(12),
      borderRadius: scaledSize(20),
    },
    statusText: {
      fontSize: scaledSize(12),
      fontWeight: '600',
      color: '#fff',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: scaledPadding(60),
      backgroundColor: '#f8fafc',
      borderRadius: scaledSize(12),
      marginTop: scaledPadding(20),
      minHeight: scaledSize(300),
    },
    emptyText: {
      fontSize: scaledSize(18),
      fontWeight: '600',
      marginTop: scaledPadding(16),
    },
    loadingContainer: {
      padding: scaledPadding(40),
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f8fafc',
      borderRadius: scaledSize(12),
      marginTop: scaledPadding(20),
      minHeight: scaledSize(200),
    },
    loadingText: {
      marginTop: scaledPadding(16),
      fontSize: scaledSize(16),
      fontWeight: '500',
    },
  });

  return (
    <MainLayout userType="admin">
      <RefreshableScreen onRefresh={handleRefresh}>
      <View style={commonStyles.container}>
  <View style={commonStyles.header}>
    <Text style={commonStyles.title}>سجل العمليات</Text>
  </View>

          {/* Search */}
          <View style={responsiveStyles.searchContainer}>
            <Ionicons name="search" size={scaledSize(20)} style={responsiveStyles.searchIcon} />
            <TextInput
              style={responsiveStyles.searchInput}
              placeholder="البحث في العمليات..."
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>

          {/* Time Range */}
          <View style={responsiveStyles.filterSection}>
            <Text style={responsiveStyles.sectionLabel}>الفترة الزمنية</Text>
            <View style={responsiveStyles.timeRangeButtons}>
              {timeRangeLabels.map(({ label, value }) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    responsiveStyles.timeRangeButton,
                    timeRange === value && { 
                      backgroundColor: '#3b82f6',
                      borderColor: '#3b82f6'
                    },
                  ]}
                  onPress={() => setTimeRange(value)}
                >
                  <Text
                    style={[
                      responsiveStyles.timeRangeText,
                      timeRange === value && { color: '#fff' },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {timeRange === 'custom' && (
              <View style={responsiveStyles.customDateRange}>
                <TouchableOpacity
                  style={[responsiveStyles.dateInput, { borderColor: '#3b82f6' }]}
                  onPress={() => {
                    setDatePickerMode('start');
                    setShowDatePicker(true);
                  }}
                >
                  <Text style={[responsiveStyles.dateText, { color: '#3b82f6' }]}>
                    {dateRange.startDate ? formatDate(dateRange.startDate) : 'بداية التاريخ'}
                  </Text>
                </TouchableOpacity>
                <Text style={[responsiveStyles.dateSeparator, { color: '#3b82f6' }]}>إلى</Text>
                <TouchableOpacity
                  style={[responsiveStyles.dateInput, { borderColor: '#3b82f6' }]}
                  onPress={() => {
                    setDatePickerMode('end');
                    setShowDatePicker(true);
                  }}
                >
                  <Text style={[responsiveStyles.dateText, { color: '#3b82f6' }]}>
                    {dateRange.endDate ? formatDate(dateRange.endDate) : 'نهاية التاريخ'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Type Filter */}
          <View style={responsiveStyles.filterSection}>
            <Text style={responsiveStyles.sectionLabel}>نوع العملية</Text>
            <View style={[responsiveStyles.pickerContainer, { borderColor: '#3b82f6' }]}>
              <Picker
                selectedValue={selectedType}
                onValueChange={setSelectedType}
                style={responsiveStyles.picker}
              >
                {typeOptions.map((opt) => (
                  <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Results */}
   {loading ? (
        <AppLoader />
      ) : filteredHistory.length > 0 ? (
            <View style={responsiveStyles.resultsContainer}>
              {filteredHistory.map((record) => (
                <View key={record.id} style={[
                  responsiveStyles.recordCard,
                  { borderLeftColor: getTypeColor(record.type) }
                ]}>
                  <View style={responsiveStyles.recordHeader}>
                    <View style={responsiveStyles.typeIndicator}>
                      {getTypeIcon(record.type)}
                      <Text style={[
                        responsiveStyles.recordTitle,
                        { color: getTypeColor(record.type) }
                      ]}>
                        {typeOptions.find((o) => o.value === record.type)?.label}
                      </Text>
                    </View>
                    <Text style={responsiveStyles.recordDate}>
                      {record.date} • {record.time}
                    </Text>
                  </View>

                  <Text style={responsiveStyles.recordDescription}>
                    {record.description}
                  </Text>

                  <View style={responsiveStyles.recordDetails}>
                    <View style={responsiveStyles.detailItem}>
                      <Ionicons name="person-outline" size={scaledSize(14)} color="#64748b" />
                      <Text style={responsiveStyles.detailText}> {record.userName}</Text>
                    </View>
                    {record.itemName && (
                      <View style={responsiveStyles.detailItem}>
                        <Ionicons name="cube-outline" size={scaledSize(14)} color="#64748b" />
                        <Text style={responsiveStyles.detailText}> {record.itemName}</Text>
                      </View>
                    )}
                    {record.quantity && (
                      <View style={responsiveStyles.detailItem}>
                        <Ionicons name="pricetag-outline" size={scaledSize(14)} color="#64748b" />
                        <Text style={responsiveStyles.detailText}> الكمية: {record.quantity}</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={responsiveStyles.footer}>
                    <Text style={responsiveStyles.idText}>
                      الرقم الفرعي: {record.id}
                    </Text>
                    <View
                      style={[
                        responsiveStyles.statusBadge,
                        record.status === 'completed'
                          ? { backgroundColor: '#22c55e' }
                          : { backgroundColor: '#dc2626' },
                      ]}
                    >
                      <Text style={responsiveStyles.statusText}>
                        {record.status === 'completed' ? 'مكتمل' : 'ملغي'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={responsiveStyles.emptyState}>
              <Ionicons name="search" size={scaledSize(48)} color="#3b82f6" />
              <Text style={[responsiveStyles.emptyText, { color: '#3b82f6' }]}>لا توجد نتائج مطابقة</Text>
            </View>
          )}

          {showDatePicker && (
            <DateTimePicker
              value={
                datePickerMode === 'start'
                  ? dateRange.startDate || new Date()
                  : dateRange.endDate || new Date()
              }
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}
        </View>
      </RefreshableScreen>
    </MainLayout>
  );
};

export default History;