// app/(tabs)/index.tsx
import ConversationDrawer from '@/components/ConversationDrawer';
import { ConversationList } from '@/components/ConversationList';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import useHomeChatData from '@/hooks/useHomeChatData';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

interface ChatData {
  name: string;
  conversation_type: 'channel' | 'chat' | 'group' | 'notification';
  email: string;
  text: string;
  time: string;
  uuid: string;
  channelId: number;
  unreadCount: number;
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const { isLoading, chatData, error, refetch, handleConversationPress } = useHomeChatData();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); // État pour contrôler le drawer

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  return (
    <View style={{ flex: 1 }}>
      <ThemedView style={styles.fixedHeader}>
        <Pressable style={[styles.button, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}>
          <IconSymbol name="video.fill" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>Start a meeting</Text>
        </Pressable>
        <Pressable style={[styles.button, { backgroundColor: Colors[colorScheme ?? 'light'].tabIconDefault }]} onPress={toggleDrawer}>
          <IconSymbol name="bubble.left.and.bubble.right.fill" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>New conversation</Text>
        </Pressable>
      </ThemedView>
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
        </View>
      )}
      {!isLoading && (
        <ConversationList
          chatData={chatData}
          error={error}
          filterType={null}
          onConversationPress={handleConversationPress}
        />
      )}
      <ConversationDrawer isOpen={isDrawerOpen} onClose={toggleDrawer} conversations={chatData} />
    </View>
  );
}

const styles = StyleSheet.create({
  fixedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 5,
    zIndex: 10,
    marginBottom: 5,
  },
  button: {
    width: '48%',
    padding: 10,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    textAlign: 'center',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});