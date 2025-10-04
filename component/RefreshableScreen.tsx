import React, { useState } from 'react';
import { ScrollView, RefreshControl, View } from 'react-native';

type Props = {
  children: React.ReactNode;
  onRefresh?: () => Promise<void> | void;
  scrollRef?: React.Ref<ScrollView>;
};

export default function RefreshableScreen({ children, onRefresh, scrollRef }: Props) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (onRefresh) {
      await onRefresh(); // run the refresh function passed from the screen
    }
    setRefreshing(false);
  };

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={{ flexGrow: 1 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={{ flex: 1 }}>{children}</View>
    </ScrollView>
  );
}
