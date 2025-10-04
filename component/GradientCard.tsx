import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';

export const GradientCard = ({ title, desc, icon, gradient, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress} style={{ width: '45%' }}>
      <LinearGradient colors={gradient} style={styles.card}>
        <FontAwesome5 name={icon} size={28} color="white" style={{ marginBottom: 8 }} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.desc}>{desc}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
  },
  title: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  desc: {
    color: '#e0f2fe',
    fontSize: 12,
    textAlign: 'center',
  },
});
