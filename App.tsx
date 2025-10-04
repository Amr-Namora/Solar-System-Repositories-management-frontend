  import React from 'react';
  import { NavigationContainer } from '@react-navigation/native';
  import { createNativeStackNavigator } from '@react-navigation/native-stack';
  import { SafeAreaProvider } from 'react-native-safe-area-context';
  import { StatusBar, View } from 'react-native';

  import Login from './Screen/login';
  import Home from './Screen/home';
  import MyStoreScreen from './Screen/MyStore';
  import Search from './Screen/Search';
  import Reservations from './Screen/Reservations';
  import Notifications from './Screen/Notifications';
  import Account from './Screen/Account';
  import AdminDashboard from './Screen/AdminDashboard';
  import AdminUsers from './Screen/AdminUsers';
  import History from './Screen/History';
  import NotFound from './Screen/NotFound';
  import Toast from 'react-native-toast-message';
  import RepositoryMaterials from './Screen/repository';
  import ToastConfig from './component/ToastConfig';
  import { MaterialsManagementScreen } from './Screen/Materialsmang';
  import { StoreMaterial } from './Screen/StoreMaterial';
  import Index from './Screen/index';
  import AdminStores from './Screen/AdminStores';
  import AdminReposotories from './Screen/AdminReposotories';
  import AdminWorkshops from './Screen/AdminWorkshops';
  import StoreMaterials from './Screen/store';
  import AppLoader from './component/AppLoader';
import Aworkshop from 'Screen/w-admin';


  export type RootStackParamList = {
    Login: undefined;
    MainMaterial: undefined;
    Search: undefined;
    Reservations: undefined;
    Notifications: undefined;
    Account: undefined;
    StoreMaterial:undefined;
    Admin: undefined;
    StoreMaterials:undefined;
    AdminDashboard: undefined;
    Index:undefined;
    AdminUsers: undefined;
    History: undefined;
    NotFound: undefined;
    MaterialsManagement: { material: any };
    AdminList: undefined;
    AdminStores: undefined;
    AdminReposotories: undefined;
    RepositoryMaterials:undefined;
    MyStoreScreen: undefined;
    AdminWorkshops:undefined;
    Aworkshop:undefined;
    PersonalProfile: undefined; 

  };

  const Stack = createNativeStackNavigator<RootStackParamList>();

  export default function App() {
    return (
      <SafeAreaProvider>
        <StatusBar translucent backgroundColor="transparent" />
        <View style={{ flex: 1 }}>
          <NavigationContainer>
            <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Login" component={Login} />
              <Stack.Screen name="MainMaterial" component={Home} />
              <Stack.Screen name="Search" component={Search} />
              <Stack.Screen name="Reservations" component={Reservations} />
              <Stack.Screen name="Notifications" component={Notifications} />
              <Stack.Screen name="Account" component={Account} />
              <Stack.Screen name="Admin" component={AdminDashboard} />
              <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
              <Stack.Screen name="Index" component={Index} />
              <Stack.Screen name="AdminUsers" component={AdminUsers} />
              <Stack.Screen name="History" component={History} />
              <Stack.Screen name="AdminStores" component={AdminStores} />
              <Stack.Screen name="AdminReposotories" component={AdminReposotories} />
              <Stack.Screen name="MyStoreScreen" component={MyStoreScreen} />
              <Stack.Screen name="StoreMaterial" component={StoreMaterial} />
              <Stack.Screen name="AdminWorkshops" component={AdminWorkshops} />
              <Stack.Screen name="NotFound" component={NotFound} />
              <Stack.Screen name="StoreMaterials" component={StoreMaterials} />
              <Stack.Screen name="RepositoryMaterials" component={RepositoryMaterials} />
              <Stack.Screen name="Aworkshop" component={Aworkshop} />

              <Stack.Screen 
                name="MaterialsManagement" 
                component={MaterialsManagementScreen}
                options={{ 
                  headerShown: false,
                  title: 'إدارة المواد',
                  headerTitleAlign: 'center',
                }}
              />
            
            </Stack.Navigator>
          </NavigationContainer>
          <Toast config={ToastConfig} />
        </View>
      </SafeAreaProvider>
    );
  }