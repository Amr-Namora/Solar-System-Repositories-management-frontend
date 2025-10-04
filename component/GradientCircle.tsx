import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const GradientCircle = ({ name }: { name: string }) => {
  return (
    <View style={styles.circle}>
      <Text style={styles.text}>{name}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#facc15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 20,
  },
});
