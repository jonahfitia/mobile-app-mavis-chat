import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CONFIG } from '../../config';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('fr');

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

interface ChatMessage {
    id: number;
    text: string;
    time: string;
    isMine: boolean;
}

export default function ChatScreen() {
    const { uuid, conversation_type, email, name, channel_id } = useLocalSearchParams<{
        uuid: string;
        conversation_type: 'chat' | 'channel' | 'group';
        email: string;
        channel_id: string;
        name: string;
    }>();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [error, setError] = useState('');
    const [partnerId, setPartnerId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const flatListRef = useRef<FlatList>(null);
    const [showScrollToEnd, setShowScrollToEnd] = useState(false);
    const [userTimezone, setUserTimezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'] || Colors.light;

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
                    withCredentials: true,
                    headers: {
                        'Content-Type': 'application/json',
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
            if (!partner) {
                setError('Impossible de récupérer le partenaire.');
                return;
            }
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

    useEffect(() => {
        let isMounted = true;

        const load = async () => {
            setIsLoading(true);
            await fetchMessages();
            if (isMounted) {
                setIsLoading(false);
            }
        };

        load();

        return () => {
            isMounted = false;
        };
    }, [uuid]);

    useEffect(() => {
        if (!isLoading && messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages, isLoading]);

    useEffect(() => {
        const updateTimezoneAndTime = () => {
            const newTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (newTimezone !== userTimezone) {
                setUserTimezone(newTimezone);
                console.log('Mise à jour du fuseau horaire:', newTimezone);
            }
        };

        updateTimezoneAndTime();
        const interval = setInterval(updateTimezoneAndTime, 60000);
        return () => clearInterval(interval);
    }, [userTimezone]);

    const sendMessage = async () => {
        if (!newMessage.trim()) return;

        try {
            const userData = await AsyncStorage.getItem('user');
            if (!userData) {
                setError('User not logged in');
                return;
            }

            const user: UserInfo = JSON.parse(userData);
            if (!uuid) {
                setError('UUID is missing or invalid');
                return;
            }

            const newMsg: ChatMessage = {
                id: Date.now(),
                text: newMessage,
                time: new Date().toISOString(),
                isMine: true,
            };
            setMessages((prev) => [...prev, newMsg]);
            setNewMessage('');
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);

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
                    withCredentials: true,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            console.log('Message envoyé - Réponse API:', response.data);
            Keyboard.dismiss();
            await fetchMessages();
        } catch (err) {
            setError('Failed to send message');
            console.error('Erreur lors de l\'envoi du message:', err);
        }
    };

    function renderItemWithDateSeparator({ item, index }: { item: ChatMessage; index: number }) {
        const previous = messages[index - 1];
        const currentDate = dayjs.utc(item.time).tz(userTimezone);
        const previousDate = previous ? dayjs.utc(previous.time).tz(userTimezone) : null;
        const showDate = !previousDate || !previousDate.isSame(currentDate, 'day');
        const systemTime = new Date().getTime();
        const today = dayjs.tz(systemTime, userTimezone);

        const isToday = currentDate.isSame(today, 'day');
        const showTime = !previousDate || currentDate.format('HH:mm') !== previousDate.format('HH:mm');
        return (
            <>
                {showDate && (
                    <View style={styles.dateSeparator}>
                        <View style={styles.line} />
                        <Text style={styles.dateSeparatorText}>
                            {isToday ? "Aujourd'hui" : currentDate.format('dddd DD MMMM YYYY')}
                        </Text>
                        <View style={styles.line} />
                    </View>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                    <View style={[!item.isMine ? { marginLeft: 5 } : {}, { flex: 1 }]}>
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
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
            <KeyboardAvoidingView
                style={{ flex: 1, backgroundColor: theme.background }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 50}
            >
                <View style={{ flex: 1 }}>
                    <View style={[styles.header, { backgroundColor: theme.tint }]}>
                        <View style={styles.profileIcon}>
                            <Text style={styles.profileLetter}>{name.charAt(0)}</Text>
                            <View style={styles.onlineDot} />
                        </View>
                        <Text style={[styles.headerTitle, { color: theme.background }]}>{name}</Text>
                        <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
                            <Ionicons name="close" size={24} color={theme.background} />
                        </TouchableOpacity>
                    </View>

                    {error ? <Text style={styles.error}>{error}</Text> : null}
                    {isLoading && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color="#007AFF" />
                        </View>
                    )}
                    {!isLoading && (
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={renderItemWithDateSeparator}
                            contentContainerStyle={[styles.messageList, messages.length === 0 && { flex: 1 }]}
                            keyboardShouldPersistTaps="handled"
                            onScroll={(event) => {
                                const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
                                const isContentSmallerThanScreen = contentSize.height <= layoutMeasurement.height;
                                const isAtBottom =
                                    isContentSmallerThanScreen ||
                                    layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;

                                setShowScrollToEnd(!isAtBottom);
                            }}
                            scrollEventThrottle={100}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>Aucun message</Text>
                                </View>
                            }
                        />
                    )}
                    <View style={[styles.inputContainer, { backgroundColor: theme.tint }]}>
                        <TouchableOpacity onPress={() => console.log('Add media')}>
                            <Ionicons name="camera-outline" size={24} color="#fff" style={styles.inputIcon} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => console.log('Voice input')}>
                            <Ionicons name="mic-outline" size={24} color="#fff" style={styles.inputIcon} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => console.log('Add image')}>
                            <Ionicons name="image-outline" size={24} color="#fff" style={styles.inputIcon} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => console.log('Add emoji')}>
                            <Ionicons name="happy-outline" size={24} color="#fff" style={styles.inputIcon} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => console.log('Add more')}>
                            <Ionicons name="add-circle-outline" size={24} color="#fff" style={styles.inputIcon} />
                        </TouchableOpacity>
                        <TextInput
                            value={newMessage}
                            onChangeText={setNewMessage}
                            placeholder="Message..."
                            style={[styles.input]}
                            placeholderTextColor="#888"
                            multiline={true}
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
                </View>
                {showScrollToEnd && (
                    <TouchableOpacity
                        style={styles.fab}
                        onPress={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    >
                        <Ionicons name="arrow-down" size={28} color="#fff" />
                    </TouchableOpacity>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 40 : 20,
        paddingHorizontal: 15,
        paddingBottom: 5,
        backgroundColor: '#fff',
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
    messageList: {
        flexGrow: 1,
        padding: 15,
        paddingBottom: 30,
    },
    messageContainer: {
        marginBottom: 5,
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
        padding: 5,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#ccc',
        minHeight: 50,
    },
    input: {
        flex: 1,
        paddingHorizontal: 5,
        backgroundColor: '#f0f0f0',
        fontSize: 16,
        marginHorizontal: 5,
        textAlignVertical: 'center',
        height: 15,
        textAlign: 'left',
        paddingVertical: 5,
    },
    inputIcon: {
        paddingHorizontal: 3,
    },
    error: {
        color: 'red',
        textAlign: 'center',
        margin: 10,
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
    fab: {
        position: 'absolute',
        bottom: 150,
        right: 20,
        backgroundColor: '#0d7ecac6',
        borderRadius: 25,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#888',
    },
});