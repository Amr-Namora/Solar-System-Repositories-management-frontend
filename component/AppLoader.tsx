// src/components/AppLoader.tsx
import React from 'react';
import { View, Image, ActivityIndicator, Text, StyleSheet } from 'react-native';

const AppLoader = () => {
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/logo-1.png')} 
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color="#2563eb" style={styles.loader} />
      <Text style={styles.text}>جاري التحميل...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc', 
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  loader: {
    marginTop: 12,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
  },
});

export default AppLoader;