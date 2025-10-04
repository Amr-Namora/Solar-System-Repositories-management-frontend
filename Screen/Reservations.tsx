import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Picker } from '@react-native-picker/picker';
import AppLoader from '../component/AppLoader';

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import {
  Clock,
  Package,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Truck,
  Send,
} from 'lucide-react-native';
import RefreshableScreen from '../component/RefreshableScreen';
import { commonStyles } from '../styles/commonStyles'; // ✅ Imported
import AsyncStorage from '@react-native-async-storage/async-storage';
import MainLayout from '../component/MainLayout';
import { API_BASE_URL, sendReservation, confirmReservation, cancelReservation } from './api2';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

// Update the status type to include 'sent'
type ReservationStatus = 'pending' | 'sent' | 'delivered' | 'cancelled'|'requested for workshops';

interface Reservation {
  id: number;
  itemName: string;
  category: string;
  quantity: number;
  employeeName: string;
  workshop_name: string;
  newEmployeeName: string;
  date: string;
  status: ReservationStatus;
  notes?: string;
}

const Reservations: React.FC = () => {
  const [userType, setUserType] = useState<'admin' | 'employee' | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [transferRecipient, setTransferRecipient] = useState('');
  const [transferReservation, setTransferReservation] = useState<Reservation | null>(null);
  const [currentUsername, setCurrentUsername] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const [cardPositions, setCardPositions] = useState<number[]>([]);
  const [counts, setCounts] = useState({
    cancelled_last_5_days: 0,
    delivered_last_5_days: 0,
    pending_total: 0,
    sent_total: 0,
    requested_total: 0,
  });
  const [users, setUsers] = useState<{ id: number; username: string }[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('لم يتم العثور على رمز المصادقة');
      const response = await fetch(`${API_BASE_URL}/users_no_boss/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('فشل في جلب المستخدمين');
      const data = await response.json();
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (error) {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const setCardPositionAtIndex = (index: number, y: number) => {
    setCardPositions((prev) => {
      const next = [...prev];
      next[index] = y;
      return next;
    });
  };

  const loadReservations = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/newreservation/`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json() as {
        is_manager: boolean;
        details: any[];
        username: string;
        counts: any;
      };

      setUserType(data.is_manager ? 'admin' : 'employee');
      setCurrentUsername(data.username || '');
      
      if (data.counts) {
        setCounts({
          cancelled_last_5_days: data.counts.cancelled_last_5_days || 0,
          delivered_last_5_days: data.counts.delivered_last_5_days || 0,
          pending_total: data.counts.pending_total || 0,
          sent_total: data.counts.sent_total || 0,
          requested_total: data.counts.requested_total || 0,
        });
      }

      const mapped = data.details.map((n) => {
        let status: ReservationStatus = 'pending';
        if (n.reservation_type === 'delivered') status = 'delivered';
        else if (n.reservation_type === 'cancelled') status = 'cancelled';
        else if (n.reservation_type === 'sent') status = 'sent';
        else if (n.reservation_type === 'requested for workshops') status = 'requested for workshops';
        return {
          id: n.id,
          itemName: n.name,
          category: n.type,
          quantity: n.amount,
          employeeName: n.username,
          newEmployeeName: n.newusername,
          workshop_name: n.workshop_name,
          date: new Date(n.createAt).toLocaleDateString('ar-EG'),
          status,
          notes: n.description,
        };
      });

      setReservations(mapped);
    } catch (e) {
      console.error(e);
      Alert.alert('خطأ', 'فشل في جلب الحجوزات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadReservations();
      fetchUsers();
    });
    return unsubscribe;
  }, [navigation, loadReservations]);

  const handleSend = async (r: Reservation) => {
  try {
    // Call the sendReservation function and get the response
    const response = await sendReservation({
      Reservation_id: r.id,
      username: r.employeeName,
    });
    
    // Check if the response indicates success
    if (response.status >= 200 && response.status < 300) {
      Alert.alert('تم', 'تم إرسال الحجز بنجاح');
      loadReservations();
    } else {
      // Handle non-2xx responses
      const errorData = response.data;
      
      // Check for the specific error message
      if (errorData.error && errorData.error.includes('هناك حجز مطلوب لصالح ورشة لهذه المادة')) {
        Alert.alert('خطأ', 'هناك حجز مطلوب لصالح ورشة لهذه المادة. قم بمعالجة ذلك الحجز اولا.');
        console.log(1234)
        return;
      }
      
      throw new Error(errorData.error || 'Failed to send reservation');
    }
  } catch (err: any) {
    console.error(err);
    
    // Handle axios errors (they have response property)
    if (err.response) {
      const errorData = err.response.data;
      
      // Check for the specific error message in the caught error
      if (errorData.error && errorData.error.includes('هناك حجز مطلوب لصالح ورشة لهذه المادة')) {
        Alert.alert('خطأ', 'هناك حجز مطلوب لصالح ورشة لهذه المادة. قم بمعالجة ذلك الحجز اولا.');
        return;
      }
      
      Alert.alert('خطأ', errorData.error || 'فشل في إرسال الحجز');
    } else {
      Alert.alert('خطأ', err.message || 'فشل في إرسال الحجز');
    }
  }
};

  const openTransferModal = (r: Reservation) => {
    setTransferReservation(r);
    setTransferRecipient('');
    setTransferModalVisible(true);
  };

  const closeTransferModal = () => {
    setTransferModalVisible(false);
    setTransferReservation(null);
    setTransferRecipient('');
  };

  const handleTransfer = async () => {
    if (!transferReservation) return;
    if (!transferRecipient.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم الشخص المستلم');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/turnResevation/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reservation_id: transferReservation.id,
          new_username: transferRecipient.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data && (data.error || data.detail)) || `Status ${res.status}`);
      }

      Alert.alert('تم', 'تم تحويل الحجز بنجاح');
      closeTransferModal();
      loadReservations();
    } catch (err: any) {
      console.error(err);
      Alert.alert('خطأ', err.message || 'فشل في تحويل الحجز');
    }
  };

  const handleConfirm = async (r: Reservation) => {
    try {
      await confirmReservation({
        Reservation_id: r.id,
        username: r.employeeName,
      });
      Alert.alert('تم', 'تم تأكيد التسليم بنجاح');
      loadReservations();
    } catch (err: any) {
      console.error(err);
      Alert.alert('خطأ', err.response?.data?.error || 'فشل في تأكيد التسليم');
    }
  };

  const handleCancel = async (r: Reservation) => {
    try {
      await cancelReservation({
        Reservation_id: r.id,
        username: r.employeeName,
      });
      Alert.alert('تم', 'تم إلغاء الحجز بنجاح');
      loadReservations();
    } catch (err: any) {
      console.error(err);
      Alert.alert('خطأ', err.response?.data?.error || 'فشل في إلغاء الحجز');
    }
  };

  const handleConfirmTransfer = async (r: Reservation) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/confirmTurnResevation/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          Reservation_id: r.id,
        }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      Alert.alert('تم', 'تم تأكيد استلام التحويل');
      loadReservations();
    } catch (err: any) {
      console.error(err);
      Alert.alert('خطأ', err.message || 'فشل في تأكيد التحويل');
    }
  };

  const handleCancelTransfer = async (r: Reservation) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/cancelTurnResevation/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          Reservation_id: r.id,
        }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      Alert.alert('تم', 'تم إلغاء التحويل');
      loadReservations();
    } catch (err: any) {
      console.error(err);
      Alert.alert('خطأ', err.message || 'فشل في إلغاء التحويل');
    }
  };

  const getStatusStyles = (status: ReservationStatus) => {
    switch (status) {
      case 'delivered':
        return {
          bg: '#D1FAE5',
          color: '#22c55e',
          icon: <CheckCircle size={16} color="#22c55e" />,
        };
      case 'cancelled':
        return {
          bg: '#FEE2E2',
          color: '#DC2626',
          icon: <XCircle size={16} color="#DC2626" />,
        };
      case 'sent':
        return {
          bg: '#FFEDD5',
          color: '#F97316',
          icon: <Send size={16} color="#F97316" />,
        };
      default:
        return {
          bg: '#DBEAFE',
          color: '#3b82f6',
          icon: <AlertCircle size={16} color="#3b82f6" />,
        };
    }
  };

  const getStatusIcon = (status: ReservationStatus) => {
    switch (status) {
      case 'delivered':
        return <Ionicons name="checkmark-circle" size={20} color="#22c55e" />;
      case 'cancelled':
        return <Ionicons name="close-circle" size={20} color="#DC2626" />;
      case 'sent':
        return <Ionicons name="send" size={20} color="#F97316" />;
      default:
        return <Ionicons name="time" size={20} color="#3b82f6" />;
    }
  };

  if (userType === null) {
    return (
      <View style={styles.fullScreenLoader}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>جاري التحقق من الصلاحيات...</Text>
      </View>
    );
  }

  return (
    <MainLayout userType={userType}>
         {loading ? (
        <AppLoader />
      ) : (
        <RefreshableScreen onRefresh={loadReservations} scrollRef={scrollViewRef}>
          {/* ✅ Use shared container */}
          <View style={commonStyles.container}>
            {/* ✅ Use shared header */}
            <View style={commonStyles.header}>
              <Text style={commonStyles.title}>الحجوزات</Text>
              <Text style={commonStyles.subtitle}>إدارة طلبات الحجز</Text>
            </View>

            <View style={styles.content}>
              <View style={styles.stats}>
                {([
                  { key: 'pending', label: 'قيد الانتظار', countKey: 'pending_total' },
                  { key: 'requested for workshops', label: 'مطلوب للتأمين', countKey: 'requested_total' },

                  { key: 'sent', label: 'تم الإرسال', countKey: 'sent_total' },
                  { key: 'delivered', label: 'تم التسليم', countKey: 'delivered_last_5_days' },
                  { key: 'cancelled', label: 'ملغي', countKey: 'cancelled_last_5_days' },
                ] as Array<{ key: ReservationStatus; label: string; countKey: keyof typeof counts }>).map(({ key, label, countKey }) => {
                  const count = counts[countKey];
                  const s = getStatusStyles(key);
                  const scrollToFirstByStatus = () => {
                    const idx = reservations.findIndex((r) => r.status === key);
                    if (idx >= 0 && cardPositions[idx] != null && scrollViewRef.current) {
                      scrollViewRef.current.scrollTo({ y: cardPositions[idx], animated: true });
                    }
                  };
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[styles.statCard, { borderColor: s.color }]}
                      onPress={scrollToFirstByStatus}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.statNumber, { color: s.color }]}>{count}</Text>
                      <Text style={styles.statLabel}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}

                {(() => {
                  const isTransferPending = (r: any) => Boolean(r.newEmployeeName) && r.newEmployeeName === currentUsername;
                  const count = reservations.filter((r) => isTransferPending(r)).length;
                  const color = '#F59E0B';
                  const scrollToFirstTransfer = () => {
                    const idx = reservations.findIndex((r) => isTransferPending(r));
                    if (idx >= 0 && cardPositions[idx] != null && scrollViewRef.current) {
                      scrollViewRef.current.scrollTo({ y: cardPositions[idx], animated: true });
                    }
                  };
                  return (
                    <TouchableOpacity
                      key="transfer"
                      style={[styles.statCard, { borderColor: color }]}
                      onPress={scrollToFirstTransfer}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.statNumber, { color }]}>{count}</Text>
                      <Text style={styles.statLabel}>قيد التحويل</Text>
                    </TouchableOpacity>
                  );
                })()}
              </View>

              {reservations.map((r, index) => {
                const s = getStatusStyles(r.status);
                const isTransferPending = Boolean(r.newEmployeeName) && r.newEmployeeName === currentUsername;
                const canTransfer = r.employeeName === currentUsername;
                const forMyReposotory = r.newEmployeeName !== currentUsername && r.employeeName !== currentUsername;
                const gotTransfered = !Boolean(r.newEmployeeName) && r.employeeName === currentUsername;
                return (
                  <View
                    key={r.id}
                    style={[styles.card, { borderLeftColor: s.color }]}
                    onLayout={(e) => setCardPositionAtIndex(index, e.nativeEvent.layout.y)}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardTitle}>
                        <Text style={styles.itemName}>{r.itemName}</Text>
                        <View style={styles.categoryRow}>
                          <Package size={14} color="#6B7280" />
                          <Text style={styles.categoryText}>
                            {r.category}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.badge, { backgroundColor: isTransferPending ? '#FFEDD5' : s.bg }]}>
                        {isTransferPending ? (
                          <Ionicons name="swap-horizontal" size={20} color="#F59E0B" />
                        ) : (
                          getStatusIcon(r.status)
                        )}
                        <Text style={[styles.badgeText, { color: isTransferPending ? '#F59E0B' : s.color }]}>
                          {isTransferPending
                            ? 'قيد التحويل'
                            : r.status === 'pending'
                            ? 'قيد الانتظار'
                            : r.status === 'sent'
                            ? 'تم الإرسال'
                            : r.status === 'delivered'
                            ? 'تم التسليم'
                            : r.status === 'requested for workshops'
                            ? 'مطلوب للتأمين'
                            : 'ملغي'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.infoRow}>
                      <View style={styles.userInfo}>
                        <Ionicons name="person-outline" size={14} color="#6B7280" />
                        <Text style={styles.infoValue}>
                          {r.employeeName}
                        </Text>
                        <Text style={styles.infoLabel}>الموظف:</Text>
                      </View>
                      
                      <View style={styles.quantity}>
                        <Text style={[styles.quantityNumber, { color: '#3b82f6' }]}>
                          {r.quantity}
                        </Text>
                        <Text style={styles.quantityLabel}>الكمية</Text>
                      </View>
                    </View>
                    {r.workshop_name && (<View style={styles.userInfo}>
    <Ionicons name="business-outline" size={14} color="#6B7280" />
    <Text style={styles.infoValue}>{r.workshop_name}</Text>
    <Text style={styles.infoLabel}>الورشة:</Text>
  </View>
                    )}  
                    <View style={styles.dateRow}>
                      <Ionicons name="time-outline" size={14} color="#6B7280" />
                      <Text style={styles.dateText}>{r.date}</Text>
                    </View>

                    {r.notes && (
                      <View style={styles.notesBox}>
                        <Text style={styles.notesText}>{r.notes}</Text>
                      </View>
                    )}

                    {!isTransferPending && userType === 'admin' && r.status === 'pending' && (
                      <View style={styles.actions}>
                        <TouchableOpacity
                          onPress={() => handleSend(r)}
                          style={[styles.btn, styles.btnOrange]}
                        >
                          <Ionicons name="send" size={16} color="#fff" />
                          <Text style={styles.btnTextWhite}>إرسال</Text>
                        </TouchableOpacity>
                        { r.workshop_name===null && (
                        <TouchableOpacity
                          onPress={() => handleCancel(r)}
                          style={[styles.btn, styles.btnRed]}
                        >
                          <Ionicons name="close-circle" size={16} color="#fff" />
                          <Text style={styles.btnTextWhite}>إلغاء</Text>
                        </TouchableOpacity>
                        )}
                      </View>
                    )}

                    {forMyReposotory && userType === 'employee' && r.status === 'pending' && (
                      <View style={styles.actions}>
                        <TouchableOpacity
                          onPress={() => handleSend(r)}
                          style={[styles.btn, styles.btnOrange]}
                        >
                          <Ionicons name="send" size={16} color="#fff" />
                          <Text style={styles.btnTextWhite}>إرسال</Text>
                        </TouchableOpacity>
                         { r.workshop_name===null && (
                        <TouchableOpacity
                          onPress={() => handleCancel(r)}
                          style={[styles.btn, styles.btnRed]}
                        >
                          <Ionicons name="close-circle" size={16} color="#fff" />
                          <Text style={styles.btnTextWhite}>إلغاء</Text>
                        </TouchableOpacity>
                         )}
                      </View>
                    )}

                    {!forMyReposotory && !isTransferPending && userType === 'employee' && r.status === 'pending' &&  r.workshop_name===null &&  (
                      <View style={styles.actions}>
                        <TouchableOpacity
                          onPress={() => handleCancel(r)}
                          style={[styles.btn, styles.btnRed]}
                        >
                          <Ionicons name="close-circle" size={16} color="#fff" />
                          <Text style={styles.btnTextWhite}>إلغاء</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {r.status === 'requested for workshops' && (
                      <View style={styles.actions}>
                        <TouchableOpacity
                          onPress={() => handleSend(r)}
                          style={[styles.btn, styles.btnOrange]}
                        >
                          <Ionicons name="send" size={16} color="#fff" />
                          <Text style={styles.btnTextWhite}>إرسال</Text>
                        </TouchableOpacity>
                        </View>
                    )} 
                    { r.status === 'sent' && !r.newEmployeeName   &&(  canTransfer  ) && (
                      <View style={styles.actions}>
                        <TouchableOpacity
                          onPress={() => handleConfirm(r)}
                          style={[styles.btn, styles.btnGreen]}
                        >
                          <Ionicons name="checkmark-circle" size={16} color="#fff" />
                          <Text style={styles.btnTextWhite}>تم الاستلام</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {isTransferPending && (
                      <View style={styles.actions}>
                        <TouchableOpacity
                          onPress={() => handleConfirmTransfer(r)}
                          style={[styles.btn, styles.btnGreen]}
                        >
                          <Text style={styles.btnTextWhite}>تم استلام التحويل</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleCancelTransfer(r)}
                          style={[styles.btn, styles.btnRed]}
                        >
                          <Text style={styles.btnTextWhite}>الغاء</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {gotTransfered && r.status !== 'cancelled'&& r.status !== 'delivered' &&(
                      <View style={[styles.actions, { marginTop: 8 }]}>
                        <TouchableOpacity
                          onPress={() => openTransferModal(r)}
                          style={[styles.btn, styles.btnYellow]}
                        >
                          <Text style={styles.btnTextWhite}>تحويل</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          <Modal
            visible={transferModalVisible}
            animationType="fade"
            transparent={true}
            onRequestClose={closeTransferModal}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, styles.elevatedModal]}>
                <Text style={styles.modalTitle}>اختر المستلم</Text>

                <View style={styles.pickerBeautifulContainer}>
                  {usersLoading ? (
                    <ActivityIndicator size="small" color="#3b82f6" />
                  ) : (
                    <Picker
                      selectedValue={transferRecipient}
                      onValueChange={(itemValue) => setTransferRecipient(itemValue)}
                      style={styles.pickerBeautiful}
                      dropdownIconColor="#4B5563"
                    >
                      <Picker.Item label="‏‏‮اختر المستلم..." value="" color="#9CA3AF" />
                      {users.map((user) => (
                        <Picker.Item key={user.id} label={user.username} value={user.username} />
                      ))}
                    </Picker>
                  )}
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.cancelButton, styles.elevatedButton]}
                    onPress={closeTransferModal}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelText}>إلغاء</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      styles.elevatedButton,
                      !transferRecipient && styles.saveButtonDisabled,
                    ]}
                    onPress={handleTransfer}
                    activeOpacity={transferRecipient ? 0.8 : 1}
                    disabled={!transferRecipient}
                  >
                    <Text
                      style={[
                        styles.saveText,
                        !transferRecipient && styles.saveTextDisabled,
                      ]}
                    >
                      تأكيد التحويل
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </RefreshableScreen>
      )}
    </MainLayout>
  );
};

// ✅ Removed: header, title, subtitle
const styles = StyleSheet.create({
  fullScreenLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  btnOrange: {
    backgroundColor: '#F97316',
  },
  content: {
    padding: 16,
    paddingBottom: 80,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '500',
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  statCard: {
    width: '48%',
    minWidth: '48%',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardTitle: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'right',
  },
  categoryRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 14,
    color: '#64748b',
    marginRight: 6,
  },
  badge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    position: 'relative',
  },
  elevatedModal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 24,
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 16,
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
  cancelText: {
    color: '#4B5563',
    fontSize: 17,
    fontWeight: '600',
  },
  saveText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  saveTextDisabled: {
    color: '#F9FAFB',
  },
  quantity: {
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  quantityNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  quantityLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  dateRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  dateText: {
    fontSize: 12,
    color: '#64748b',
    marginRight: 6,
  },
  notesBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#ffffffff',
  },
  notesText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'right',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  btn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  btnGreen: {
    backgroundColor: '#22c55e',
  },
  btnRed: {
    backgroundColor: '#dc2626',
  },
  btnTextWhite: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  btnYellow: {
    backgroundColor: '#f59e0b',
  },
});

export default Reservations;