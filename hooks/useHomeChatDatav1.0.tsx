// hooks/useHomeChatData.tsx
import { CONFIG } from '@/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
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
    name: string;
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
    const [isLoading, setIsLoading] = useState(false);

    // Initialiser userId, sessionId et partnerId
    useEffect(() => {
        let isMounted = true;
        const initializeUser = async () => {
            try {
                const userData = await AsyncStorage.getItem('user');
                if (!userData) {
                    setError('User not logged in');
                    return;
                }
                const user: UserInfo = JSON.parse(userData);
                setUserId(user.uid);
                setSessionId(user.session_id);
                const sessionResponse = await axios.post<Message>(`${CONFIG.SERVER_URL}/web/session/get_session_info`,
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

                const session = sessionResponse.data;
                const partnerId = session?.result?.partner_id;
                setPartnerId(partnerId);
                const load = async () => {
                    setIsLoading(true);
                    await fetchConversations();
                    if (isMounted) {
                        setIsLoading(false);
                    }
                };

                load();

                return () => {
                    isMounted = false;
                };
            } catch (err) {
                setError('Failed to initialize user');
                console.error(err);
            }
        };
        initializeUser();
    }, [router]);

    const fetchConversations = useCallback(async () => {
        if (!sessionId || !userId) {
            // console.log('Skipping fetchConversations: missing sessionId or userId');
            return;
        }
        try {
            const initResponse = await axios.post<InitMessagingResponse>(
                `${CONFIG.SERVER_URL}/mail/init_messaging`,
                { jsonrpc: '2.0', method: 'call', params: {} },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            const allChannels: Channel[] = [
                ...initResponse.data.result.channel_slots.channel_channel,
                ...initResponse.data.result.channel_slots.channel_direct_message,
                ...initResponse.data.result.channel_slots.channel_private_group,
            ];

            const unreadResponse = await axios.post<{ result: { uuid: string; unread_count: number }[] }>(
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
                const historyResponse = await axios.post<{ result: Message[] }>(
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
                let displayName = channel.name;
                if (channel.channel_type === 'chat') {
                    const otherMember = channel.members?.find(m => m.id !== initResponse.data.result.current_partner.id);
                    displayName = otherMember ? otherMember.name || otherMember.email : 'Unknown';
                }
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
                    name: displayName,
                    channelId: channel.id,
                    unreadCount: unreadCounts[channel.uuid] ?? 0,
                };
            });

            const newChatData = await Promise.all(chatDataPromises);
            const sortedChatData = newChatData.sort(
                (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
            );
            console.log("SORTED DATA ", sortedChatData);
            setChatData(sortedChatData);
        } catch (err) {
            setError('Failed to load conversations');
            console.error(err);
        }
    }, [userId, sessionId, partnerId]);

    const updateChannelUnreadCount = useCallback(async (channelId: number, uuid: string) => {
        try {
            const historyResponse = await axios.post<{ result: Message[] }>(
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

            const unreadResponse = await axios.post<{ result: { uuid: string; unread_count: number }[] }>(
                `${CONFIG.SERVER_URL}/mail/count_messaging_unread`,
                { jsonrpc: '2.0', method: 'call', params: {} },
                {
                    headers: {
                        'Content-Type': 'application/json',
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
        } catch (err) {
            console.error(`Erreur lors de la mise à jour du canal ${channelId}:`, err);
        }
    }, [userId, sessionId, partnerId, chatData]);

    // Long polling pour les mises à jour en temps réel
    // useEffect(() => {
    //     let isMounted = true;
    //     const pollMessages = async () => {
    //         try {
    //             const response = await axios.post(`${CONFIG.SERVER_URL}/longpolling/poll`, {
    //                 jsonrpc: '2.0',
    //                 method: 'call',
    //                 params: {
    //                     channels: [`${CONFIG.DATABASE_NAME}/${userId}/mail.channel`],
    //                     last: 0,
    //                     options: {}
    //                 },
    //             }, {
    //                 headers: {
    //                     'Content-Type': 'application/json',
    //                 },
    //             });

    //             console.log('Polling response:', response.data.result?.length, 'new messages');
    //             if (response.data.result?.length > 0) {
    //                 for (const notification of response.data.result) {
    //                     if (notification.message?.model === 'mail.channel') {
    //                         const channelId = notification.message.res_id;
    //                         const channel = chatData.find((c) => c.channelId === channelId);
    //                         if (channel) {
    //                             await updateChannelUnreadCount(channelId, channel.uuid);
    //                         }
    //                     }
    //                 }
    //             }
    //             if (isMounted) {
    //                 pollMessages();
    //             }
    //         } catch (error: any) {
    //             console.error('Erreur polling:', error);
    //             if (error.response?.status === 401 || error.response?.status === 403) {
    //                 setError('Session expirée. Veuillez vous reconnecter.');
    //                 router.replace('/login');
    //             } else {
    //                 setTimeout(() => {
    //                     if (isMounted) pollMessages();
    //                 }, 5000);
    //             }
    //         }
    //     };
    //     pollMessages();

    //     return () => {
    //         isMounted = false;
    //     };
    // }, [userId, sessionId, chatData, updateChannelUnreadCount]);

    const handleConversationPress = async (uuid: string, channelId: number) => {
        try {
            const historyResponse = await axios.post<{ result: Message[] }>(
                `${CONFIG.SERVER_URL}/mail/chat_history`,
                {
                    jsonrpc: '2.0',
                    method: 'call',
                    params: { uuid, limit: 1 },
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );
            const lastMessageId = historyResponse.data.result[0]?.id;
            if (lastMessageId) {
                await axios.post(
                    `${CONFIG.SERVER_URL}/mail/channel/seen`,
                    {
                        jsonrpc: '2.0',
                        method: 'call',
                        params: { channel_id: channelId, last_message_id: lastMessageId },
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                );
                await updateChannelUnreadCount(channelId, uuid);
            }

            router.push({
                pathname: '/(chat)/[uuid]',
                params: {
                    uuid,
                    channelId: channelId.toString(),
                    conversation_type: chatData.find(item => item.uuid === uuid)?.conversation_type,
                    email: chatData.find(item => item.uuid === uuid)?.email || '',
                    userId: userId?.toString() || '',
                    session_id: sessionId || '',
                    name: chatData.find(item => item.uuid === uuid)?.name,
                },
            });
        } catch (error) {
            console.error('Erreur lors de l’ouverture du canal:', error);
            setError('Failed to open conversation');
        }
    };


    const handleConversationPressWithAllParameter = async (
        uuid: string,
        channelId: number,
        name: string,
        conversation_type: string,
        email: string
    ) => {
        try {
            const historyResponse = await axios.post<{ result: Message[] }>(
                `${CONFIG.SERVER_URL}/mail/chat_history`,
                {
                    jsonrpc: '2.0',
                    method: 'call',
                    params: { uuid, limit: 1 },
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );
            const lastMessageId = historyResponse.data.result[0]?.id;
            if (lastMessageId) {
                await axios.post(
                    `${CONFIG.SERVER_URL}/mail/channel/seen`,
                    {
                        jsonrpc: '2.0',
                        method: 'call',
                        params: { channel_id: channelId, last_message_id: lastMessageId },
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                );
                await updateChannelUnreadCount(channelId, uuid);
            }

            router.push({
                pathname: '/(chat)/[uuid]',
                params: {
                    uuid,
                    channelId: channelId.toString(),
                    conversation_type: conversation_type,
                    email: email,
                    userId: userId?.toString() || '',
                    session_id: sessionId || '',
                    name: name,
                },
            });
        } catch (error) {
            console.error('Erreur lors de l’ouverture du canal:', error);
            setError('Failed to open conversation');
        }
    };

    return {
        isLoading,
        chatData,
        error,
        refetch: fetchConversations,
        handleConversationPress,
        handleConversationPressWithAllParameter
    };
}