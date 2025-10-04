import React from 'react';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';

export default {
  success: (props: any) => (
    <BaseToast {...props} style={{ borderLeftColor: '#4CAF50' }} text1Style={{ fontWeight: '700' }} />
  ),
  error: (props: any) => (
    <ErrorToast {...props} style={{ borderLeftColor: '#F44336' }} text1Style={{ fontWeight: '700' }} />
  ),
};