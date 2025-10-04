
import type { RootStackParamList } from '../App'; 
 import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  I18nManager,
} from 'react-native';
import { useNavigation, useRoute, NavigationProp } from '@react-navigation/native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
const iconsMap = {
  Package: (props: any) => <MaterialCommunityIcons name="package-variant-closed" {...props} />,
  Search: (props: any) => <Ionicons name="search-outline" {...props} />,
  Bell: (props: any) => <Feather name="bell" {...props} />,
  Reservations: (props: any) => <MaterialCommunityIcons name="package-variant-closed" {...props} />,
  Account: (props: any) => <Ionicons name="person-circle-outline" {...props} />, 
    MyStore: (props: any) => <MaterialCommunityIcons name="store" {...props} />, // New key!

};


type IconName = keyof typeof iconsMap;


interface NavItemProps {
  path: keyof RootStackParamList;
  icon: IconName;
  label: string;
}1

const UserBottomNavigation: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute();

  const navItems: NavItemProps[] = useMemo(() => [
    { path: 'Search', icon: 'Search', label: 'البحث' },
    { path: 'Reservations', icon: 'Reservations', label: 'الحجوزات' },
    { path: 'Notifications', icon: 'Bell', label: 'الإشعارات' },
    { path: 'MainMaterial', icon: 'Package', label: 'المواد' },
    { path: 'MyStoreScreen', icon: 'MyStore', label: 'متجري' }, // ← Updated icon key
    { path: 'Account', icon: 'Account', label: 'الحساب' },

  ], []);

  const NavItem: React.FC<NavItemProps> = ({ path, icon, label }) => {
    const isActive = route.name === path;
    const IconComponent = iconsMap[icon];
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      Animated.spring(scaleAnim, {
        toValue: isActive ? 1.1 : 1,
        friction: 3,
        useNativeDriver: true,
      }).start();
    }, [isActive]);

    return (
      <Animated.View
        style={[
          styles.navItem,
          isActive && styles.navItemActive,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <TouchableOpacity
          accessibilityLabel={label}
          accessibilityRole="button"
          accessibilityState={{ selected: isActive }}
          onPress={() => navigation.navigate(path)}
          activeOpacity={0.7}
          style={styles.touchable}
        >
          <IconComponent size={isActive ? 26 : 24} color={isActive ? '#2563eb' : '#6b7280'} />
          <Text style={[styles.navLabel, isActive ? styles.navLabelActive : styles.navLabelInactive]}>
            {label}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        {navItems.map(({ path, icon, label }) => (
          <NavItem key={path} path={path} icon={icon} label={label} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
    height: 60, // Fixed height to prevent extra space
  },
  inner: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: '100%',
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: '100%',
    justifyContent: 'center',
  },
  navItemActive: {
    backgroundColor: '#DBEAFE',
  },
  touchable: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
  },
  navLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  navLabelActive: {
    color: '#2563eb',
  },
  navLabelInactive: {
    color: '#6b7280',
  },
});

export default UserBottomNavigation;