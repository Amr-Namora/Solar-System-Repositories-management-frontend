import React, { useState, useEffect, useCallback, useRef } from "react";
import { Picker } from "@react-native-picker/picker";
import AppLoader from "../component/AppLoader";
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
  FlatList,
} from "react-native";
import {
  Package,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
} from "lucide-react-native";
import { commonStyles } from "../styles/commonStyles";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MainLayout from "../component/MainLayout";
import {
  API_BASE_URL,
  cancelRequestedReservation,
  sendRequestedReservation,
  sendReservation,
  confirmReservation,
  confirmRequestedReservation,
  cancelReservation,
} from "./api2";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

type ReservationStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "cancelled"
  | "requested for workshops"
  | "returned from workshops";

interface Reservation {
  id: number;
  itemName: string;
  category: string;
  quantity: number;
  employeeName: string;
  workshop_name: string;
  newWorkshop_name?: string;
  newEmployeeName: string;
  date: string;
  status: ReservationStatus;
  notes?: string;
  reservation_type?: string;
  to_send_to_workshop?: boolean;
  to_cancle_confirm_turning?: boolean;
  to_turn?: boolean;
  to_edit_amount_in_reservation?: boolean;
  to_confirm?: boolean;
  to_not_sending?: boolean;
  to_send?: boolean;
  to_cancle_reserve?: boolean;
}

