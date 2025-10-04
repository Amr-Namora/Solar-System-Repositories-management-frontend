import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const StatCard = ({ label, value, icon, color }) => {
  return (
    <View style={[styles.card, { backgroundColor: color }]}>
      <View style={styles.icon}>{icon}</View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '45%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 8,
  },
  value: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  label: {
    fontSize: 12,
    color: '#4b5563',
  },
});
