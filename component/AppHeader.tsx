import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Ionicons, Feather } from '@expo/vector-icons';

// Define your app's route param list
type RootStackParamList = {
  Home: undefined;
  Notifications: undefined;
  // add others if you want
};

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  showNotifications?: boolean;
  notificationCount?: number;
  backTo?: keyof RootStackParamList; // restrict to keys in RootStackParamList
}

const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  showBackButton = false,
  showNotifications = false,
  notificationCount = 0,
  backTo = 'Home',
}) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.leftSection}>
          {showBackButton && (
            <TouchableOpacity
              onPress={() => navigation.navigate(backTo)}
              style={styles.iconButton}
            >
              <Ionicons name="arrow-back" size={24} color="#4B5563" />
            </TouchableOpacity>
          )}
          <View style={styles.logoTitle}>
            <Image
              source={{ uri: 'https://lovable-uploads/0857b8ab-239c-4f2e-9a9f-2e631bf5c277.png' }}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
          </View>
        </View>

        {showNotifications && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            style={styles.iconButton}
          >
            <Feather name="bell" size={24} color="#4B5563" />
            {notificationCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {notificationCount > 99 ? '99+' : notificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default AppHeader;

// ...styles here as before

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  inner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginRight: 12,
  },
  logoTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'right',
  },
  badge: {
    position: 'absolute',
    right: 2,
    top: 2,
    backgroundColor: '#DC2626', // red-600
    borderRadius: 10,
    minWidth: 18,
    paddingHorizontal: 4,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
});
