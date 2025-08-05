// components/ConversationList.tsx
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { ChatItem } from './ChatItem';

interface ChatData {
  name: string | undefined;
  conversation_type: 'channel' | 'chat' | 'group';
  email: string;
  text: string;
  time: string;
  uuid: string;
  channelId: number;
  unreadCount: number;
}

interface Props {
  chatData: ChatData[];
  error: string;
  filterType: 'chat' | 'channel' | 'group' | null;
  onConversationPress: (uuid: string, channelId: number) => void;
}

export function ConversationList({ chatData, error, filterType, onConversationPress }: Props) {
  const filteredData = filterType
    ? chatData.filter(item => item.conversation_type === filterType)
    : chatData;

  return (
    <>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={filteredData}
        keyExtractor={item => item.uuid}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => onConversationPress(item.uuid, item.channelId)}>
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