import React from 'react';
import { View, StyleSheet, Platform, StatusBar } from 'react-native';
import AdminBottomNavigation from './ADBottomNavigation';
import UserBottomNavigation from './UsBottomNavigation';
import AWBottomNavigation from './AWBottomNavigation';

type UserType = 'admin' | 'employee' | 'adminworkshop';

interface MainLayoutProps {
  children: React.ReactNode;
  userType: UserType;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, userType }) => {
  const getBottomNavigation = () => {
    if (userType === 'admin') {
      return <AdminBottomNavigation />;
    } else if (userType === 'adminworkshop') {
      return <AWBottomNavigation />;
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