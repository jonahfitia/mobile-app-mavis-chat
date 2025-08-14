// components/ConversationList.tsx
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { ChatItem } from './ChatItem';

interface ChatData {
  uuid: string;
  name?: string; // facultatif si non défini
  conversation_type: 'channel' | 'chat' | 'group' | 'notification';
  email: string;
  text: string;
  time: string;
  channelId?: number | null; // peut être null pour notifications
  unreadCount: number;
  target?: {         // facultatif, seulement pour notifications
    model: string;
    res_id: number;
  };
}

interface Props {
  chatData: ChatData[];
  error?: string;
  filterType?: 'chat' | 'channel' | 'group' | 'notification' | null;
  onConversationPress: (uuid: string, channelId?: number | null, conversation_type?: string) => void;
}

export function ConversationList({ chatData, error, filterType, onConversationPress }: Props) {
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
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => {
              // si channelId existe, on le passe, sinon undefined
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
