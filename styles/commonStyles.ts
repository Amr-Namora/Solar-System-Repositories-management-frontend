// src/styles/commonStyles.ts
import { StyleSheet } from 'react-native';
import { getStatusBarHeight } from 'react-native-status-bar-height';
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Responsive scaling (same logic as in your screen)
const scale = Math.min(width / 375, height / 812); // Base: iPhone 13
const scaledSize = (size: number) => Math.round(size * scale);
const scaledPadding = (padding: number) => Math.round(padding * scale);

// Export the helper functions if you need them elsewhere
export { scaledSize, scaledPadding };

// Shared styles used across multiple screens
export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: scaledPadding(16),
    backgroundColor: '#f8fafc',
    paddingTop: getStatusBarHeight() + scaledPadding(16),
  },
  header: {
    marginBottom: scaledPadding(24),
    backgroundColor: '#3b82f6',
    padding: scaledPadding(16),
    borderRadius: scaledSize(12),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scaledSize(2) },
    shadowOpacity: 0.1,
    shadowRadius: scaledSize(4),
  },
  title: {
    fontSize: scaledSize(24),
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'right',
    includeFontPadding: false,
  },
  subtitle: {
    fontSize: scaledSize(14),
    color: '#e0f2fe',
    textAlign: 'right',
    marginTop: scaledPadding(4),
    includeFontPadding: false,
  },
});