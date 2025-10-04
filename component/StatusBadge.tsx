// StatusBadge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const StatusBadge = ({ label, color = '#3b82f6', outline = false }) => {
  return (
    <View style={[styles.badge, outline ? styles.outline : { backgroundColor: color }]}>
      <Text style={[styles.text, outline && { color }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  text: {
    fontSize: 10,
    color: 'white',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
});
