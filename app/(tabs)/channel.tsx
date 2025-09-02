// app/(tabs)/channel.tsx
import { ConversationList } from '@/components/ConversationList';
import ConversationDrawer from '@/components/drawer/ConversationDrawer';
import useHomeChatData from '@/hooks/useHomeChatData';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

export default function ChannelScreen() {
  const { isLoading, chatData, error, refetch, handleConversationPress } = useHomeChatData();
  const [refreshing, setRefreshing] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
          </View>
        )}
        {!isLoading && (
          <ConversationList
            chatData={chatData}
            error={error}
            filterType="channel"
            onConversationPress={handleConversationPress}
          />
        )}
      </ScrollView>
      <ConversationDrawer isOpen={isDrawerOpen} onClose={toggleDrawer} conversations={chatData} />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});