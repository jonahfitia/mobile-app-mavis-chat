import { CONFIG } from '@/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosResponse } from 'axios';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

interface UserInfo {
  uid: number;
  name: string;
  session_id: string;
  context: Record<string, any>;
}

interface Channel {
  unreadCount: number | null;
  id: number;
  name: string;
  uuid: string;
  channel_type: 'chat' | 'channel' | 'group';
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

export interface ChatData {
  name: string | undefined;
  conversation_type: 'channel' | 'chat' | 'group';
  email: string;
  text: string;
  time: string;
  uuid: string;
  channelId: number;
  unreadCount: number;
}

export default function useHomeChatData() {
  const [chatData, setChatData] = useState<ChatData[]>([]);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<number | null>(null);
  const router = useRouter();

  // Initialize userId, sessionId, and partnerId
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (!userData) {
          setError('User not logged in');
          router.replace('/login');
          return;
        }
        const user: UserInfo = JSON.parse(userData);
        if (!user.session_id) {
          setError('Session ID is undefined');
          router.replace('/login');
          return;
        }
        setUserId(user.uid);
        setSessionId(user.session_id);

        const sessionResponse: AxiosResponse = await axios.post(
          `${CONFIG.SERVER_URL}/web/session/get_session_info`,
          {
            jsonrpc: '2.0',
            method: 'call',
            params: {},
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Cookie: `session_id=${user.session_id}`,
            },
          }
        );

        const session = sessionResponse.data;
        const partnerId = session?.result?.partner_id;
        setPartnerId(partnerId);
        console.log('User initialized:', {
          name: user.name,
          uid: user.uid,
          session_id: user.session_id,
          partnerId,
        });

