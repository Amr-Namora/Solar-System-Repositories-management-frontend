import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

type ActionButtonsProps = {
  onSubmitCategory?: (name: string) => void;
  onSubmitMaterial?: (material: {
    name: string;
    category: string;
    amount: string;
    status: string;
  }) => void;
  onUpdateStatus?: (materialId: string, newStatus: string) => void;
  materials?: Array<{ id: string; name: string; status: string }>;
};

const ActionButtons: React.FC<ActionButtonsProps> = ({
  onSubmitCategory,
  onSubmitMaterial,
  onUpdateStatus,
  materials = [],
}) => {
  // State for Category Modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryName, setCategoryName] = useState('');

  // State for Material Modal
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [materialName, setMaterialName] = useState('');
  const [materialCategory, setMaterialCategory] = useState('');
  const [materialAmount, setMaterialAmount] = useState('');
  const [materialStatus, setMaterialStatus] = useState('available');

  // State for Edit Status Modal
  const [showEditStatusModal, setShowEditStatusModal] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [newStatus, setNewStatus] = useState('available');

  // Handlers
  const handleConfirmAddCategory = () => {
    if (categoryName.trim()) {
      onSubmitCategory?.(categoryName.trim());
      setCategoryName('');
      setShowCategoryModal(false);
    }
  };

  const handleConfirmAddMaterial = () => {
    if (
      materialName.trim() &&
      materialCategory.trim() &&
      materialAmount.trim() &&
      materialStatus.trim()
    ) {
      onSubmitMaterial?.({
        name: materialName.trim(),
        category: materialCategory.trim(),
        amount: materialAmount.trim(),
        status: materialStatus.trim(),
      });
      setMaterialName('');
      setMaterialCategory('');
      setMaterialAmount('');
      setMaterialStatus('available');
      setShowMaterialModal(false);
    }
  };

  const handleUpdateStatus = () => {
    if (selectedMaterialId && newStatus) {
      onUpdateStatus?.(selectedMaterialId, newStatus);
      setShowEditStatusModal(false);
      setSelectedMaterialId('');
      setNewStatus('available');
    }
  };

  return (
    <View>
      {/* Action Buttons Row */}
      <View style={styles.actionRow}>
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowMaterialModal(true)}
          >
            <Feather name="plus" size={16} color="white" />
            <Text style={styles.addText}>إضافة مادة</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: '#10b981' }]}
            onPress={() => setShowCategoryModal(true)}
          >
            <Feather name="folder-plus" size={16} color="white" />
            <Text style={styles.addText}>إضافة فئة</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: '#f59e0b' }]}
          onPress={() => setShowEditStatusModal(true)}
        >
          <Feather name="edit" size={16} color="white" />
          <Text style={styles.addText}>تعديل الحالة</Text>
        </TouchableOpacity>
      </View>

      {/* Modal for Adding Category */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>إضافة فئة جديدة</Text>

            <Text style={styles.label}>اسم الفئة</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="مثال: أدوات كهربائية"
              value={categoryName}
              onChangeText={setCategoryName}
              textAlign="right"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCategoryModal(false)}
              >
                <Text style={styles.cancelText}>إلغاء</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleConfirmAddCategory}
                disabled={!categoryName.trim()}
              >
                <Text style={styles.saveText}>إضافة</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal for Adding Material */}
      <Modal
        visible={showMaterialModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMaterialModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>إضافة مادة جديدة</Text>

            <Text style={styles.label}>اسم المادة</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="مثال: بطارية 12V"
              value={materialName}
              onChangeText={setMaterialName}
              textAlign="right"
            />

            <Text style={styles.label}> الفئة</Text>
            <View style={[styles.modalInput, styles.pickerWrapper]}>
              <Picker
                selectedValue={materialCategory}
                onValueChange={(itemValue) => setMaterialCategory(itemValue)}
                mode="dropdown"
                style={styles.picker}
                dropdownIconColor="#374151"
              >
                <Picker.Item label="اختر الفئة" value="" />
                <Picker.Item label="بطاريات" value="batteries" />
                <Picker.Item label="ألواح شمسية" value="solar panels" />
                <Picker.Item label="أسلاك" value="wires" />
              </Picker>
            </View>

            <Text style={styles.label}>الكمية</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="مثال: 10"
              keyboardType="numeric"
              value={materialAmount}
              onChangeText={setMaterialAmount}
              textAlign="right"
            />

            <Text style={styles.label}>الحالة</Text>
            <View style={styles.statusContainer}>
              {['available', 'reserved', 'pending', 'expired'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusOption,
                    materialStatus === status && styles.statusOptionSelected,
                  ]}
                  onPress={() => setMaterialStatus(status)}
                >
                  <Text
                    style={[
                      styles.statusText,
                      materialStatus === status && styles.statusTextSelected,
                    ]}
                  >
                    {status === 'available'
                      ? 'متاح'
                      : status === 'reserved'
                      ? 'محجوز'
                      : status === 'pending'
                      ? 'قيد الوصول'
                      : 'منتهي'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowMaterialModal(false)}
              >
                <Text style={styles.cancelText}>إلغاء</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleConfirmAddMaterial}
                disabled={
                  !materialName.trim() ||
                  !materialCategory.trim() ||
                  !materialAmount.trim() ||
                  !materialStatus.trim()
                }
              >
                <Text style={styles.saveText}>إضافة</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal for Editing Status */}
      <Modal
        visible={showEditStatusModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>تعديل حالة المادة</Text>

            <Text style={styles.label}>اختر المادة</Text>
            <View style={[styles.modalInput, styles.pickerWrapper]}>
              <Picker
                selectedValue={selectedMaterialId}
                onValueChange={(itemValue) => setSelectedMaterialId(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="اختر المادة" value="" />
                {materials.map((material) => (
                  <Picker.Item
                    key={material.id}
                    label={material.name}
                    value={material.id}
                  />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>الحالة الجديدة</Text>
            <View style={styles.statusContainer}>
              {['available', 'reserved', 'pending', 'expired'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusOption,
                    newStatus === status && styles.statusOptionSelected,
                  ]}
                  onPress={() => setNewStatus(status)}
                >
                  <Text
                    style={[
                      styles.statusText,
                      newStatus === status && styles.statusTextSelected,
                    ]}
                  >
                    {status === 'available'
                      ? 'متاح'
                      : status === 'reserved'
                      ? 'محجوز'
                      : status === 'pending'
                      ? 'قيد الوصول'
                      : 'منتهي'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowEditStatusModal(false)}
              >
                <Text style={styles.cancelText}>إلغاء</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdateStatus}
                disabled={!selectedMaterialId || !newStatus}
              >
                <Text style={styles.saveText}>حفظ التغييرات</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonsContainer: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    padding: 10,
    borderRadius: 8,
  },
  addText: {
    color: 'white',
    marginRight: 8,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a3a2e',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
  },
  pickerWrapper: {
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    marginBottom: 10,
  },
  picker: {
    height: 50,
    color: '#374151',
    textAlign: 'right',
    backgroundColor: 'transparent',
    width: '100%',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#e5e7eb',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#22c55e',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  cancelText: {
    textAlign: 'center',
    color: '#374151',
    fontWeight: 'bold',
  },
  saveText: {
    textAlign: 'center',
    color: 'white',
    fontWeight: 'bold',
  },
  label: {
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 4,
    textAlign: 'right',
  },
  statusContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  statusOptionSelected: {
    backgroundColor: '#22c55e',
    borderColor: '#16a34a',
  },
  statusText: {
    color: '#374151',
    fontWeight: 'bold',
  },
  statusTextSelected: {
    color: 'white',
  },
});

export default ActionButtons;