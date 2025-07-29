import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { TextInput, useTheme } from 'react-native-paper';
import { CONFIG } from '../../config';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('fr');

// Types pour les données Odoo
interface UserInfo {
    uid: number;
    name: string;
    session_id: string;
    context: Record<string, any>;
}

interface Message {
    id: number;
    body: string;
    author_id: [number, string];
    channel_id: number;
    date: string;
}

interface PollResponse {
    jsonrpc: string;
    id: number | null;
    result: Array<{
        channel: ['mail.channel', number];
        message: Message;
    }>;
}

interface ChatMessage {
    id: number;
    text: string;
    time: string;
    isMine: boolean;
}

export default function ChatScreen() {
    const { uuid, conversation_type, email, channel_id } = useLocalSearchParams<{
        uuid: string;
        conversation_type: 'chat' | 'channel' | 'group';
        email: string;
        channel_id: string;
    }>();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [error, setError] = useState('');
    const [partnerId, setPartnerId] = useState<number | null>(null);
    const [lastPollTime, setLastPollTime] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(false);
    const theme = useTheme();
    const router = useRouter();
    const flatListRef = useRef<FlatList>(null);

    function getFormattedTime(time: string) {
        const isToday = dayjs(time).isSame(dayjs(), 'day');
        return isToday
            ? dayjs(time).format('HH:mm')
            : dayjs(time).locale('fr').format('D MMM HH:mm');
    }

    const getPartnerId = async (): Promise<number | null> => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (!userData) {
                setError('User not logged in');
                return null;
            }

            const user: UserInfo = JSON.parse(userData);
            const sessionResponse = await axios.post(
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

            const partnerId = sessionResponse.data?.result?.partner_id;
            return partnerId ?? null;
        } catch (err) {
            console.error('Erreur lors de la récupération du partner_id:', err);
            return null;
        }
    };

    const fetchMessages = async () => {
        try {
            const partner = await getPartnerId();
            if (!partner) return;
            setPartnerId(partner);

            const userData = await AsyncStorage.getItem('user');
            if (!userData) {
                setError('User not logged in');
                return;
            }
            const user: UserInfo = JSON.parse(userData);
            const historyResponse = await axios.post<{ result: Message[] }>(
                `${CONFIG.SERVER_URL}/mail/chat_history`,
                {
                    jsonrpc: '2.0',
                    method: 'call',
                    params: {
                        uuid,
                        limit: 50,
                    },
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Cookie: `session_id=${user.session_id}`,
                    },
                }
            );
            const messagesData = historyResponse.data.result || [];
            const formattedMessages = messagesData
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((msg) => ({
                    id: msg.id,
                    text: msg.body ? msg.body.replace(/<[^>]+>/g, '') : 'No message',
                    time: msg.date,
                    isMine: msg.author_id[0] === partner,
                }));
            setMessages(formattedMessages);
        } catch (err) {
            setError('Failed to load messages');
            console.error('Erreur lors du chargement des messages:', err);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchMessages();
        }, [fetchMessages])
    );

    useEffect(() => {
        setIsLoading(true);
        fetchMessages();
        setIsLoading(false);
    }, [uuid]);

    useEffect(() => {
        let isPolling = true;

        const pollForMessages = async () => {
            if (!partnerId || !channel_id || !CONFIG?.SERVER_URL) {
                return;
            }

            try {
                const userData = await AsyncStorage.getItem('user');
                if (!userData) return;
                const user: UserInfo = JSON.parse(userData);

                while (isPolling) {
                    const pollResponse = await axios.post<PollResponse>(
                        `${CONFIG.SERVER_URL}/longpolling/poll`,
                        {
                            jsonrpc: '2.0',
                            method: 'call',
                            params: {
                                channels: [['mail.channel', parseInt(channel_id)]],
                                last: lastPollTime,
                                options: { bus_inactivity: 60000 },
                            },
                        },
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                Cookie: `session_id=${user.session_id}`,
                            },
                        }
                    );

                    const notifications = pollResponse.data.result || [];
                    setLastPollTime(Date.now());

                    for (const notification of notifications) {
                        const { message } = notification;
                        setMessages((prev) => {
                            const exists = prev.some((msg) => msg.id === message.id);
                            if (exists) return prev;
                            return [
                                ...prev,
                                {
                                    id: message.id,
                                    text: message.body ? message.body.replace(/<[^>]+>/g, '') : 'No message',
                                    time: message.date,
                                    isMine: message.author_id[0] === partnerId
                                },
                            ];
                        });
                    }
                }
            } catch (err) {
                console.error('Erreur lors du polling:', err);
                setError('Failed to poll for new messages');
                await new Promise((resolve) => setTimeout(resolve, 5000));
                if (isPolling) pollForMessages();
            }
        };

        pollForMessages();
        return () => {
            isPolling = false;
        };
    }, [partnerId, channel_id]);

    // Scroll to the bottom when messages change
    useEffect(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

    const sendMessage = async () => {
        if (!newMessage.trim()) return;

        try {
            const userData = await AsyncStorage.getItem('user');
            if (!userData) {
                setError('User not logged in');
                return;
            }

            const user: UserInfo = JSON.parse(userData);
            const now = new Date().toISOString();

            const response = await axios.post(
                `${CONFIG.SERVER_URL}/mail/chat_post`,
                {
                    jsonrpc: '2.0',
                    method: 'call',
                    params: {
                        uuid: uuid,
                        message_content: newMessage,
                    },
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Cookie: `session_id=${user.session_id}`,
                    },
                }
            );

            console.log('Message envoyé:', response.data);
            setNewMessage('');
            Keyboard.dismiss();
        } catch (err) {
            setError('Failed to send message');
            console.error('Erreur lors de l\'envoi du message:', err);
        }
    };

    function renderItemWithDateSeparator({ item, index }: { item: ChatMessage; index: number }) {
        const previous = messages[index - 1];

        const currentDate = dayjs(item.time).tz('Africa/Nairobi');
        const previousDate = previous ? dayjs(previous.time).tz('Africa/Nairobi') : null;

        const showDate = !previousDate || !previousDate.isSame(currentDate, 'day');
        const today = dayjs().tz('Africa/Nairobi');

        const isToday = currentDate.isSame(today, 'day');
        const showTime =
            !previousDate || currentDate.format('HH:mm') !== previousDate.format('HH:mm');
        return (
            <>
                {showDate && (
                    <View style={styles.dateSeparator}>
                        <View style={styles.line} />
                        <Text style={styles.dateSeparatorText}>
                            {isToday
                                ? "Aujourd'hui"
                                : currentDate.format('dddd DD MMMM YYYY')}
                        </Text>
                        <View style={styles.line} />
                    </View>
                )}

                <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                    {/* {!item.isMine && (
                        <View style={{
                            width: 20,
                            height: 20,
                            borderRadius: 0,
                            backgroundColor: '#ddd',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: 8,
                        }}>
                            <Text style={{ fontWeight: 'bold', color: '#333' }}>
                                {email?.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )} */}
                    <View style={[
                        !item.isMine ? { marginLeft: 5 } : {},
                        { flex: 1 }
                    ]}>
                        {showTime && (
                            <Text
                                style={[
                                    styles.messageTime,
                                    item.isMine ? styles.messageTimeRight : styles.messageTimeLeft,
                                ]}
                            >
                                {currentDate.format('HH:mm')}
                            </Text>
                        )}
                        <View
                            style={[
                                styles.messageContainer,
                                item.isMine ? styles.myMessage : styles.otherMessage,
                            ]}
                        >
                            <Text style={styles.messageText}>{item.text}</Text>
                        </View>
                    </View>
                </View>
            </>
        );
    }


    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#fff' }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <View style={styles.header}>
                <View style={styles.profileIcon}>
                    <Text style={styles.profileLetter}>{email.charAt(0)}</Text>
                    <View style={styles.onlineDot} />
                </View>
                <Text style={styles.headerTitle}>{email}</Text>
                <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
                    <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {isLoading ? <Text style={styles.loading}>Loading...</Text> : null}
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItemWithDateSeparator}
                contentContainerStyle={styles.messageList}
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />
            <View style={styles.inputContainer}>
                <TouchableOpacity onPress={() => console.log('Add media')}>
                    <Ionicons name="camera-outline" size={24} color="#000" style={styles.inputIcon} />
                </TouchableOpacity>
                <TextInput
                    value={newMessage}
                    onChangeText={setNewMessage}
                    placeholder="Message..."
                    style={styles.input}
                    multiline
                    placeholderTextColor="#888"
                />
                <TouchableOpacity onPress={sendMessage} disabled={!newMessage.trim()}>
                    <Ionicons
                        name="send"
                        size={24}
                        color={newMessage.trim() ? '#0095f6' : '#888'}
                        style={styles.inputIcon}
                    />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 40 : 20,
        paddingHorizontal: 15,
        paddingBottom: 5,
        marginTop: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#aa2b2bff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 20,
    },
    profileIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    profileLetter: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
    onlineDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#00ff00',
        borderWidth: 2,
        borderColor: '#fff',
    },
    headerTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    headerActions: {
        flexDirection: 'row',
    },
    headerIcon: {
        marginLeft: 15,
    },
    messageList: {
        padding: 15,
        flexGrow: 1,
    },
    messageContainer: {
        marginBottom: 10,
        padding: 5,
        borderRadius: 10,
        maxWidth: '75%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    myMessage: {
        backgroundColor: '#dcf8c6',
        alignSelf: 'flex-end',
    },
    otherMessage: {
        backgroundColor: '#f0f0f0',
        alignSelf: 'flex-start',
    },
    messageText: {
        fontSize: 15,
        color: '#000',
        lineHeight: 20,
    },
    messageTime: {
        fontSize: 10,
        color: '#888',
        textAlign: 'right',
        marginTop: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 10,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#ccc',
    },
    input: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 8,
        fontSize: 16,
        marginHorizontal: 10,
    },
    inputIcon: {
        padding: 5,
    },
    error: {
        color: 'red',
        textAlign: 'center',
        margin: 10,
    },
    loading: {
        textAlign: 'center',
        margin: 10,
        color: '#888',
    },
    dateSeparator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10,
    },

    dateSeparatorText: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 15,
        color: '#555',
        fontSize: 12,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#a17676ff',
    },

    messageTimeLeft: {
        alignSelf: 'flex-start',
    },

    messageTimeRight: {
        alignSelf: 'flex-end',
    },
});