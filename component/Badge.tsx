import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type BadgeProps = {
  text: string;
  color?: string;
  outline?: boolean;
};

export const Badge = ({ text, color = '#3b82f6', outline = false }: BadgeProps) => {
  return (
    <View
      style={[
        styles.badge,
        outline
          ? { borderColor: color, borderWidth: 1, backgroundColor: 'transparent' }
          : { backgroundColor: color },
      ]}
    >
      <Text style={[styles.text, outline ? { color } : {}]}>{text}</Text>
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
});
