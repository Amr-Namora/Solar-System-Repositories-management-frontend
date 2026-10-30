
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  I18nManager,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import AppHeader from '../component/AppHeader';
import MainLayout from '../component/MainLayout';
import { API_BASE_URL } from './api2';
import { getStatusBarHeight } from 'react-native-status-bar-height';
import RefreshableScreen from '../component/RefreshableScreen';
import { useNavigation } from '@react-navigation/native';
import AppLoader from '../component/AppLoader';

const STORAGE_KEYS = {
  SEARCH_TERM: 'searchTerm',
  SEARCH_TYPE: 'searchType',
  SEARCH_CATEGORY: 'searchCategory',
};

const SearchScreen = () => {
  const navigation = useNavigation<any>();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [userType, setUserType] = useState<'admin' | 'storeKeeper' | 'user'>('user');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [fetchingCategories, setFetchingCategories] = useState(true);

  // Load saved filters when screen comes into focus
  useEffect(() => {
    const loadSavedFilters = async () => {
      try {
        const [savedTerm, savedType, savedCategory] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.SEARCH_TERM),
          AsyncStorage.getItem(STORAGE_KEYS.SEARCH_TYPE),
          AsyncStorage.getItem(STORAGE_KEYS.SEARCH_CATEGORY),
        ]);

        setSearchTerm(savedTerm ?? '');
        setSelectedType(savedType ?? '');
        setSelectedCategory(savedCategory ?? '');
      } catch (error) {
        console.error('Error loading search filters:', error);
      }
    };

    const unsubscribe = navigation.addListener('focus', loadSavedFilters);
    return unsubscribe;
  }, [navigation]);

  // Save filters automatically with debounce
  useEffect(() => {
    const saveFilters = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.SEARCH_TERM, searchTerm);
        await AsyncStorage.setItem(STORAGE_KEYS.SEARCH_TYPE, selectedType);
        await AsyncStorage.setItem(STORAGE_KEYS.SEARCH_CATEGORY, selectedCategory);
      } catch (error) {
        console.error('Error saving search filters:', error);
      }
    };

    const timeoutId = setTimeout(saveFilters, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedType, selectedCategory]);

  const fetchCategories = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;
      
      const response = await fetch(`${API_BASE_URL}/homeRead/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch categories');
      
      const data = await response.json();
      const uniqueNames = Array.from(
        new Set(data.serialize.map((item: any) => item.name))
      ).filter(Boolean) as string[];
      
      setCategories(uniqueNames);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories(['بطاريات', 'ألواح', 'انفرتر', 'كشافات', 'كابلات', 'هياكل']);
    } finally {
      setFetchingCategories(false);
    }
  };

  const performSearch = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('query', searchTerm);
      if (selectedType) params.append('status', selectedType);
      if (selectedCategory) params.append('category', selectedCategory);
      
      const response = await fetch(`${API_BASE_URL}/search/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch search results');
      
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setFetchingCategories(true);
    await fetchCategories();
    if (searchTerm || selectedType || selectedCategory) {
      await performSearch();
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (searchTerm || selectedType || selectedCategory) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, selectedType, selectedCategory]);

  useEffect(() => {
    const fetchUserType = async () => {
      const stored = await AsyncStorage.getItem('userType');
      if (stored === 'admin' || stored === 'user' || stored === 'storeKeeper') {
        setUserType(stored); 
      } else {
        setUserType('user');
      }
    };
    fetchUserType();
  }, []);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType('');
    setSelectedCategory('');
  };

  const types = ['متاح'];

  return (
    <MainLayout userType={userType}>
      <RefreshableScreen onRefresh={handleRefresh}>
        <View style={styles.container}>
          {/* Custom Header */}
          <View style={styles.header}>
            <Text style={styles.title}>البحث عن المواد</Text>
          </View>

          <View style={styles.searchContainer}>
            <Feather name="search" size={20} color="#64748b" style={styles.searchIcon} />
            <TextInput
              placeholder="ابحث عن اسم المنتج أو المادة..."
              placeholderTextColor="#94a3b8"
              style={styles.searchInput}
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>

          {/* زر إلغاء الفلتر */}
          {(searchTerm || selectedType || selectedCategory) && (
            <View style={styles.clearFilterContainer}>
              <TouchableOpacity onPress={clearFilters} style={styles.clearButton} activeOpacity={0.7}>
                <Text style={styles.clearButtonText}>إلغاء الفلتر</Text>
                <Feather name="x-circle" size={18} color="#DC2626" style={styles.clearIcon} />
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.sectionTitle}>نوع العملية</Text>
          <View style={styles.optionsContainer}>
            {types.map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.optionButton,
                  selectedType === type && [styles.selectedOption, styles.btnOrange],
                ]}
                onPress={() => setSelectedType(selectedType === type ? '' : type)}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedType === type && styles.selectedOptionText,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>التصنيف</Text>
          {fetchingCategories ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#3b82f6" />
            </View>
          ) : (
            <View style={styles.optionsContainer}>
              {categories.map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.optionButton,
                    selectedCategory === category && [styles.selectedOption, styles.btnOrange],
                  ]}
                  onPress={() => setSelectedCategory(selectedCategory === category ? '' : category)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedCategory === category && styles.selectedOptionText,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.sectionTitle}>نتائج البحث</Text>
          {loading ? (
            <AppLoader />
          ) : searchResults.length > 0 ? (
            searchResults.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.card}
                activeOpacity={0.8}
                onPress={() =>
                  navigation.navigate('MaterialsManagement', {
                    material: { id: item.product_id, name: item.name },
                    openClassId: item.class_id,
                    openDisplayName: item.type,
                  })
                }
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitle}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <View style={styles.categoryRow}>
                      <Text style={styles.categoryText}>التصنيف:</Text>
                      <View style={[styles.badge, { backgroundColor: '#f0f9ff' }]}>
                        <Text style={[styles.badgeText, { color: '#0369a1' }]}>
                          {item.type}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <FontAwesome5 name="box" size={24} color="#3b82f6" />
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.userInfo}>
                    <Text style={styles.infoLabel}>الحالة:</Text>
                    <Text style={styles.infoValue}>{item.is_available}</Text>
                  </View>
                  <View style={styles.quantity}>
                    <Text style={styles.quantityNumber}>{item.amount}</Text>
                    <Text style={styles.quantityLabel}>الكمية</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.loadingContainer}>
              <Text style={styles.noResultsText}>لا توجد نتائج للبحث</Text>
            </View>
          )}
        </View>
      </RefreshableScreen>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8fafc',
    paddingTop: getStatusBarHeight() + 16,
  },
  header: {
    marginBottom: 24,
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 14,
    color: '#e0f2fe',
    textAlign: 'right',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginLeft: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    textAlign: 'right',
  },
  clearFilterContainer: {
    alignItems: 'flex-start', // Aligns to Right in RTL context
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  clearButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    gap: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  clearIcon: {
    marginLeft: 4,
  },
  clearButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'right',
  },
  optionsContainer: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  optionButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedOption: {
    borderColor: '#ea580c',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionText: {
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'right',
  },
  selectedOptionText: {
    color: '#fff',
  },
  btnOrange: {
    backgroundColor: '#F97316',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginVertical: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '500',
    textAlign: 'right',
  },
  noResultsText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 16,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardTitle: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'right',
  },
  categoryRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  categoryText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'right',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  infoRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'right',
  },
  quantity: {
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  quantityNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0369a1',
  },
  quantityLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
  },
});

export default SearchScreen;
