// hooks/useHomeChatData.tsx
import { CONFIG } from '@/config';
import { ChatData } from '@/types/chat/chatData';
import { Message } from '@/types/chat/message';
import { UserInfo } from '@/types/chat/userInfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

export default function useHomeChatData() {
    const [chatData, setChatData] = useState<ChatData[]>([]);
    const [error, setError] = useState('');
    const [userId, setUserId] = useState<number | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [partnerId, setPartnerId] = useState<number | null>(null);
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

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
            return;
        }
        try {
            const response = await axios.post<{ jsonrpc: string; id: number | null; result: ChatData[] }>(
                `${CONFIG.SERVER_URL}/mail/discussions/all`,
                { jsonrpc: '2.0', method: 'call', params: {} },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Cookie: `session_id=${sessionId}`,
                    },
                }
            );
            const channels: ChatData[] = response.data.result;
            const chatList: ChatData[] = channels.map(channel => ({
                uuid: channel.uuid,
                name: channel.name,
                conversation_type: channel.conversation_type,
                email: channel.email,
                text: channel.text,
                // text: channel.conversation_type == 'notification' ? channel.text : channel.text.replace(/<[^>]+>/g, ''),
                time: channel.time,
                channelId: channel.channelId ?? 0,
                unreadCount: channel.unreadCount ?? 0,
                target: channel.target,
            }));

            setChatData(chatList);
        } catch (err) {
            setError('Failed to load conversations');
            console.error(err);
        }
    }, [userId, sessionId, partnerId]);

    const updateChannelUnreadCount = useCallback(async (channelId: number, uuid: string) => {
        try {
            let unreadCount = 0;
            let lastMessage: Message | null = null;

            // Vérifier si c'est un groupe de notifications
            const isGroupNotification = uuid.startsWith('group_');

            if (isGroupNotification) {
                // Pour les notifications, récupérer le nombre de messages non lus depuis /mail/discussions/all
                const response = await axios.post<{ result: ChatData[] }>(
                    `${CONFIG.SERVER_URL}/mail/discussions/all`,
                    {
                        jsonrpc: '2.0',
                        method: 'call',
                        params: { limit: 1 },
                    },
                    {
                        headers: { 'Content-Type': 'application/json' },
                    }
                );

                const groupData = response.data.result.find((item) => item.uuid === uuid);
                if (groupData) {
                    unreadCount = groupData.unreadCount;
                    lastMessage = {
                        body: groupData.text,
                        date: groupData.time,
                        author_id: [0, 'System'],
                    } as Message;
                }
            } else {
                // Pour les canaux/chat classiques
                const historyResponse = await axios.post<{ result: Message[] }>(
                    `${CONFIG.SERVER_URL}/mail/chat_history`,
                    {
                        jsonrpc: '2.0',
                        method: 'call',
                        params: { uuid, limit: 20 },
                    },
                    { headers: { 'Content-Type': 'application/json' } }
                );

                lastMessage = historyResponse.data.result[0] || null;

                const unreadResponse = await axios.post<{ result: { uuid: string; unread_count: number }[] }>(
                    `${CONFIG.SERVER_URL}/mail/count_messaging_unread`,
                    { jsonrpc: '2.0', method: 'call', params: {} },
                    { headers: { 'Content-Type': 'application/json' } }
                );

                unreadCount = unreadResponse.data.result.find((c) => c.uuid === uuid)?.unread_count ?? 0;
            }

            if (!lastMessage) return;

            const cleanText = lastMessage.body ? lastMessage.body : 'No messages';
            const lastAuthor = lastMessage.author_id?.[1] || 'Unknown';
            const isMine = lastMessage.author_id?.[0] === partnerId;

            const displayText = isGroupNotification
                ? cleanText
                : chatData.find((c) => c.uuid === uuid)?.conversation_type !== 'chat'
                    ? isMine ? `⤻ Vous : ${cleanText}` : `⤻ ${lastAuthor} : ${cleanText}`
                    : isMine ? `⤻ Vous : ${cleanText}` : cleanText;

            const updatedItem: ChatData = {
                conversation_type: chatData.find((c) => c.uuid === uuid)?.conversation_type || 'channel',
                email: chatData.find((c) => c.uuid === uuid)?.email || '',
                text: displayText,
                time: lastMessage.date || '1970-01-01T00:00:00',
                uuid,
                name: chatData.find((c) => c.uuid === uuid)?.name || 'Unknown',
                channelId,
                unreadCount,
            };

            setChatData((prev) =>
                prev.map((item) => (item.uuid === uuid ? updatedItem : item))
                    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
            );

        } catch (err) {
            console.error(`Erreur lors de la mise à jour de ${uuid}:`, err);
        }
    }, [partnerId, chatData]);

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

    const handleConversationPress = async (uuid: string, channelId: number, conversation_type?: string) => {
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
            const instance_type = historyResponse.data.result[0];
            const lastMessageId = instance_type.id;
            console.log("------------------ UUID : ", uuid,
                "------------------- Conversation _type ", conversation_type,
                "--------------- CHANNEL ID : ", channelId);
            if (lastMessageId) {
                await axios.post(
                    `${CONFIG.SERVER_URL}/mail/channel/seen`,
                    {
                        jsonrpc: '2.0',
                        method: 'call',
                        params: {
                            channel_id: conversation_type === 'notification' ? null : channelId,
                            last_message_id: lastMessageId,
                            uuid: conversation_type === 'notification' ? uuid : null
                        },
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
                    channelId: channelId?.toString(),
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