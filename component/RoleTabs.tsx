import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';

type Props = {
  userType: 'admin' | 'employee';
  onChange: (type: 'admin' | 'employee') => void;
};

export default function RoleTabs({ userType, onChange }: Props) {
  return (
    <View style={styles.tabContainer}>
      <Pressable
        style={[styles.tab, userType === 'employee' && styles.activeTab]}
        onPress={() => onChange('employee')}
      >
        <Text style={styles.tabText}>موظف</Text>
      </Pressable>
      <Pressable
        style={[styles.tab, userType === 'admin' && styles.activeTab]}
        onPress={() => onChange('admin')}
      >
        <Text style={styles.tabText}>مسؤول</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tabContainer: { flexDirection: 'row', marginBottom: 12 },
  tab: { flex: 1, padding: 12, backgroundColor: '#B2DFDB', alignItems: 'center', borderRadius: 6 },
  activeTab: { backgroundColor: '#00796B' },
  tabText: { color: '#fff', fontWeight: 'bold' },
});