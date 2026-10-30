import type { RootStackParamList } from '../App';
import React, { useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  I18nManager,
  Dimensions,
} from "react-native";
import {
  useNavigation,
  useRoute,
  NavigationProp,
} from "@react-navigation/native";
import {
  Ionicons,
  Feather,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

const { width } = Dimensions.get('window');

const iconsMap = {
  Home: (props: any) => <Ionicons name="home-outline" {...props} />,
  Package: (props: any) => (
    <MaterialCommunityIcons name="package-variant-closed" {...props} />
  ),
  Search: (props: any) => <Ionicons name="search-outline" {...props} />,
  Bell: (props: any) => <Feather name="bell" {...props} />,
  History: (props: any) => <Ionicons name="time-outline" {...props} />,
  Reservations: (props: any) => (
    <MaterialCommunityIcons name="package-variant-closed" {...props} />
  ),
  Account: (props: any) => <Ionicons name="person-circle-outline" {...props} />, 
};

type IconName = keyof typeof iconsMap;

interface NavItemProps {
  path: keyof RootStackParamList;
  icon: IconName;
  label: string;
}

const AWBottomNavigation: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute();

  const navItems: NavItemProps[] = useMemo(
    () => [
      { path: "Workshops", icon: "Home", label: " الرئيسية" },
      { path: 'Reservations', icon: 'Reservations', label: 'الحجوزات'},
      { path: 'Notifications', icon: 'Bell', label: 'الإشعارات' },

      { path: 'Account', icon: 'Account', label: 'الحساب' },
    ],
    []
  );

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

    const handlePress = () => {
      // Type-safe navigation with proper typing
      navigation.navigate(path as any);
    };

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
          onPress={handlePress}
          activeOpacity={0.7}
          style={styles.touchable}
        >
          <IconComponent
            size={isActive ? 26 : 24}
            color={isActive ? "#2563eb" : "#6b7280"}
          />
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[
              styles.navLabel,
              isActive ? styles.navLabelActive : styles.navLabelInactive,
            ]}
          >
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
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
    height: 60, // Fixed height to prevent extra space
  },
  inner: {
    flexDirection: I18nManager.isRTL ? "row-reverse" : "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: '100%',
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 4,
    height: '100%',
  },
  navItemActive: {
    backgroundColor: "#DBEAFE",
    borderRadius: 12,
  },
  touchable: {
    alignItems: "center",
    justifyContent: "center",
    height: '100%',
    width: '100%',
  },
  navLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
    textAlign: "center",
    flexShrink: 1,
  },
  navLabelActive: {
    color: "#2563eb",
  },
  navLabelInactive: {
    color: "#6b7280",
  },
});

export default AWBottomNavigation;