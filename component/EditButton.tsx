import React from 'react';
import { TouchableOpacity, Text } from 'react-native';

export const EditButton = ({ isEditing, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text style={{ color: '#dbeafe', fontSize: 12 }}>
        {isEditing ? 'إلغاء' : 'تعديل'}
      </Text>
    </TouchableOpacity>
  );
};