        // Fetch conversations after initialization
        await fetchConversations();
      } catch (err) {
        setError('Failed to initialize user');
        console.error('Initialization error:', err);
        router.replace('/login');
      }
    };
    initializeUser();
  }, [router]);

  const fetchConversations = useCallback(async () => {
    if (!sessionId || !userId) {
      console.log('Skipping fetchConversations: missing sessionId or userId');
      return;
    }
    try {
      const initResponse: AxiosResponse<InitMessagingResponse> = await axios.post(
        `${CONFIG.SERVER_URL}/mail/init_messaging`,
        { jsonrpc: '2.0', method: 'call', params: {} },
        {
          headers: {
            'Content-Type': 'application/json',
            Cookie: `session_id=${sessionId}`,
          },
        }
      );

      console.log('Init messaging response:', initResponse.data);

      const allChannels: Channel[] = [
        ...initResponse.data.result.channel_slots.channel_channel,
        ...initResponse.data.result.channel_slots.channel_direct_message,
        ...initResponse.data.result.channel_slots.channel_private_group,
      ];

      const unreadResponse: AxiosResponse<{ result: { uuid: string; unread_count: number }[] }> = await axios.post(
        `${CONFIG.SERVER_URL}/mail/count_messaging_unread`,
        { jsonrpc: '2.0', method: 'call', params: {} },
        {
          headers: {
            'Content-Type': 'application/json',
            Cookie: `session_id=${sessionId}`,
          },
        }
      );

      const unreadCounts = unreadResponse.data.result.reduce((acc, curr) => {
        acc[curr.uuid] = curr.unread_count ?? 0;
        return acc;
      }, {} as Record<string, number>);

      const chatDataPromises = allChannels.map(async (channel) => {
        const historyResponse: AxiosResponse<{ result: Message[] }> = await axios.post(
          `${CONFIG.SERVER_URL}/mail/chat_history`,
          {
            jsonrpc: '2.0',
            method: 'call',
            params: { uuid: channel.uuid, limit: 2 },
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Cookie: `session_id=${sessionId}`,
            },
          }
        );

        const lastMessage = historyResponse.data.result[0] || {};
        const email =
          channel.members?.find((m) => m.id !== initResponse.data.result.current_partner.id)?.email ||
          channel.name;
        const cleanText = lastMessage.body ? lastMessage.body.replace(/<[^>]+>/g, '') : 'No messages';
        const lastAuthor = lastMessage.author_id?.[1] || 'Unknown';
        const isMine = lastMessage.author_id?.[0] === partnerId;
        let displayText = cleanText;
        if (channel.channel_type !== 'chat') {
          displayText = isMine ? `⤻ Vous : ${cleanText}` : `⤻ ${lastAuthor} : ${cleanText}`;
        } else if (isMine) {
          displayText = `⤻ Vous : ${cleanText}`;
        }

        return {
          conversation_type: channel.channel_type,
          email,
          text: displayText,
          time: lastMessage.date || '1970-01-01T00:00:00',
          uuid: channel.uuid,
          name: channel.name,
          channelId: channel.id,
          unreadCount: unreadCounts[channel.uuid] ?? 0,
        };
      });

      const newChatData = await Promise.all(chatDataPromises);
      const sortedChatData = newChatData.sort(
        (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
      );
      setChatData(sortedChatData);
      console.log('Conversations fetched:', sortedChatData);
    } catch (err) {
      setError('Failed to load conversations');
      console.error('fetchConversations error:', err);
    }
  }, [sessionId, userId, partnerId]);

  const updateChannelUnreadCount = useCallback(
    async (channelId: number, uuid: string) => {
      if (!sessionId) {
        console.log('Skipping updateChannelUnreadCount: missing sessionId');
        return;
      }
      try {
        const historyResponse: AxiosResponse<{ result: Message[] }> = await axios.post(
          `${CONFIG.SERVER_URL}/mail/chat_history`,
          {
            jsonrpc: '2.0',
            method: 'call',
            params: { uuid, limit: 20 },
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Cookie: `session_id=${sessionId}`,
            },
          }
        );

        console.log('Chat history response:', historyResponse.data);

        const unreadResponse: AxiosResponse<{ result: { uuid: string; unread_count: number }[] }> = await axios.post(
          `${CONFIG.SERVER_URL}/mail/count_messaging_unread`,
          { jsonrpc: '2.0', method: 'call', params: {} },
          {
            headers: {
              'Content-Type': 'application/json',
              Cookie: `session_id=${sessionId}`,
            },
          }
        );

        const unreadCount = unreadResponse.data.result.find((c) => c.uuid === uuid)?.unread_count ?? 0;

        const lastMessage = historyResponse.data.result[0] || {};
        const email = chatData.find((c) => c.uuid === uuid)?.email || 'Unknown';
        const cleanText = lastMessage.body ? lastMessage.body.replace(/<[^>]+>/g, '') : 'No messages';
        const lastAuthor = lastMessage.author_id?.[1] || 'Unknown';
        const isMine = lastMessage.author_id?.[0] === partnerId;

        let displayText = cleanText;
        if (chatData.find((c) => c.uuid === uuid)?.conversation_type !== 'chat') {
          displayText = isMine ? `⤻ Vous : ${cleanText}` : `⤻ ${lastAuthor} : ${cleanText}`;
        } else if (isMine) {
          displayText = `⤻ Vous : ${cleanText}`;
        }

        const updatedChannel: ChatData = {
          conversation_type: chatData.find((c) => c.uuid === uuid)?.conversation_type || 'channel',
          email,
          text: displayText,
          time: lastMessage.date || '1970-01-01T00:00:00',
          uuid,
          name: chatData.find((c) => c.uuid === uuid)?.name || 'Unknown',
          channelId,
          unreadCount,
        };

        setChatData((prev) =>
          prev
            .map((item) => (item.channelId === channelId ? updatedChannel : item))
            .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        );
        console.log('Channel updated:', { channelId, uuid, text: displayText });
      } catch (err) {
        console.error(`Error updating channel ${channelId}:`, err);
      }
    },
    [sessionId, partnerId, chatData]
  );

  const handleSendMessage = useCallback(
    async (channelId: number, uuid: string, messageBody: string) => {
      if (!sessionId || !partnerId) {
        console.log('Skipping handleSendMessage: missing sessionId or partnerId');
        return;
      }
      try {
        const response: AxiosResponse = await axios.post(
          `${CONFIG.SERVER_URL}/mail/message/post`,
          {
            jsonrpc: '2.0',
            method: 'call',
            params: {
              channel_id: channelId,
              body: messageBody,
            },
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Cookie: `session_id=${sessionId}`,
            },
          }
        );

        console.log('Message sent:', response.data);

        const newMessage = response.data.result || {
          body: messageBody,
          date: new Date().toISOString(),
          author_id: [partnerId, 'Vous'],
        };
        const cleanText = newMessage.body ? newMessage.body.replace(/<[^>]+>/g, '') : 'No messages';
        const displayText = `⤻ Vous : ${cleanText}`;

        setChatData((prev) =>
          prev
            .map((item) =>
              item.channelId === channelId
                ? {
                    ...item,
                    text: displayText,
                    time: newMessage.date || new Date().toISOString(),
                    unreadCount: item.unreadCount,
                  }
                : item
            )
            .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        );

        console.log('Local chatData updated:', { channelId, uuid, text: displayText });

        await updateChannelUnreadCount(channelId, uuid);
      } catch (error) {
        console.error('Error sending message:', error);
        setError('Failed to send message');
      }
    },
    [sessionId, partnerId, chatData, updateChannelUnreadCount]
  );

  useEffect(() => {
    let isMounted = true;

    const pollMessages = async () => {
      if (!isMounted || !userId || !sessionId) {
        console.log('Polling skipped: missing userId or sessionId');
        return;
      }

      try {
        const response: AxiosResponse = await axios.post(
          `${CONFIG.SERVER_URL}/longpolling/poll`,
          {
            jsonrpc: '2.0',
            method: 'call',
            params: {
              channels: [[CONFIG.DATABASE_NAME, userId, ['mail.channel']]],
            },
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Cookie: `session_id=${sessionId}`,
            },
            timeout: 30000, // 30-second timeout to avoid hanging
          }
        );

        console.log('Polling response:', response.data);

        if (response.data.result?.length > 0) {
          for (const notification of response.data.result) {
            console.log('Processing notification:', notification);
            if (notification.message?.model === 'mail.channel') {
              const channelId = notification.message.res_id;
              const channel = chatData.find((c) => c.channelId === channelId);
              if (channel) {
                console.log('Updating channel:', channelId, channel.uuid);
                await updateChannelUnreadCount(channelId, channel.uuid);
              } else {
                console.log('Channel not found for channelId:', channelId);
                await fetchConversations();
              }
            }
          }
        }

        if (isMounted) {
          pollMessages();
        }
      } catch (error: any) {
        console.error('Polling error:', error);
        if (error.response?.status === 401 || error.response?.status === 403) {
          setError('Session expired. Please log in again.');
          router.replace('/login');
        } else {
          setTimeout(() => {
            if (isMounted) pollMessages();
          }, 5000);
        }
      }
    };

    pollMessages();

    return () => {
      isMounted = false;
    };
  }, [userId, sessionId, chatData, updateChannelUnreadCount, fetchConversations]);

  // Fallback periodic refresh
  useEffect(() => {
    const interval = setInterval(() => {
      if (sessionId && userId) {
        console.log('Periodic refresh triggered');
        fetchConversations();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [fetchConversations, sessionId, userId]);

  const handleConversationPress = async (uuid: string, channelId: number) => {
    console.log('handleConversationPress called with uuid:', uuid, 'channelId:', channelId);
    try {
      const historyResponse: AxiosResponse<{ result: Message[] }> = await axios.post(
        `${CONFIG.SERVER_URL}/mail/chat_history`,
        {
          jsonrpc: '2.0',
          method: 'call',
          params: { uuid, limit: 1 },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Cookie: `session_id=${sessionId}`,
            timeout: 10000,
          },
        }
      );
      console.log('History response:', historyResponse.data);

      router.push({
        pathname: '/(chat)/[uuid]',
        params: {
          uuid,
          channelId: channelId.toString(),
          conversation_type: chatData.find((item) => item.uuid === uuid)?.conversation_type || 'channel',
          email: chatData.find((item) => item.uuid === uuid)?.email || '',
          userId: userId?.toString() || '',
          session_id: sessionId || '',
        },
      });
    } catch (error) {
      console.error('Error opening channel:', error);
      setError('Failed to open conversation');
    }
  };

  return {
    chatData,
    error,
    refetch: fetchConversations,
    handleConversationPress,
    handleSendMessage,
  };
}