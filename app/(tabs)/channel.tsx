// app/(tabs)/channel.tsx
import { ConversationList } from '@/components/ConversationList';
import useHomeChatData from '@/hooks/useHomeChatData';
import { useFocusEffect } from 'expo-router';
import React, { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function ChannelScreen() {
  const { isLoading, chatData, error, refetch, handleConversationPress } = useHomeChatData();

  // Rafraîchir les conversations lorsque l’écran est affiché
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  return (
    <View style={{ flex: 1 }}>

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