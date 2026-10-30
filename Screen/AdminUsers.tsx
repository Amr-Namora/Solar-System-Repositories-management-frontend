import React, { useState, useEffect } from "react";
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
  ScrollView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { getStatusBarHeight } from "react-native-status-bar-height";
import { commonStyles } from "../styles/commonStyles";
import {
  Ionicons,
  MaterialIcons,
  Feather,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import MainLayout from "../component/MainLayout";
import RefreshableScreen from "../component/RefreshableScreen";
import { API_BASE_URL } from "./api2";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppLoader from "../component/AppLoader";
I18nManager.forceRTL(true);

interface Employee {
  id: number;
  username: string;
  role: string;
  is_active: boolean;
  date_joined: string;
  storeName: string;
  repositoryName: string;
}

interface Store {
  id: number;
  name: string;
}

const AdminUsers = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Employee | null>(null);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    confirm_password: "",
    role: "بائع", // Default is seller
    store_name: "",
    repository_name: "", // Add this line
  });
  const [showRepositoriesModal, setShowRepositoriesModal] = useState(false);
  const [showEditRepositoriesModal, setShowEditRepositoriesModal] =
    useState(false);
  const [repositories, setRepositories] = useState<any[]>([]);
  const [repositoriesLoading, setRepositoriesLoading] = useState(false);
  const [selectedRepositories, setSelectedRepositories] = useState<number[]>(
    [],
  );
  const [selectedEditRepositories, setSelectedEditRepositories] = useState<
    number[]
  >([]);
  const [editUser, setEditUser] = useState({
    username: "",
    password: "",
    confirm_password: "",
    role: "بائع", // Default is seller
    store_name: "",
    repository_name: "", // Add this line
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showStoresList, setShowStoresList] = useState(false);
  const [showStoresListEdit, setShowStoresListEdit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditConfirmPassword, setShowEditConfirmPassword] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("لم يتم العثور على رمز المصادقة");

      const response = await fetch(`${API_BASE_URL}/users/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("فشل في جلب المستخدمين");

      const data = await response.json();
      setEmployees(Array.isArray(data.users) ? data.users : []);
    } catch (error) {
      Alert.alert("خطأ", error.message || "فشل في تحميل المستخدمين");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  const fetchRepositories = async () => {
    try {
      setRepositoriesLoading(true);
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("لم يتم العثور على رمز المصادقة");

      const response = await fetch(`${API_BASE_URL}/reposotories/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("فشل في جلب المستودعات");

      const data = await response.json();
      setRepositories(
        Array.isArray(data.reposotories) ? data.reposotories : [],
      );
    } catch (error) {
      console.error("Error fetching repositories:", error);
      Alert.alert("خطأ", "فشل في تحميل المستودعات");
    } finally {
      setRepositoriesLoading(false);
    }
  };
  const fetchStores = async () => {
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("لم يتم العثور على رمز المصادقة");

      const response = await fetch(`${API_BASE_URL}/stores/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("فشل في جلب المتاجر");

      const data = await response.json();
      setStores(Array.isArray(data.stores) ? data.stores : []);
    } catch (error) {
      console.error("Error fetching stores:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchStores();
    fetchRepositories(); // Add this line
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchUsers(), fetchStores()]);
    } catch (error) {
      console.error("Refresh failed:", error);
      setRefreshing(false);
    }
  };

  const activeEmployees = employees.filter((e) => e.is_active).length;
  const inactiveEmployees = employees.filter((e) => !e.is_active).length;

  const handleAddUser = async () => {
    if (
      !newUser.username ||
      !newUser.password ||
      !newUser.confirm_password ||
      (!newUser.store_name &&
        newUser.role !== "مشرف الورشة" &&
        newUser.role !== "امين مستودع") ||
      (!newUser.repository_name && newUser.role === "امين مستودع")
    ) {
      Alert.alert("خطأ", "يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    if (newUser.password !== newUser.confirm_password) {
      Alert.alert("خطأ", "كلمة السر غير متطابقة");
      return;
    }
    if (newUser.role === "بائع" && selectedRepositories.length === 0) {
      Alert.alert("خطأ", "يرجى اختيار مستودع واحد على الأقل");
      return;
    }
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("لم يتم العثور على رمز المصادقة");

      const response = await fetch(`${API_BASE_URL}/signup/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: newUser.username,
          password: newUser.password,
          confirm_password: newUser.confirm_password,
          role: newUser.role,
          store_name: newUser.store_name,
          allowed_repositories: selectedRepositories, // Add this line
          repository_name: newUser.repository_name, // Add this line
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        let backendMessage = "";
        if (data) {
          if (typeof data.error === "string") backendMessage = data.error;
          else if (typeof data.message === "string")
            backendMessage = data.message;
          else if (typeof data === "object") {
            try {
              backendMessage = Object.entries(data)
                .map(
                  ([key, val]) =>
                    `${key}: ${Array.isArray(val) ? val.join(", ") : String(val)}`,
                )
                .join("\n");
            } catch {}
          }
        }
        if (backendMessage.includes("already exists")) {
          backendMessage = "هذا الاسم محجوز مسبقا";
        }
        throw new Error(backendMessage || "فشل في إضافة المستخدم");
      }

      Alert.alert("نجاح", (data && data.message) || "تم إضافة المستخدم بنجاح");
      setShowAddUserModal(false);
      setNewUser({
        username: "",
        password: "",
        confirm_password: "",
        role: "بائع",
        store_name: "",
        repository_name: "",
      });
      setShowPassword(false);
      setShowConfirmPassword(false);
      fetchUsers();
    } catch (error) {
      Alert.alert("خطأ", error.message || "حدث خطأ أثناء إضافة المستخدم");
    }
  };

  const handleEditUser = async () => {
    if (
      !editingUser ||
      !editUser.username ||
      (!editUser.store_name &&
        editUser.role !== "مشرف الورشة" &&
        editUser.role !== "امين مستودع") ||
      (!editUser.repository_name && editUser.role === "امين مستودع")
    ) {
      Alert.alert("خطأ", "يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    if (editUser.password && editUser.password !== editUser.confirm_password) {
      Alert.alert("خطأ", "كلمة السر غير متطابقة");
      return;
    }

    // Add validation for repositories
    if (editUser.role === "بائع" && selectedEditRepositories.length === 0) {
      Alert.alert("خطأ", "يرجى اختيار مستودع واحد على الأقل");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("لم يتم العثور على رمز المصادقة");

      const requestBody: any = {
        username: editUser.username,
        role: editUser.role,
        store_name: editUser.store_name,
        repository_name: editUser.repository_name,
      };

      // Include password only if provided
      if (editUser.password) {
        requestBody.password = editUser.password;
      }

      // Include allowed_repositories for sellers
      if (editUser.role === "بائع"||editUser) {
        requestBody.allowed_repositories = selectedEditRepositories;
      }

      const response = await fetch(
        `${API_BASE_URL}/users/${editingUser.id}/update/`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error && errorData.error.includes("already exists")) {
          throw new Error("هذا الاسم محجوز مسبقا");
        }
        throw new Error(errorData.error || "فشل في تحديث المستخدم");
      }

      Alert.alert("نجاح", "تم تحديث المستخدم بنجاح");
      setShowEditUserModal(false);
      setEditingUser(null);
      setEditUser({
        username: "",
        password: "",
        confirm_password: "",
        role: "بائع",
        store_name: "",
        repository_name: "",
      });
      setSelectedEditRepositories([]); // Reset repositories
      setShowEditPassword(false);
      setShowEditConfirmPassword(false);
      fetchUsers();
    } catch (error) {
      Alert.alert("خطأ", error.message || "حدث خطأ أثناء تحديث المستخدم");
    }
  };

  const openEditModal = async (user: Employee) => {
    setEditingUser(user);
    setEditUser({
      username: user.username,
      password: "",
      confirm_password: "",
      role: user.role,
      store_name: user.storeName || "",
      repository_name: user.repositoryName || "", // You may want to set this based on user data if available
    });

    // Fetch user's current allowed repositories
    try {
      const token = await AsyncStorage.getItem("access_token");
      const response = await fetch(
        `${API_BASE_URL}/user-allowed-repositories/${user.id}/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setSelectedEditRepositories(data.allowed_repositories || []);
      }
    } catch (error) {
      console.error("Error fetching user repositories:", error);
      setSelectedEditRepositories([]);
    }

    setShowEditUserModal(true);
  };

  const handleDeleteUser = async (id: number) => {
    Alert.alert(
      "تأكيد الحذف",
      "هل أنت متأكد من حذف هذا المستخدم؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("access_token");
              if (!token) throw new Error("لم يتم العثور على رمز المصادقة");

              const response = await fetch(
                `${API_BASE_URL}/users/${id}/delete/`,
                {
                  method: "DELETE",
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                },
              );

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "فشل في حذف المستخدم");
              }

              Alert.alert("نجاح", "تم حذف المستخدم بنجاح");
              fetchUsers();
            } catch (error) {
              Alert.alert("خطأ", error.message || "حدث خطأ أثناء حذف المستخدم");
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  const toggleUserStatus = async (id: number) => {
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) throw new Error("لم يتم العثور على رمز المصادقة");

      const response = await fetch(
        `${API_BASE_URL}/users/${id}/toggle-status/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "فشل في تغيير حالة المستخدم");
      }

      const result = await response.json();
      Alert.alert("نجاح", result.message || "تم تغيير حالة المستخدم");
      fetchUsers();
    } catch (error) {
      Alert.alert("خطأ", error.message || "حدث خطأ أثناء تغيير حالة المستخدم");
    }
  };

  return (
    <MainLayout userType="admin">
      <RefreshableScreen onRefresh={handleRefresh}>
        <View style={commonStyles.container}>
          <View style={commonStyles.header}>
            <Text style={commonStyles.title}>إدارة المستخدمين</Text>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddUserModal(true)}
          >
            <Feather name="plus" size={20} color="white" />
            <Text style={styles.addButtonText}>إضافة مستخدم جديد</Text>
          </TouchableOpacity>

          {loading ? (
            <AppLoader />
          ) : (
            employees.map((emp) => (
              <View key={emp.id} style={styles.userCard}>
                <View style={styles.userInfo}>
                  <View style={styles.userIcon}>
                    <MaterialIcons name="person" size={24} color="#2563eb" />
                  </View>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.userName}>{emp.username}</Text>
                    <Text style={styles.userDetail}>🔰 {emp.role}</Text>
                    {emp.storeName && (
                      <Text style={styles.userDetail}>🏪 {emp.storeName}</Text>
                    )}
                    {emp.repositoryName && (
                      <Text style={styles.userDetail}>
                        📦 {emp.repositoryName}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.actions}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: emp.is_active ? "#d1fae5" : "#f3f4f6",
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: emp.is_active ? "#22c55e" : "#6b7280",
                        fontWeight: "bold",
                      }}
                    >
                      {emp.is_active ? "نشط" : "غير نشط"}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => openEditModal(emp)}
                    style={styles.iconBtn}
                  >
                    <Ionicons name="create-outline" size={20} color="#3b82f6" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => toggleUserStatus(emp.id)}
                    style={styles.iconBtn}
                  >
                    <Ionicons
                      name={emp.is_active ? "trash-outline" : "trash-outline"}
                      size={20}
                      color={emp.is_active ? "#dc2626" : "#22c55e"}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
          {/* Repositories Selection Modal for Add User */}
          <Modal
            visible={showRepositoriesModal}
            animationType="slide"
            transparent
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { maxHeight: "80%" }]}>
                <Text style={styles.modalTitle}>اختر المستودعات المسموحة</Text>

                <ScrollView style={styles.repositoriesModalList}>
                  {repositories
                    .filter((repo) => repo.name !== newUser.store_name)
                    .map((repo) => (
                      <TouchableOpacity
                        key={repo.id}
                        style={[
                          styles.repositoryModalItem,
                          selectedRepositories.includes(repo.id) &&
                            styles.repositoryModalItemSelected,
                        ]}
                        onPress={() => {
                          setSelectedRepositories((prev) =>
                            prev.includes(repo.id)
                              ? prev.filter((id) => id !== repo.id)
                              : [...prev, repo.id],
                          );
                        }}
                      >
                        <View
                          style={[
                            styles.modalCheckbox,
                            selectedRepositories.includes(repo.id) &&
                              styles.modalCheckboxSelected,
                          ]}
                        >
                          {selectedRepositories.includes(repo.id) && (
                            <Ionicons
                              name="checkmark"
                              size={16}
                              color="white"
                            />
                          )}
                        </View>
                        <Text style={styles.repositoryModalName}>
                          {repo.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={styles.modalActions}>
                  <Pressable
                    style={[styles.modalButton, styles.cancelBtn]}
                    onPress={() => setShowRepositoriesModal(false)}
                  >
                    <Text style={styles.cancelText}>إلغاء</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalButton, styles.saveBtn]}
                    onPress={() => setShowRepositoriesModal(false)}
                  >
                    <Text style={styles.saveText}>تم</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
          {/* Repositories Selection Modal for Edit User */}
          <Modal
            visible={showEditRepositoriesModal}
            animationType="slide"
            transparent
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { maxHeight: "80%" }]}>
                <Text style={styles.modalTitle}>اختر المستودعات المسموحة</Text>

                <ScrollView style={styles.repositoriesModalList}>
                  {repositories
                    .filter((repo) => repo.name !== editUser.store_name)
                    .map((repo) => (
                      <TouchableOpacity
                        key={repo.id}
                        style={[
                          styles.repositoryModalItem,
                          selectedEditRepositories.includes(repo.id) &&
                            styles.repositoryModalItemSelected,
                        ]}
                        onPress={() => {
                          setSelectedEditRepositories((prev) =>
                            prev.includes(repo.id)
                              ? prev.filter((id) => id !== repo.id)
                              : [...prev, repo.id],
                          );
                        }}
                      >
                        <View
                          style={[
                            styles.modalCheckbox,
                            selectedEditRepositories.includes(repo.id) &&
                              styles.modalCheckboxSelected,
                          ]}
                        >
                          {selectedEditRepositories.includes(repo.id) && (
                            <Ionicons
                              name="checkmark"
                              size={16}
                              color="white"
                            />
                          )}
                        </View>
                        <Text style={styles.repositoryModalName}>
                          {repo.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={styles.modalActions}>
                  <Pressable
                    style={[styles.modalButton, styles.cancelBtn]}
                    onPress={() => setShowEditRepositoriesModal(false)}
                  >
                    <Text style={styles.cancelText}>إلغاء</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalButton, styles.saveBtn]}
                    onPress={() => setShowEditRepositoriesModal(false)}
                  >
                    <Text style={styles.saveText}>تم</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
          {/* Add User Modal */}
          <Modal visible={showAddUserModal} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>إضافة مستخدم جديد</Text>

                  <TextInput
                    style={styles.modalInput}
                    placeholder="الاسم الكامل"
                    placeholderTextColor="#9ca3af"
                    value={newUser.username}
                    onChangeText={(text) =>
                      setNewUser({ ...newUser, username: text })
                    }
                    textAlign="right"
                  />

                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="كلمة السر"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry={!showPassword}
                      value={newUser.password}
                      onChangeText={(text) =>
                        setNewUser({ ...newUser, password: text })
                      }
                      textAlign="right"
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <MaterialCommunityIcons
                        name={showPassword ? "eye-off" : "eye"}
                        size={20}
                        color="#6b7280"
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="تأكيد كلمة السر"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry={!showConfirmPassword}
                      value={newUser.confirm_password}
                      onChangeText={(text) =>
                        setNewUser({ ...newUser, confirm_password: text })
                      }
                      textAlign="right"
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      <MaterialCommunityIcons
                        name={showConfirmPassword ? "eye-off" : "eye"}
                        size={20}
                        color="#6b7280"
                      />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.roleSelection}>
                    <Text style={styles.roleLabel}>الدور:</Text>
                    <View style={styles.roleButtons}>
                      <TouchableOpacity
                        style={[
                          styles.roleButton,
                          newUser.role === "بائع" && styles.selectedRoleButton,
                        ]}
                        onPress={() => setNewUser({ ...newUser, role: "بائع" })}
                      >
                        <Text
                          style={
                            newUser.role === "بائع"
                              ? styles.selectedRoleText
                              : styles.roleText
                          }
                        >
                          بائع
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.roleButton,
                          newUser.role === "مشرف" && styles.selectedRoleButton,
                        ]}
                        onPress={() => setNewUser({ ...newUser, role: "مشرف" })}
                      >
                        <Text
                          style={
                            newUser.role === "مشرف"
                              ? styles.selectedRoleText
                              : styles.roleText
                          }
                        >
                          مشرف
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.roleButton,
                          newUser.role === "مشرف الورشة" &&
                            styles.selectedRoleButton, // Changed from 'مشرف ورشة' to 'مشرف الورشة'
                        ]}
                        onPress={() =>
                          setNewUser({ ...newUser, role: "مشرف الورشة" })
                        }
                      >
                        <Text
                          style={
                            newUser.role === "مشرف الورشة"
                              ? styles.selectedRoleText
                              : styles.roleText
                          }
                        >
                          مشرف ورشة
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.roleButton,
                          newUser.role === "امين مستودع" &&
                            styles.selectedRoleButton, // Changed from 'مشرف ورشة' to 'مشرف الورشة'
                        ]}
                        onPress={() =>
                          setNewUser({ ...newUser, role: "امين مستودع" })
                        }
                      >
                        <Text
                          style={
                            newUser.role === "امين مستودع"
                              ? styles.selectedRoleText
                              : styles.roleText
                          }
                        >
                          امين مستودع
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {newUser.role !== "مشرف الورشة" &&
                    newUser.role !== "امين مستودع" && (
                      <View style={styles.storeSelection}>
                        <Text style={styles.storeLabel}>المتجر:</Text>
                        <View style={styles.pickerBeautifulContainer}>
                          <Picker
                            selectedValue={newUser.store_name}
                            onValueChange={(itemValue) =>
                              setNewUser({ ...newUser, store_name: itemValue })
                            }
                            style={styles.pickerBeautiful}
                            dropdownIconColor="#4B5563"
                          >
                            <Picker.Item
                              label="اختر متجر..."
                              value=""
                              color="#9CA3AF"
                            />
                            {stores.map((store) => (
                              <Picker.Item
                                key={store.id}
                                label={store.name}
                                value={store.name}
                              />
                            ))}
                          </Picker>
                        </View>
                      </View>
                    )}
                  {newUser.role === "امين مستودع" && (
                    <View style={styles.storeSelection}>
                      <Text style={styles.storeLabel}>المستودع:</Text>
                      <View style={styles.pickerBeautifulContainer}>
                        <Picker
                          selectedValue={newUser.repository_name}
                          onValueChange={(itemValue) =>
                            setNewUser({
                              ...newUser,
                              repository_name: itemValue,
                            })
                          }
                          style={styles.pickerBeautiful}
                          dropdownIconColor="#4B5563"
                        >
                          <Picker.Item
                            label="اختر المستودع..."
                            value=""
                            color="#9CA3AF"
                          />
                          {repositories.map((repo) => (
                            <Picker.Item
                              key={repo.id}
                              label={repo.name}
                              value={repo.name}
                            />
                          ))}
                        </Picker>
                      </View>
                    </View>
                  )}
                  {(newUser.role === "بائع" ||
                    newUser.role === "مشرف الورشة") && (
                    <View style={styles.storeSelection}>
                      <Text style={styles.storeLabel}>
                        المستودعات المسموحة:
                      </Text>
                      <TouchableOpacity
                        style={styles.pickerBeautifulContainer2}
                        onPress={() => setShowRepositoriesModal(true)}
                      >
                        <Text style={styles.pickerText}>
                          {selectedRepositories.length > 0
                            ? `تم اختيار ${selectedRepositories.length} مستودع`
                            : "اختر المستودعات المسموحة..."}
                        </Text>
                        <Ionicons
                          name="chevron-down"
                          size={20}
                          color="#4B5563"
                        />
                      </TouchableOpacity>

                      {selectedRepositories.length === 0 && (
                        <Text style={styles.errorText}>
                          يجب اختيار مستودع واحد على الأقل
                        </Text>
                      )}
                    </View>
                  )}
                  <View style={styles.modalActions}>
                    <Pressable
                      style={[styles.modalButton, styles.cancelBtn]}
                      onPress={() => {
                        setShowAddUserModal(false);
                        setShowPassword(false);
                        setShowConfirmPassword(false);
                        setSelectedRepositories([]); // Add this line
                      }}
                    >
                      <Text style={styles.cancelText}>إلغاء</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.modalButton, styles.saveBtn]}
                      onPress={handleAddUser}
                    >
                      <Text style={styles.saveText}>إضافة</Text>
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            </View>
          </Modal>

          {/* Edit User Modal */}
          <Modal visible={showEditUserModal} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>تعديل بيانات المستخدم</Text>

                  <TextInput
                    style={styles.modalInput}
                    placeholder="الاسم الكامل"
                    placeholderTextColor="#9ca3af"
                    value={editUser.username}
                    onChangeText={(text) =>
                      setEditUser({ ...editUser, username: text })
                    }
                    textAlign="right"
                  />

                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="كلمة السر (اتركها فارغة للحفاظ على الكلمة الحالية)"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry={!showEditPassword}
                      value={editUser.password}
                      onChangeText={(text) =>
                        setEditUser({ ...editUser, password: text })
                      }
                      textAlign="right"
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowEditPassword(!showEditPassword)}
                    >
                      <MaterialCommunityIcons
                        name={showEditPassword ? "eye-off" : "eye"}
                        size={20}
                        color="#6b7280"
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="تأكيد كلمة السر"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry={!showEditConfirmPassword}
                      value={editUser.confirm_password}
                      onChangeText={(text) =>
                        setEditUser({ ...editUser, confirm_password: text })
                      }
                      textAlign="right"
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() =>
                        setShowEditConfirmPassword(!showEditConfirmPassword)
                      }
                    >
                      <MaterialCommunityIcons
                        name={showEditConfirmPassword ? "eye-off" : "eye"}
                        size={20}
                        color="#6b7280"
                      />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.roleSelection}>
                    <Text style={styles.roleLabel}>الدور:</Text>
                    <View style={styles.roleButtons}>
                      <TouchableOpacity
                        style={[
                          styles.roleButton,
                          editUser.role === "بائع" && styles.selectedRoleButton,
                        ]}
                        onPress={() =>
                          setEditUser({ ...editUser, role: "بائع" })
                        }
                      >
                        <Text
                          style={
                            editUser.role === "بائع"
                              ? styles.selectedRoleText
                              : styles.roleText
                          }
                        >
                          بائع
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.roleButton,
                          editUser.role === "مشرف" && styles.selectedRoleButton,
                        ]}
                        onPress={() =>
                          setEditUser({ ...editUser, role: "مشرف" })
                        }
                      >
                        <Text
                          style={
                            editUser.role === "مشرف"
                              ? styles.selectedRoleText
                              : styles.roleText
                          }
                        >
                          مشرف
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.roleButton,
                          editUser.role === "مشرف الورشة" &&
                            styles.selectedRoleButton, // Changed from 'مشرف ورشة' to 'مشرف الورشة'
                        ]}
                        onPress={() =>
                          setEditUser({ ...editUser, role: "مشرف الورشة" })
                        }
                      >
                        <Text
                          style={
                            editUser.role === "مشرف الورشة"
                              ? styles.selectedRoleText
                              : styles.roleText
                          }
                        >
                          مشرف ورشة
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.roleButton,
                          editUser.role === "امين مستودع" &&
                            styles.selectedRoleButton,
                        ]}
                        onPress={() =>
                          setEditUser({ ...editUser, role: "امين مستودع" })
                        }
                      >
                        <Text
                          style={
                            editUser.role === "امين مستودع"
                              ? styles.selectedRoleText
                              : styles.roleText
                          }
                        >
                          امين مستودع
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {editUser.role !== "مشرف الورشة" &&
                    editUser.role !== "امين مستودع" && (
                      <View style={styles.storeSelection}>
                        <Text style={styles.storeLabel}>المتجر:</Text>
                        <View style={styles.pickerBeautifulContainer}>
                          <Picker
                            selectedValue={editUser.store_name}
                            onValueChange={(itemValue) =>
                              setEditUser({
                                ...editUser,
                                store_name: itemValue,
                              })
                            }
                            style={styles.pickerBeautiful}
                            dropdownIconColor="#4B5563"
                          >
                            <Picker.Item
                              label="اختر متجر..."
                              value=""
                              color="#9CA3AF"
                            />
                            {stores.map((store) => (
                              <Picker.Item
                                key={store.id}
                                label={store.name}
                                value={store.name}
                              />
                            ))}
                          </Picker>
                        </View>
                      </View>
                    )}
                  {editUser.role === "امين مستودع" && (
                    <View style={styles.storeSelection}>
                      <Text style={styles.storeLabel}>المستودع:</Text>
                      <View style={styles.pickerBeautifulContainer}>
                        <Picker
                          selectedValue={editUser.repository_name}
                          onValueChange={(itemValue) =>
                            setEditUser({
                              ...editUser,
                              repository_name: itemValue,
                            })
                          }
                          style={styles.pickerBeautiful}
                          dropdownIconColor="#4B5563"
                        >
                          <Picker.Item
                            label="اختر المستودع..."
                            value=""
                            color="#9CA3AF"
                          />
                          {repositories.map((repo) => (
                            <Picker.Item
                              key={repo.id}
                              label={repo.name}
                              value={repo.name}
                            />
                          ))}
                        </Picker>
                      </View>
                    </View>
                  )}
                  {(editUser.role === "بائع" ||
                    editUser.role === "مشرف الورشة") && (
                    <View style={styles.storeSelection}>
                      <Text style={styles.storeLabel}>
                        المستودعات المسموحة:
                      </Text>
                      <TouchableOpacity
                        style={styles.pickerBeautifulContainer2}
                        onPress={() => setShowEditRepositoriesModal(true)}
                      >
                        <Text style={styles.pickerText}>
                          {selectedEditRepositories.length > 0
                            ? `تم اختيار ${selectedEditRepositories.length} مستودع`
                            : "اختر المستودعات المسموحة..."}
                        </Text>
                        <Ionicons
                          name="chevron-down"
                          size={20}
                          color="#4B5563"
                        />
                      </TouchableOpacity>

                      {selectedEditRepositories.length === 0 && (
                        <Text style={styles.errorText}>
                          يجب اختيار مستودع واحد على الأقل
                        </Text>
                      )}
                    </View>
                  )}

                  <View style={styles.modalActions}>
                    <Pressable
                      style={[styles.modalButton, styles.cancelBtn]}
                      onPress={() => {
                        setShowEditUserModal(false);
                        setShowEditPassword(false);
                        setShowEditConfirmPassword(false);
                        setSelectedEditRepositories([]); // Add this line
                      }}
                    >
                      <Text style={styles.cancelText}>إلغاء</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.modalButton, styles.saveBtn]}
                      onPress={handleEditUser}
                    >
                      <Text style={styles.saveText}>تحديث</Text>
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            </View>
          </Modal>
        </View>
      </RefreshableScreen>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: "row-reverse",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  statCard: {
    width: "45%",
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "bold",
    marginVertical: 4,
    color: "inherit",
  },
  statLabel: {
    fontSize: 14,
    color: "#4b5563",
  },
  addButton: {
    flexDirection: "row-reverse",
    backgroundColor: "#22c55e",
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  addButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  userCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },

  userInfo: {
    flexDirection: "row-reverse",
    flex: 1,
    alignItems: "center",
  },
  userIcon: {
    backgroundColor: "#dbeafe",
    borderRadius: 25,
    padding: 8,
    marginLeft: 10,
  },
  userName: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#1f2937",
    marginBottom: 4,
    textAlign: "right",
  },
  userDetail: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "right",
  },
  actions: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  iconBtn: {
    padding: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#000000aa",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 20,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    maxHeight: "90%",
    width: "100%",
    alignSelf: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
    color: "#111827",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
    textAlign: "right",
    color: "#000000",
    fontSize: 14,
  },
  passwordContainer: {
    flexDirection: "row-reverse",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    marginVertical: 6,
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    textAlign: "right",
    color: "#000000",
    fontSize: 14,
  },
  eyeButton: {
    padding: 4,
  },
  modalActions: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 6,
  },
  cancelBtn: {
    backgroundColor: "#ef4444",
  },
  cancelText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: "#22c55e",
  },
  saveText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 14,
  },
  roleSelection: {
    marginVertical: 10,
  },
  roleLabel: {
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 8,
    textAlign: "right",
    color: "#374151",
  },
  roleButtons: {
    flexDirection: "row-reverse",
    gap: 6,
    flexWrap: "wrap",
  },
  roleButton: {
    borderWidth: 1,
    borderColor: "#9ca3af",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 70,
  },
  selectedRoleButton: {
    backgroundColor: "#22c55e",
    borderColor: "#16a34a",
  },
  roleText: {
    color: "#6b7280",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 12,
  },
  selectedRoleText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 12,
  },
  loadingContainer: {
    marginTop: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#6b7280",
  },
  storeSelection: {
    marginVertical: 6,
  },
  storeLabel: {
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 8,
    textAlign: "right",
    color: "#374151",
  },
  storePickerContainer: {
    position: "relative",
  },
  storeInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    textAlign: "right",
    justifyContent: "center",
  },
  storeInputText: {
    color: "#000000",
    textAlign: "right",
    fontSize: 14,
  },
  storesList: {
    maxHeight: 120,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    marginTop: 4,
    backgroundColor: "white",
  },
  storeOption: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  storeOptionText: {
    textAlign: "right",
    color: "#374151",
    fontSize: 14,
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
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },

  pickerBeautifulContainer2: {
    width: "100%",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    marginBottom: 8,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerBeautiful: {
    width: "100%",
    height: 56,
    color: "#1F2937",
    textAlign: "right",
    paddingRight: 16,
    fontSize: 18,
  },
  repositoriesSelection: {
    marginVertical: 10,
  },
  repositoriesLabel: {
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 8,
    textAlign: "right",
    color: "#374151",
  },
  repositoriesList: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 8,
    backgroundColor: "#f9fafb",
  },
  repositoryItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderRadius: 4,
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  checkboxSelected: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  repositoryName: {
    fontSize: 14,
    color: "#374151",
    textAlign: "right",
    flex: 1,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    textAlign: "right",
    marginTop: 4,
  },
  compactRepositoriesList: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  compactRepositoryItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    gap: 6,
  },
  compactRepositoryItemSelected: {
    backgroundColor: "#dbeafe",
    borderColor: "#3b82f6",
  },
  compactRepositoryName: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "right",
  },
  compactRepositoryNameSelected: {
    color: "#1e40af",
    fontWeight: "500",
  },
  pickerText: {
    flex: 1,
    color: "#1F2937",
    textAlign: "right",
    fontSize: 18,
    paddingRight: 16,
  },
  repositoriesModalList: {
    maxHeight: 300,
    width: "100%",
    marginVertical: 16,
  },
  repositoryModalItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  repositoryModalItemSelected: {
    backgroundColor: "#f0f9ff",
  },
  repositoryModalName: {
    flex: 1,
    fontSize: 16,
    color: "#374151",
    textAlign: "right",
    marginRight: 12,
  },
  modalCheckbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  modalCheckboxSelected: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
});

export default AdminUsers;
