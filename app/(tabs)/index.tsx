// app/(tabs)/home.tsx
import { ChatItem } from '@/components/ChatItem';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { CONFIG } from '@/config';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

// Types for Odoo data
interface UserInfo {
  uid: number;
  name: string;
  session_id: string;
  context: Record<string, any>;
}

interface Channel {
  id: number;
  name: string;
  uuid: string;
  channel_type: 'chat' | 'channel' | 'group'; // Restrict to known types from your data
  members?: { id: number; email: string; name: string }[];
  last_message_id?: number;
}

interface Message {
  result: any;
  id: number;
  body: string;
  author_id: [number, string];
  date: string;
}

interface InitMessagingResponse {
  jsonrpc: string;
  id: number | null;
  result: {
    channel_slots: {
      channel_channel: Channel[];
      channel_direct_message: Channel[];
      channel_private_group: Channel[];
    };
    current_partner: { id: number; email: string; name: string };
  };
}

interface ChatData {
  conversation_type: 'channel' | 'chat' | 'group';
  email: string;
  text: string;
  time: string;
  uuid: string;
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const [chatData, setChatData] = useState<ChatData[]>([]);
  const [error, setError] = useState('');
  const [partnerId, setPartnerId] = useState<number | null>(null);
  const router = useRouter();

  const fetchConversations = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (!userData) {
        setError('User not logged in');
        return;
      }
      const user: UserInfo = JSON.parse(userData);
      const response = await axios.post<Message>(`${CONFIG.SERVER_URL}/web/session/get_session_info`,
        {
          "jsonrpc": "2.0",
          "method": "call",
          "params": {},
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Cookie: `session_id=${user.session_id}`,
          },
        });

      const session = response.data;
      const partnerId = session?.result?.partner_id;
      setPartnerId(partnerId);

      const initResponse = await axios.post<InitMessagingResponse>(
        `${CONFIG.SERVER_URL}/mail/init_messaging`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            Cookie: `session_id=${user.session_id}`,
          },
        }
      );

      const allChannels: Channel[] = [
        ...initResponse.data.result.channel_slots.channel_channel,
        ...initResponse.data.result.channel_slots.channel_direct_message,
        ...initResponse.data.result.channel_slots.channel_private_group,
      ];

      const chatDataPromises = allChannels.map(async (channel) => {
        const historyResponse = await axios.post<Message>(
          `${CONFIG.SERVER_URL}/mail/chat_history`,
          {
            "jsonrpc": "2.0",
            "method": "call",
            "params": {
              "uuid": channel.uuid,
              "limit": 2
            },
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Cookie: `session_id=${user.session_id}`,
            },
          }
        );

        const lastMessage = historyResponse.data.result[0] || {};
        // console.log(channel.uuid, '---- _____________________________________  -----', lastMessage)
        const email =
          channel.members?.find((m) => m.id !== initResponse.data.result.current_partner.id)?.email ||
          channel.name;

        const isMine = lastMessage?.author_id?.[0] === partnerId;
        const cleanText = lastMessage.body ? lastMessage.body.replace(/<[^>]+>/g, '') : 'No messages';
        const displayText = isMine ? `⤻ Vous : ${cleanText}` : cleanText;

        return {
          conversation_type: channel.channel_type,
          email,
          text: displayText,
          time: lastMessage.date || '1970-01-01T00:00:00',
          uuid: channel.uuid,
        };
      });

      const newChatData = await Promise.all(chatDataPromises);

      // Sort by date descending
      const sortedChatData = newChatData.sort(
        (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
      );

      setChatData(sortedChatData);
    } catch (err) {
      setError('Failed to load conversations');
      console.error(err);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchConversations();
    }, [fetchConversations])
  );

  useEffect(() => {

    fetchConversations();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <ThemedView style={styles.fixedHeader}>
        <Pressable style={[styles.button, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}>
          <IconSymbol name="video.fill" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>Démarrer une réunion</Text>
        </Pressable>
        <Pressable style={[styles.button, { backgroundColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
          <IconSymbol name="video.fill" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Démarrer une conversation</Text>
        </Pressable>
      </ThemedView>

      <ScrollView contentContainerStyle={{ padding: 8, paddingTop: 80 }}>
        <ThemedView style={{ marginTop: 10 }}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {chatData.length === 0 && !error ? (
            <Text style={{ textAlign: 'center', color: '#666' }}>No conversations found</Text>
          ) : (
            chatData.map((item) => (
              <Pressable
                key={item.uuid}
                onPress={() =>
                  router.push({
                    pathname: "/(chat)/[uuid]",
                    params: {
                      uuid: item.uuid,
                      conversation_type: item.conversation_type,
                      email: item.email,
                    },
                  })
                }
              >
                <ChatItem
                  key={item.uuid}
                  conversation_type={item.conversation_type}
                  email={item.email}
                  text={item.text}
                  time={item.time}
                  unreadCount={0}
                />
              </Pressable>
            )))}
        </ThemedView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fixedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    paddingBottom: 4,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
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
  error: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
});