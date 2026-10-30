// MainLayout.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import AdminBottomNavigation from './ADBottomNavigation';
import UserBottomNavigation from './UsBottomNavigation';
import AWBottomNavigation from './AWBottomNavigation';
import StoreKeeperBottomNavigation from './StoreKeeperBottomNavigation';

type UserType = 'admin' | 'employee' | 'workshopManager' | 'storeKeeper';

interface MainLayoutProps {
  children: React.ReactNode;
  userType: UserType | string; // Allow string for flexibility
}
// MainLayout.tsx - Fix the comparison
const MainLayout: React.FC<MainLayoutProps> = ({ children, userType }) => {
  const getBottomNavigation = () => {
    console.log('MainLayout received userType:', userType);
    
    // Handle undefined or invalid userType
    if (!userType || typeof userType !== 'string') {
      console.warn('MainLayout: Invalid userType, defaulting to user');
      return <UserBottomNavigation />;
    }
    
    // Use exact comparison, not lowercase
    if (userType === 'admin') {
      return <AdminBottomNavigation />;
    } else if (userType === 'workshopManager') { // Exact match
      return <AWBottomNavigation />;
    } else if (userType === 'storeKeeper') { // Exact match for store keeper
      return <StoreKeeperBottomNavigation />;
    } else {
      return <UserBottomNavigation />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {children}
      </View>
      {getBottomNavigation()}
    </View>
  );
};
const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: { 
    flex: 1,
  },
});

export default MainLayout;