// components/ConversationList.tsx
import { ChatData, ConversationType } from '@/types/chat/chatData';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { ChatItem } from './ChatItem';

interface ConversationListProps {
  chatData: ChatData[];
  error?: string;
  filterType?: ConversationType | null;
  onConversationPress: (uuid: string, channelId: number, conversation_type?: string) => void;
}

export function ConversationList({ chatData, error, filterType, onConversationPress }: ConversationListProps) {
  // export function ConversationList({ chatData, error, filterType }: Props) {
  const filteredData = filterType
    ? chatData.filter(item => item.conversation_type === filterType)
    : chatData;

  return (
    <>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={filteredData}
        keyExtractor={item => item.uuid}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => {
              onConversationPress(item.uuid, item.channelId ?? undefined, item.conversation_type);
            }}
          >
            <ChatItem
              name={item.name}
              conversation_type={item.conversation_type}
              email={item.email}
              text={item.text}
              time={item.time}
              uuid={item.uuid}
              channelId={item.channelId}
              unreadCount={item.unreadCount}
            />
          </TouchableOpacity>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  error: {
    color: 'red',
    textAlign: 'center',
    margin: 10,
  },
});