const Reservations: React.FC = () => {
  const [userType, setUserType] = useState<
    "admin" | "user" | "storeKeeper" | "workshopManager" | null
  >(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [transferRecipient, setTransferRecipient] = useState("");
  const [transfer_workshop_Recipient, setTransfer_Workshop_Recipient] =
    useState("");
  const [transferReservation, setTransferReservation] =
    useState<Reservation | null>(null);
  const [currentUsername, setCurrentUsername] = useState("");
  const [editAmountModalVisible, setEditAmountModalVisible] = useState(false);
  const [editAmountReservation, setEditAmountReservation] =
    useState<Reservation | null>(null);
  const [editAmountValue, setEditAmountValue] = useState("");
  const [editAmountLoading, setEditAmountLoading] = useState(false);
// Add this line
const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

// Update counts to include transfer_total
const [counts, setCounts] = useState({
  cancelled_last_5_days: 0,
  delivered_last_5_days: 0,
  pending_total: 0,
  sent_total: 0,
  requested_total: 0,
  returned_from_workshops_total: 0,
  transfer_total: 0, // NEW
});
  const [users, setUsers] = useState<{ id: number; username: string }[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [transferDestinationType, setTransferDestinationType] = useState<
    "user" | "workshop" | null
  >(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);

  // Ref for FlatList
  const flatListRef = useRef<FlatList>(null);

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("لم يتم العثور على رمز المصادقة");
      const response = await fetch(
        `${API_BASE_URL}/users_no_boss_no_workshop_managers/`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) throw new Error("فشل في جلب المستخدمين");
      const data = await response.json();
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (error) {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const [workshops, setWorkshops] = useState<{ id: number; name: string }[]>(
    []
  );
  const [workshopsLoading, setWorkshopsLoading] = useState(false);
  const fetchWorkshops = async () => {
    setWorkshopsLoading(true);
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("لم يتم العثور على رمز المصادقة");
      const response = await fetch(`${API_BASE_URL}/workshops_has_manager/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("فشل في جلب المستخدمين");
      const data = await response.json();
      setWorkshops(Array.isArray(data.workshops) ? data.workshops : []);
    } catch (error) {
      setWorkshops([]);
    } finally {
      setWorkshopsLoading(false);
    }
  };

  const loadReservations = useCallback(
    async (
      repoId?: number | null,
      wsId?: number | null,
            statusFilter?: string | null, // <-- NEW

      page: number = 1,
      append: boolean = false
    ) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      try {
        const token = await AsyncStorage.getItem("access_token");
        let url = `${API_BASE_URL}/newreservation/?page=${page}&limit=${itemsPerPage}`;
        const params = new URLSearchParams();
        if (repoId) params.append("reposotory_id", repoId.toString());
        if (wsId) params.append("workshop_id", wsId.toString());
                if (statusFilter) params.append("status", statusFilter); // <-- NEW

        if (params.toString()) url += "&" + params.toString();
        const res = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = (await res.json()) as {
          is_manager: boolean;
          is_store_keeper: boolean;
          is_workshop_manager: boolean;
          details: any[];
          username: string;
          counts: any;
        };

        // ONLY update these if it is the first page (page === 1)
        if (page === 1) {
          setUserType(
            data.is_manager
              ? "admin"
              : data.is_store_keeper
              ? "storeKeeper"
              : data.is_workshop_manager
              ? "workshopManager"
              : "user"
          );
          setCurrentUsername(data.username || "");

          if (data.counts) {
            setCounts({
              cancelled_last_5_days: data.counts.cancelled_last_5_days || 0,
              delivered_last_5_days: data.counts.delivered_last_5_days || 0,
              pending_total: data.counts.pending_total || 0,
              sent_total: data.counts.sent_total || 0,
              requested_total: data.counts.requested_total || 0,
              returned_from_workshops_total:
                data.counts.returned_from_workshops_total || 0,
                              transfer_total: data.counts.transfer_total || 0, // <-- NEW

            });
          }
        }
        
        const mapped = data.details.map((n) => {
          let status: ReservationStatus = "pending";
          if (n.reservation_type === "delivered") status = "delivered";
          else if (n.reservation_type === "cancelled") status = "cancelled";
          else if (n.reservation_type === "sent") status = "sent";
          else if (n.reservation_type === "requested for workshops")
            status = "requested for workshops";
          else if (n.reservation_type === "returned from workshops")
            status = "returned from workshops";
          return {
            id: n.id,
            itemName: n.name,
            category: n.type,
            quantity: n.amount,
            employeeName: n.username,
            newEmployeeName: n.newusername,
            workshop_name: n.workshop_name,
            date: new Date(n.finalActionTime).toLocaleDateString("ar-EG"),
            status,
            notes: n.description,
            to_send_to_workshop: n.to_send_to_workshop,
            reservation_type: n.reservation_type,
            to_cancle_confirm_turning: n.to_cancle_confirm_turning,
            to_turn: n.to_turn,
            to_edit_amount_in_reservation: n.to_edit_amount_in_reservation,
            to_confirm: n.to_confirm,
            to_not_sending: n.to_not_sending,
            to_send: n.to_send,
            to_cancle_reserve: n.to_cancle_reserve,
            newWorkshop_name: n.newWorkshop_name || "",
          };
        });

        if (append) {
          setReservations((prev) => [...prev, ...mapped]);
          setAllReservations((prev) => [...prev, ...mapped]);
        } else {
          setReservations(mapped);
          setAllReservations(mapped);
        }

        // Check if there are more items
        const hasMoreItems = mapped.length === itemsPerPage;
        setHasMore(hasMoreItems);
      } catch (e) {
        console.error(e);
        Alert.alert("خطأ", "فشل في جلب الحجوزات");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [itemsPerPage]
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setCurrentPage(1);
    setHasMore(true);
await loadReservations(selectedRepositoryId, selectedWorkshopId, selectedStatus, 1, false);
    setIsRefreshing(false);
  };

  const [repositories, setRepositories] = useState<
    { id: number; name: string }[]
  >([]);
  const [repositoriesLoading, setRepositoriesLoading] = useState(false);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<
    number | null
  >(null);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<number | null>(
    null
  );

  const handleRepositoryPress = async (id: number) => {
    setSelectedRepositoryId(id);
    setSelectedWorkshopId(null);
    setCurrentPage(1);
    setHasMore(true);
    await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_REPO_ID, id.toString());
    await AsyncStorage.removeItem(STORAGE_KEYS.SELECTED_WORKSHOP_ID);
loadReservations(id, null, selectedStatus, 1, false);
  };

  const handleWorkshopPress = async (id: number) => {
    setSelectedWorkshopId(id);
    setSelectedRepositoryId(null);
    setCurrentPage(1);
    setHasMore(true);
    await AsyncStorage.setItem(
      STORAGE_KEYS.SELECTED_WORKSHOP_ID,
      id.toString()
    );
    await AsyncStorage.removeItem(STORAGE_KEYS.SELECTED_REPO_ID);
loadReservations(null, id, selectedStatus, 1, false);
  };

  const fetchRepositories = async () => {
    setRepositoriesLoading(true);
    try {
      const token = await AsyncStorage.getItem("access_token");
      const response = await fetch(`${API_BASE_URL}/reposotory_for_showing/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("فشل في جلب المستودعات");
      const data = await response.json();
      let repos = [];
      if (Array.isArray(data)) {
        repos = data;
      } else if (data.reposotories && Array.isArray(data.reposotories)) {
        repos = data.reposotories;
      } else if (data.repositories && Array.isArray(data.repositories)) {
        repos = data.repositories;
      } else if (data.data && Array.isArray(data.data)) {
        repos = data.data;
      }
      setRepositories(
        repos.map((item) => ({
          id: item.id,
          name: item.name,
        }))
      );
    } catch (error) {
      console.error(error);
      setRepositories([]);
    } finally {
      setRepositoriesLoading(false);
    }
  };

  const STORAGE_KEYS = {
    SELECTED_REPO_ID: "selectedRepositoryId",
    SELECTED_WORKSHOP_ID: "selectedWorkshopId",
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", async () => {
      const storedRepoId = await AsyncStorage.getItem(
        STORAGE_KEYS.SELECTED_REPO_ID
      );
      const storedWsId = await AsyncStorage.getItem(
        STORAGE_KEYS.SELECTED_WORKSHOP_ID
      );
      const repoId = storedRepoId ? parseInt(storedRepoId, 10) : null;
      const wsId = storedWsId ? parseInt(storedWsId, 10) : null;
      setSelectedRepositoryId(repoId);
      setSelectedWorkshopId(wsId);
      setCurrentPage(1);
      setHasMore(true);
loadReservations(repoId, wsId, selectedStatus, 1, false);
      fetchUsers();
      fetchWorkshops();
      fetchRepositories();
    });
    return unsubscribe;
  }, [navigation, loadReservations]);

  const loadMoreReservations = async () => {
    if (loadingMore || !hasMore) return;
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
   await loadReservations(selectedRepositoryId, selectedWorkshopId, selectedStatus, nextPage, true);

  };

  const handleSend = async (r: Reservation) => {
    try {
      if (r.reservation_type === "requested for workshops") {
        const response = await sendRequestedReservation({
          Reservation_id: r.id,
          username: r.employeeName,
        });
        if (response.status >= 200 && response.status < 300) {
          Alert.alert("تم", "تم إرسال الحجز بنجاح");
          setCurrentPage(1);
          setHasMore(true);
loadReservations(selectedRepositoryId, selectedWorkshopId, selectedStatus, 1, false);
        } else {
          const errorData = response.data;
          if (
            errorData.error &&
            errorData.error.includes("هناك حجز مطلوب لصالح ورشة لهذه المادة")
          ) {
            Alert.alert(
              "خطأ",
              "هناك حجز مطلوب لصالح ورشة لهذه المادة. قم بمعالجة ذلك الحجز اولا."
            );
            return;
          }
          throw new Error(errorData.error || "Failed to send reservation");
        }
      } else {
        const response = await sendReservation({
          Reservation_id: r.id,
          username: r.employeeName,
        });
        if (response.status >= 200 && response.status < 300) {
          Alert.alert("تم", "تم إرسال الحجز بنجاح");
          setCurrentPage(1);
          setHasMore(true);
loadReservations(selectedRepositoryId, selectedWorkshopId, selectedStatus, 1, false);
        } else {
          const errorData = response.data;
          if (
            errorData.error &&
            errorData.error.includes("هناك حجز مطلوب لصالح ورشة لهذه المادة")
          ) {
            Alert.alert(
              "خطأ",
              "هناك حجز مطلوب لصالح ورشة لهذه المادة. قم بمعالجة ذلك الحجز اولا."
            );
            return;
          }
          throw new Error(errorData.error || "Failed to send reservation");
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.response) {
        const errorData = err.response.data;
        if (
          errorData.error &&
          errorData.error.includes("هناك حجز مطلوب لصالح ورشة لهذه المادة")
        ) {
          Alert.alert(
            "خطأ",
            "هناك حجز مطلوب لصالح ورشة لهذه المادة. قم بمعالجة ذلك الحجز اولا."
          );
          return;
        }
        Alert.alert("خطأ", errorData.error || "فشل في إرسال الحجز");
      } else {
        Alert.alert("خطأ", err.message || "فشل في إرسال الحجز");
      }
    }
  };

  const openEditAmountModal = (r: Reservation) => {
    setEditAmountReservation(r);
    setEditAmountValue("");
    setEditAmountModalVisible(true);
  };

  const closeEditAmountModal = () => {
    setEditAmountModalVisible(false);
    setEditAmountReservation(null);
    setEditAmountValue("");
  };

  const handleEditAmount = async () => {
    if (!editAmountReservation) return;
    const newAmount = Number(editAmountValue);
    if (!editAmountValue.trim() || isNaN(newAmount) || newAmount <= 0) {
      Alert.alert("خطأ", "يرجى إدخال كمية صحيحة (رقم موجب)");
      return;
    }
    setEditAmountLoading(true);
    try {
      const token = await AsyncStorage.getItem("access_token");
      const response = await fetch(
        `${API_BASE_URL}/edit_amount_in_reservation/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            reservation_id: editAmountReservation.id,
            new_amount: newAmount,
          }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            errorData.detail ||
            `فشل في تعديل الكمية (${response.status})`
        );
      }
      Alert.alert("تم", "تم تعديل الكمية بنجاح");
      closeEditAmountModal();
      setCurrentPage(1);
      setHasMore(true);
loadReservations(selectedRepositoryId, selectedWorkshopId, selectedStatus, 1, false);
    } catch (err: any) {
      console.error(err);
      Alert.alert("خطأ", err.message || "فشل في تعديل الكمية");
    } finally {
      setEditAmountLoading(false);
    }
  };

  const openTransferModal = (r: Reservation) => {
    setTransferReservation(r);
    setTransferRecipient("");
    setTransfer_Workshop_Recipient("");
    setTransferDestinationType(null);
    setTransferModalVisible(true);
  };

  const closeTransferModal = () => {
    setTransferModalVisible(false);
    setTransferReservation(null);
    setTransferRecipient("");
    setTransfer_Workshop_Recipient("");
    setTransferDestinationType(null);
  };

  const handleTransfer = async () => {
    if (!transferReservation) return;
    if (!transferRecipient.trim() && !transfer_workshop_Recipient.trim()) {
      Alert.alert("خطأ", "يرجى اختيار مستلم أو ورشة");
      return;
    }
    try {
      const token = await AsyncStorage.getItem("access_token");
      const res = await fetch(`${API_BASE_URL}/turnResevation/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reservation_id: transferReservation.id,
          new_username: transferRecipient.trim(),
          new_workshop_name: transfer_workshop_Recipient.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data && (data.error || data.detail)) || `Status ${res.status}`
        );
      }
      Alert.alert("تم", "تم تحويل الحجز بنجاح");
      closeTransferModal();
      setCurrentPage(1);
      setHasMore(true);
loadReservations(selectedRepositoryId, selectedWorkshopId, selectedStatus, 1, false);
    } catch (err: any) {
      console.error(err);
      Alert.alert("خطأ", err.message || "فشل في تحويل الحجز");
    }
  };

  const handleConfirm = async (r: Reservation) => {
    try {
      if (r.reservation_type === "returned from workshops") {
        await confirmRequestedReservation({
          Reservation_id: r.id,
          username: r.employeeName,
        });
      } else {
        await confirmReservation({
          Reservation_id: r.id,
          username: r.employeeName,
        });
      }
      Alert.alert("تم", "تم تأكيد التسليم بنجاح");
      setCurrentPage(1);
      setHasMore(true);
loadReservations(selectedRepositoryId, selectedWorkshopId, selectedStatus, 1, false);
    } catch (err: any) {
      console.error(err);
      Alert.alert("خطأ", err.response?.data?.error || "فشل في تأكيد التسليم");
    }
  };

  const handleCancel = async (r: Reservation) => {
    try {
      if (r.reservation_type === "requested for workshops") {
        await cancelRequestedReservation({
          Reservation_id: r.id,
          username: r.employeeName,
        });
      } else {
        await cancelReservation({
          Reservation_id: r.id,
          username: r.employeeName,
        });
      }
      Alert.alert("تم", "تم إلغاء الحجز بنجاح");
      setCurrentPage(1);
      setHasMore(true);
loadReservations(selectedRepositoryId, selectedWorkshopId, selectedStatus, 1, false);
    } catch (err: any) {
      console.error(err);
      Alert.alert("خطأ", err.response?.data?.error || "فشل في إلغاء الحجز");
    }
  };

  const handleConfirmTransfer = async (r: Reservation) => {
    try {
      const token = await AsyncStorage.getItem("access_token");
      const res = await fetch(`${API_BASE_URL}/confirmTurnResevation/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          Reservation_id: r.id,
        }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      Alert.alert("تم", "تم تأكيد استلام التحويل");
      setCurrentPage(1);
      setHasMore(true);
loadReservations(selectedRepositoryId, selectedWorkshopId, selectedStatus, 1, false);
    } catch (err: any) {
      console.error(err);
      Alert.alert("خطأ", err.message || "فشل في تأكيد التحويل");
    }
  };

  const handleCancelTransfer = async (r: Reservation) => {
    try {
      const token = await AsyncStorage.getItem("access_token");
      const res = await fetch(`${API_BASE_URL}/cancelTurnResevation/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          Reservation_id: r.id,
        }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      Alert.alert("تم", "تم إلغاء التحويل");
      setCurrentPage(1);
      setHasMore(true);
loadReservations(selectedRepositoryId, selectedWorkshopId, selectedStatus, 1, false);
    } catch (err: any) {
      console.error(err);
      Alert.alert("خطأ", err.message || "فشل في إلغاء التحويل");
    }
  };

  const getStatusStyles = (status: ReservationStatus) => {
    switch (status) {
      case "delivered":
        return {
          bg: "#D1FAE5",
          color: "#22c55e",
          icon: <CheckCircle size={16} color="#22c55e" />,
        };
      case "cancelled":
        return {
          bg: "#FEE2E2",
          color: "#DC2626",
          icon: <XCircle size={16} color="#DC2626" />,
        };
      case "sent":
        return {
          bg: "#FFEDD5",
          color: "#F97316",
          icon: <Send size={16} color="#F97316" />,
        };
      default:
        return {
          bg: "#DBEAFE",
          color: "#3b82f6",
          icon: <AlertCircle size={16} color="#3b82f6" />,
        };
    }
  };

  const getStatusIcon = (status: ReservationStatus) => {
    switch (status) {
      case "delivered":
        return <Ionicons name="checkmark-circle" size={20} color="#22c55e" />;
      case "cancelled":
        return <Ionicons name="close-circle" size={20} color="#DC2626" />;
      case "sent":
        return <Ionicons name="send" size={20} color="#F97316" />;
      default:
        return <Ionicons name="time" size={20} color="#3b82f6" />;
    }
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerContainer}>
        <ActivityIndicator size="small" color="#3b82f6" />
        <Text style={styles.footerText}>جاري تحميل المزيد...</Text>
      </View>
    );
  };

  const renderEmptyComponent = () => {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="event-note" size={64} color="#cbd5e1" />
        <Text style={styles.emptyText}>لا توجد حجوزات مسجلة</Text>
      </View>
    );
  };

  if (userType === null) {
    return <AppLoader />;
  }

  const renderListHeader = () => {
    return (
      <View>
        <View style={commonStyles.header}>
          <Text style={commonStyles.title}>الحجوزات</Text>
          <Text style={commonStyles.subtitle}>إدارة طلبات الحجز</Text>
        </View>

      <View style={styles.stats}>
          {(
            [
              { key: "pending", label: "قيد الانتظار", countKey: "pending_total" },
              { key: "requested for workshops", label: "مطلوب للتأمين", countKey: "requested_total" },
              { key: "returned from workshops", label: "عائد من ورشة", countKey: "returned_from_workshops_total" },
              { key: "sent", label: "تم الإرسال", countKey: "sent_total" },
              { key: "delivered", label: "تم التسليم", countKey: "delivered_last_5_days" },
              { key: "cancelled", label: "ملغي", countKey: "cancelled_last_5_days" },
            ] as Array<{ key: ReservationStatus; label: string; countKey: keyof typeof counts }>
          ).map(({ key, label, countKey }) => {
            const count = counts[countKey];
            const s = getStatusStyles(key);
            const isActive = selectedStatus === key; // Check if active

            const handleStatusFilter = () => {
              const newStatus = selectedStatus === key ? null : key; // Toggle filter on/off
              setSelectedStatus(newStatus);
              setCurrentPage(1);
              setHasMore(true);
              loadReservations(selectedRepositoryId, selectedWorkshopId, newStatus, 1, false);
            };

            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.statCard, 
                  { borderColor: s.color },
                  isActive && { backgroundColor: s.color } // Change background if active
                ]}
                onPress={handleStatusFilter}
                activeOpacity={0.8}
              >
                <Text style={[styles.statNumber, { color: isActive ? "#fff" : s.color }]}>{count}</Text>
                <Text style={[styles.statLabel, isActive && { color: "#fff" }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
          
          {/* Now rendering Transfers stat card correctly using backend count! */}
          {(() => {
            const color = "#F59E0B";
            const isActive = selectedStatus === "transfer";
            
            const handleTransferFilter = () => {
              const newStatus = selectedStatus === "transfer" ? null : "transfer";
              setSelectedStatus(newStatus);
              setCurrentPage(1);
              setHasMore(true);
              loadReservations(selectedRepositoryId, selectedWorkshopId, newStatus, 1, false);
            };

            return (
              <TouchableOpacity
                key="transfer"
                style={[
                  styles.statCard, 
                  { borderColor: color },
                  isActive && { backgroundColor: color }
                ]}
                onPress={handleTransferFilter}
                activeOpacity={0.8}
              >
                <Text style={[styles.statNumber, { color: isActive ? "#fff" : color }]}>{counts.transfer_total}</Text>
                <Text style={[styles.statLabel, isActive && { color: "#fff" }]}>قيد التحويل</Text>
              </TouchableOpacity>
            );
          })()}
        </View>

      {(selectedRepositoryId !== null || selectedWorkshopId !== null || selectedStatus !== null) && (
          <View style={styles.globalClearContainer}>
            <TouchableOpacity
              onPress={async () => {
                setSelectedRepositoryId(null);
                setSelectedWorkshopId(null);
                setSelectedStatus(null); // Clear status too
                setCurrentPage(1);
                setHasMore(true);
                await AsyncStorage.removeItem(STORAGE_KEYS.SELECTED_REPO_ID);
                await AsyncStorage.removeItem(STORAGE_KEYS.SELECTED_WORKSHOP_ID);
                loadReservations(null, null, null, 1, false); // pass null for status
              }}
              style={styles.globalClearButton}
            >
              <Ionicons name="close-circle" size={18} color="#ef4444" />
              <Text style={styles.globalClearText}>إلغاء جميع التصفيات</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={{ width: "100%" }}>
          <View style={styles.filterRow}>
            <Text style={styles.filterRowTitle}>المستودعات:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.filterScroll} contentContainerStyle={styles.filterScrollContent}>
              {repositoriesLoading ? (
                <ActivityIndicator size="small" color="#3b82f6" style={styles.filterLoader} />
              ) : (
                repositories.map((repo) => (
                  <TouchableOpacity
                    key={repo.id}
                    style={[styles.filterChip, selectedRepositoryId === repo.id && styles.filterChipActive]}
                    onPress={() => handleRepositoryPress(repo.id)}
                  >
                    <Text style={[styles.filterChipText, selectedRepositoryId === repo.id && styles.filterChipTextActive]}>{repo.name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>

          <View style={styles.filterRow}>
            <Text style={styles.filterRowTitle}>الورش:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.filterScroll} contentContainerStyle={styles.filterScrollContent}>
              {workshopsLoading ? (
                <ActivityIndicator size="small" color="#3b82f6" style={styles.filterLoader} />
              ) : (
                workshops.map((ws) => (
                  <TouchableOpacity
                    key={ws.id}
                    style={[styles.filterChip, selectedWorkshopId === ws.id && styles.filterChipActive]}
                    onPress={() => handleWorkshopPress(ws.id)}
                  >
                    <Text style={[styles.filterChipText, selectedWorkshopId === ws.id && styles.filterChipTextActive]}>{ws.name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    );
  };

  return (
    <MainLayout userType={userType}>
      {loading && reservations.length === 0 ? (
        <AppLoader />
      ) : (
        <View style={[commonStyles.container, { flex: 1, paddingBottom: 0 }]}>
          <FlatList
            ref={flatListRef}
            data={reservations}
            keyExtractor={(item) => item.id.toString()}
            ListHeaderComponent={renderListHeader}
            ListEmptyComponent={!loadingMore ? renderEmptyComponent() : null}
            onEndReached={loadMoreReservations}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            onRefresh={handleRefresh}
            refreshing={isRefreshing}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => {
              const s = getStatusStyles(item.status);
              const isTransferPending = Boolean(item.newEmployeeName);
              return (
                <View style={[styles.card, { borderLeftColor: s.color }]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitle}>
                      <Text style={styles.itemName}>{item.itemName}</Text>
                      <View style={styles.categoryRow}>
                        <Package size={12} color="#6B7280" />
                        <Text style={styles.categoryText}>{item.category}</Text>
                      </View>
                    </View>
                    <View style={[styles.badge, { backgroundColor: isTransferPending ? "#FFEDD5" : s.bg }]}>
                      {isTransferPending ? (
                        <Ionicons name="swap-horizontal" size={16} color="#F59E0B" />
                      ) : (
                        getStatusIcon(item.status)
                      )}
                      <Text style={[styles.badgeText, { color: isTransferPending ? "#F59E0B" : s.color }]}>
                        {isTransferPending
                          ? "قيد التحويل"
                          : item.status === "pending"
                          ? "قيد الانتظار"
                          : item.status === "sent"
                          ? "تم الإرسال"
                          : item.status === "delivered"
                          ? "تم التسليم"
                          : item.status === "requested for workshops"
                          ? "مطلوب للتأمين"
                          : item.status === "returned from workshops"
                          ? "عائد من ورشة"
                          : "ملغي"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.infoRow}>
                    <View style={styles.userInfo}>
                      <Ionicons name="person-outline" size={12} color="#6B7280" />
                      <Text style={styles.infoValue}>{item.employeeName}</Text>
                    </View>
                    <View style={styles.quantity}>
                      <Text style={[styles.quantityNumber, { color: "#3b82f6" }]}>{item.quantity}</Text>
                      <Text style={styles.quantityLabel}>الكمية</Text>
                    </View>
                  </View>
                  {item.workshop_name && (
                    <View style={styles.userInfo}>
                      <Ionicons name="business-outline" size={12} color="#6B7280" />
                      <Text style={styles.infoValue}>{item.workshop_name}</Text>
                    </View>
                  )}
                  {!!item.newWorkshop_name && (
                    <View style={styles.userInfo}>
                      <Ionicons name="business-outline" size={12} color="#6B7280" />
                      <Text style={styles.infoValue}>{item.newWorkshop_name}: الورشة المستلمة</Text>
                    </View>
                  )}
                  {!item.newWorkshop_name && item.newEmployeeName && (
                    <View style={styles.userInfo}>
                      <Ionicons name="person-outline" size={12} color="#6B7280" />
                      <Text style={styles.infoValue}>{item.newEmployeeName}: المستلم</Text>
                    </View>
                  )}
                  <View style={styles.dateRow}>
                    <Ionicons name="time-outline" size={12} color="#6B7280" />
                    <Text style={styles.dateText}>{item.date}</Text>
                  </View>
                  {item.notes && (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesText}>{item.notes}</Text>
                    </View>
                  )}
                  
                  <View style={styles.actions}>
                    {item.to_send && (
                      <TouchableOpacity onPress={() => handleSend(item)} style={[styles.btn, styles.btnOrange]}>
                        <Ionicons name="send" size={14} color="#fff" />
                        <Text style={styles.btnTextWhite}>إرسال</Text>
                      </TouchableOpacity>
                    )}
                    {item.to_send_to_workshop && !item.to_send && (
                      <TouchableOpacity onPress={() => handleSend(item)} style={[styles.btn, styles.btnOrange]}>
                        <Ionicons name="send" size={14} color="#fff" />
                        <Text style={styles.btnTextWhite}>إرسال</Text>
                      </TouchableOpacity>
                    )}
                    {item.to_edit_amount_in_reservation && (
                      <TouchableOpacity onPress={() => openEditAmountModal(item)} style={[styles.btn, styles.btnYellow]}>
                        <Text style={styles.btnTextWhite}>تعديل الكمية</Text>
                      </TouchableOpacity>
                    )}
                    {item.to_not_sending && (
                      <TouchableOpacity onPress={() => handleCancel(item)} style={[styles.btn, styles.btnRed]}>
                        <Ionicons name="close-circle" size={14} color="#fff" />
                        <Text style={styles.btnTextWhite}>إلغاء الارسال</Text>
                      </TouchableOpacity>
                    )}
                    {item.to_cancle_reserve && !item.to_not_sending && (
                      <TouchableOpacity onPress={() => handleCancel(item)} style={[styles.btn, styles.btnRed]}>
                        <Ionicons name="close-circle" size={14} color="#fff" />
                        <Text style={styles.btnTextWhite}>إلغاء الحجز</Text>
                      </TouchableOpacity>
                    )}
                    {item.to_confirm && (
                      <TouchableOpacity onPress={() => handleConfirm(item)} style={[styles.btn, styles.btnGreen]}>
                        <Ionicons name="checkmark-circle" size={14} color="#fff" />
                        <Text style={styles.btnTextWhite}>تاكيد الاستلام</Text>
                      </TouchableOpacity>
                    )}
                    {item.to_cancle_confirm_turning && (
                      <>
                        <TouchableOpacity onPress={() => handleConfirmTransfer(item)} style={[styles.btn, styles.btnGreen]}>
                          <Text style={styles.btnTextWhite}> استلام التحويل</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleCancelTransfer(item)} style={[styles.btn, styles.btnRed]}>
                          <Text style={styles.btnTextWhite}>إلغاء التحويل</Text>
                        </TouchableOpacity>
                      </>
                    )}
                    {item.to_turn && (
                      <TouchableOpacity onPress={() => openTransferModal(item)} style={[styles.btn, styles.btnYellow]}>
                        <Text style={styles.btnTextWhite}>تحويل</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}

      <Modal visible={transferModalVisible} animationType="fade" transparent={true} onRequestClose={closeTransferModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.elevatedModal]}>
            <Text style={styles.modalTitle}>تحويل الحجز</Text>
            <View style={styles.unifiedDestinationBox}>
              <Text style={styles.unifiedBoxTitle}>اختر نوع المستلم</Text>
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[styles.toggleButton, transferDestinationType === "user" && styles.toggleButtonActive]}
                  onPress={() => {
                    setTransferDestinationType("user");
                    setTransfer_Workshop_Recipient("");
                  }}
                >
                  <Text style={[styles.toggleButtonText, transferDestinationType === "user" && styles.toggleButtonTextActive]}>مستلم</Text>
                  {transferDestinationType === "user" && <View style={styles.toggleIndicator} />}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, { borderRightWidth: 0 }, transferDestinationType === "workshop" && styles.toggleButtonActive]}
                  onPress={() => {
                    setTransferDestinationType("workshop");
                    setTransferRecipient("");
                  }}
                >
                  <Text style={[styles.toggleButtonText, transferDestinationType === "workshop" && styles.toggleButtonTextActive]}>ورشة</Text>
                  {transferDestinationType === "workshop" && <View style={styles.toggleIndicator} />}
                </TouchableOpacity>
              </View>
              {transferDestinationType === "user" && (
                <View style={styles.dropdownContainer}>
                  {usersLoading ? (
                    <View style={styles.pickerLoadingContainer}>
                      <ActivityIndicator size="small" color="#3b82f6" />
                      <Text style={styles.loadingTextSmall}>جاري تحميل المستخدمين...</Text>
                    </View>
                  ) : (
                    <View style={styles.pickerWrapper}>
                      <Picker selectedValue={transferRecipient} onValueChange={(itemValue) => setTransferRecipient(itemValue)} style={styles.picker} dropdownIconColor="#4B5563">
                        <Picker.Item label="اختر المستلم..." value="" color="#94a3b8" style={{ fontSize: 16, paddingVertical: 12 }} />
                        {users.map((user) => (
                          <Picker.Item key={user.id} label={user.username} value={user.username} style={{ fontSize: 16, fontWeight: "500", paddingVertical: 12 }} />
                        ))}
                      </Picker>
                    </View>
                  )}
                </View>
              )}
              {transferDestinationType === "workshop" && (
                <View style={styles.dropdownContainer}>
                  {workshopsLoading ? (
                    <View style={styles.pickerLoadingContainer}>
                      <ActivityIndicator size="small" color="#3b82f6" />
                      <Text style={styles.loadingTextSmall}>جاري تحميل الورشات...</Text>
                    </View>
                  ) : (
                    <View style={styles.pickerWrapper}>
                      <Picker selectedValue={transfer_workshop_Recipient} onValueChange={(itemValue) => setTransfer_Workshop_Recipient(itemValue)} style={styles.picker} dropdownIconColor="#4B5563">
                        <Picker.Item label="اختر ورشة العمل..." value="" color="#94a3b8" style={{ fontSize: 16, paddingVertical: 12 }} />
                        {workshops.map((workshop) => (
                          <Picker.Item key={workshop.id} label={workshop.name} value={workshop.name} style={{ fontSize: 16, fontWeight: "500", paddingVertical: 12 }} />
                        ))}
                      </Picker>
                    </View>
                  )}
                </View>
              )}
              {!transferDestinationType && <Text style={styles.placeholderText}>يرجى اختيار نوع المستلم أولاً</Text>}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.transferCancelButton, styles.elevatedButton]} onPress={closeTransferModal} activeOpacity={0.8}>
                <Text style={styles.transferCancelText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.transferConfirmButton, styles.elevatedButton, !transferRecipient && !transfer_workshop_Recipient && styles.saveButtonDisabled]}
                onPress={handleTransfer}
                activeOpacity={!transferRecipient && !transfer_workshop_Recipient ? 1 : 0.8}
                disabled={!transferRecipient && !transfer_workshop_Recipient}
              >
                <Text style={styles.transferConfirmText}>تأكيد التحويل</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={editAmountModalVisible} animationType="fade" transparent={true} onRequestClose={closeEditAmountModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.elevatedModal]}>
            <Text style={styles.modalTitle}>تعديل الكمية</Text>
            <Text style={styles.inputLabel}>الكمية الجديدة</Text>
            <TextInput
              style={styles.numberInput}
              keyboardType="numeric"
              value={editAmountValue}
              onChangeText={setEditAmountValue}
              placeholder="أدخل الكمية"
              placeholderTextColor="#9CA3AF"
              textAlign="right"
              editable={!editAmountLoading}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.cancelButton, styles.elevatedButton]} onPress={closeEditAmountModal} disabled={editAmountLoading} activeOpacity={0.8}>
                <Text style={styles.cancelText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, styles.elevatedButton, editAmountLoading && styles.saveButtonDisabled]}
                onPress={handleEditAmount}
                disabled={editAmountLoading}
                activeOpacity={0.8}
              >
                {editAmountLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>تأكيد</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  fullScreenLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  btnOrange: {
    backgroundColor: "#3b82f6",
  },
  content: {
    padding: 0,
    paddingBottom: 80,
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#3b82f6",
    fontWeight: "500",
  },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  statCard: {
    width: "48%",
    minWidth: "48%",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    padding: 14,
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderLeftWidth: 3,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  cardTitle: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 4,
    textAlign: "right",
  },
  categoryRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
  },
  categoryText: {
    fontSize: 12,
    color: "#64748b",
    marginRight: 4,
  },
  badge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  infoLabel: {
    fontSize: 10,
    color: "#64748b",
  },
  infoValue: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    position: "relative",
  },
  elevatedModal: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "center",
    marginBottom: 20,
  },
  pickerBeautifulContainer: {
    width: "100%",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    marginBottom: 24,
    overflow: "hidden",
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  pickerBeautiful: {
    width: "100%",
    height: 56,
    color: "#1F2937",
    textAlign: "right",
    paddingRight: 16,
    fontSize: 18,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#3B82F6",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 0,
  },
  saveButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  elevatedButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  cancelText: {
    color: "#4B5563",
    fontSize: 17,
    fontWeight: "600",
  },
  saveText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  saveTextDisabled: {
    color: "#F9FAFB",
  },
  quantity: {
    alignItems: "center",
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  quantityNumber: {
    fontSize: 16,
    fontWeight: "bold",
  },
  quantityLabel: {
    fontSize: 10,
    color: "#64748b",
  },
  dateRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: "#f8fafc",
    padding: 6,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  dateText: {
    fontSize: 11,
    color: "#64748b",
    marginRight: 4,
  },
  notesBox: {
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    borderLeftWidth: 2,
    borderLeftColor: "#e2e8f0",
  },
  notesText: {
    fontSize: 12,
    color: "#475569",
    textAlign: "right",
    lineHeight: 18,
  },
  actions: {
    flexDirection: "column",
    gap: 10,
    marginBottom: 8,
  },
  btn: {
    width: "100%",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 4,
  },
  btnGreen: {
    backgroundColor: "#22c55e",
  },
  btnRed: {
    backgroundColor: "#dc2626",
  },
  btnTextWhite: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  btnYellow: {
    backgroundColor: "#f59e0b",
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    alignSelf: "flex-start",
    marginBottom: 8,
    marginTop: 8,
  },
  numberInput: {
    width: "100%",
    height: 56,
    backgroundColor: "#F9FAFB",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 18,
    color: "#1F2937",
    marginBottom: 24,
    textAlignVertical: "center",
  },
  unifiedDestinationBox: {
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    padding: 20,
    width: "100%",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  unifiedBoxTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
    textAlign: "right",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
    position: "relative",
    backgroundColor: "white",
  },
  toggleButtonActive: {
    backgroundColor: "#3b82f6",
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f59e0b",
    letterSpacing: -0.2,
  },
  toggleButtonTextActive: {
    color: "white",
  },
  toggleIndicator: {
    position: "absolute",
    bottom: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3b82f6",
  },
  dropdownContainer: {
    marginTop: 12,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f8fafc",
  },
  picker: {
    width: "100%",
    height: 56,
    color: "#0f172a",
    fontSize: 16,
    textAlign: "right",
    paddingHorizontal: 12,
  },
  pickerLoadingContainer: {
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingTextSmall: {
    marginTop: 8,
    fontSize: 14,
    color: "#64748b",
  },
  placeholderText: {
    fontSize: 15,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 16,
    fontStyle: "italic",
    fontWeight: "500",
  },
  transferCancelButton: {
    flex: 1,
    backgroundColor: "#dc2626",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 0,
    marginHorizontal: 4,
  },
  transferConfirmButton: {
    flex: 1,
    backgroundColor: "#22c55e",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 0,
    marginHorizontal: 4,
  },
  transferCancelText: {
    color: "white",
    fontSize: 17,
    fontWeight: "600",
  },
  filterRowHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  clearButton: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#fee2e2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  clearButtonText: {
    fontSize: 12,
    color: "#ef4444",
    fontWeight: "500",
  },
  globalClearContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
    alignItems: "flex-end",
  },
  globalClearButton: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#fee2e2",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  globalClearText: {
    fontSize: 14,
    color: "#ef4444",
    fontWeight: "600",
  },
  transferConfirmText: {
    color: "white",
    fontSize: 17,
    fontWeight: "600",
  },
  filtersContainer: {
    width: "100%",
    paddingVertical: 8,
  },
  filterRow: {
    marginBottom: 16,
    width: "100%",
  },
  filterRowTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8,
    textAlign: "right",
    paddingHorizontal: 16,
  },
  filterScroll: {
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  filterScrollContent: {
    alignItems: "center",
    paddingRight: 8,
  },
  filterChip: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    minWidth: 60,
  },
  filterChipActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  filterChipText: {
    fontSize: 13,
    color: "#1e293b",
    fontWeight: "500",
    textAlign: "center",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  filterLoader: {
    marginLeft: 8,
    alignSelf: "center",
  },
  // ✅ Footer Styles for Pagination
  footerContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  footerText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#64748b",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
    paddingBottom: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
  },
});

export default Reservations;