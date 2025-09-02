import { ChatMessageItem } from '@/components/ChatMessageItem';
import { CONFIG } from '@/config';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ConversationType } from '@/types/chat/chatData';
import { ChatMessage } from '@/types/chat/chatMessage';
import { Message } from '@/types/chat/message';
import { UserInfo } from '@/types/chat/userInfo';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('fr');

export default function ChatScreen() {
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { uuid, conversation_type, email, name, channel_id, userId, session_id } = useLocalSearchParams<{
    uuid: string;
    conversation_type: ConversationType;
    email: string;
    channel_id: string;
    name: string;
    userId: string;
    session_id: string;
  }>();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');
  const [partnerId, setPartnerId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollToEnd, setShowScrollToEnd] = useState(false);
  const [userTimezone, setUserTimezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone);

  const flatListRef = useRef<FlatList>(null);
  const pollingRef = useRef(false);
  const lastIdRef = useRef(0);

  const theme = Colors[colorScheme ?? 'light'] || Colors.light;
  const seenMessageIdsRef = useRef<Set<number | string>>(new Set());

  // ---------- Détecter fuseau horaire ----------
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setUserTimezone(tz);
    console.log("Fuseau horaire détecté :", tz);
  }, []);

  // ---------- Charger historique ----------
  useEffect(() => {
    // console.log("------------------------");
    // console.log("channel_id ", channel_id);
    // console.log("conversation_type ", conversation_type);
    // console.log("email ", email);
    // console.log("name ", name);
    // console.log("uuid ", uuid);
    // console.log("userId ", userId);
    // console.log("session_id ", session_id);
    // console.log("partnerId ", partnerId);
    // console.log("------------------------");
    if (!uuid) return;
    let isMounted = true;
    const loadHistory = async () => {
      setIsLoading(true);
      await fetchMessages();
      if (isMounted) setIsLoading(false);
    };
    loadHistory();
    return () => { isMounted = false; };
  }, [uuid]);

  // ---------- Scroll automatique ----------
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, isLoading]);

  // ---------- Fetch messages (NE PAS modifier lastIdRef ici) ----------
  const fetchMessages = async () => {
    try {
      const partner = await getPartnerId();
      if (!partner) { setError('Impossible de récupérer le partenaire.'); return; }
      setPartnerId(partner);

      const userData = await AsyncStorage.getItem('user');
      if (!userData) { setError('User not logged in'); return; }
      const user: UserInfo = JSON.parse(userData);

      const historyResponse = await axios.post<{ result: Message[] }>(
        `${CONFIG.SERVER_URL}/mail/chat_history`,
        { jsonrpc: '2.0', method: 'call', params: { uuid, limit: 50 } },
        { headers: { 'Content-Type': 'application/json', Cookie: `session_id=${user.session_id}` } }
      );

      const messagesData = historyResponse.data.result || [];
      const formattedMessages = messagesData
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((msg) => ({
          id: msg.id,
          text: msg.body || 'No message',
          time: msg.date,
          isMine: msg.author_id[0] === partner,
          attachments_ids: msg.attachments_ids?.map((att: any) => ({
            id: att.id,
            url: `${CONFIG.SERVER_URL}/web/content/${att.id}?download=true`,
            name: att.name || `Attachment-${att.id}`,
            filename: att.name || `Attachment-${att.id}`,
            mimetype: att.mimetype,
          })) || [],
        }));

      setMessages(formattedMessages);

      // DEBUG: confirm loaded messages (ne pas confondre avec "last" du bus)
      console.log("[fetchMessages] loaded ----------- ", formattedMessages.length, "messages (message ids).");
      // IMPORTANT : on NE change PAS lastIdRef ici, lastIdRef est le curseur notifications (bus id).
    } catch (err) {
      setError('Failed to load messages');
      console.error('Erreur lors du chargement des messages:', err);
    }
  };

  // Helper : normalise payload.attachment_ids qui peut être :
  // - un tableau d'IDs [1,2,3]
  // - un tableau d'objets [{id, name, mimetype}, ...]
  // - undefined / autre
  function normalizeAttachments(attachmentField: any) {
    if (!attachmentField) return [];

    // cas : [1, 2, 3] (IDs)
    if (Array.isArray(attachmentField) && attachmentField.length > 0 && typeof attachmentField[0] === 'number') {
      return attachmentField.map((attId: number) => ({
        id: attId,
        url: `${CONFIG.SERVER_URL}/web/content/${attId}?download=true`,
        name: String(attId),
        filename: String(attId),
        mimetype: undefined,
      }));
    }

    // cas : [{ id, name, mimetype, ... }, ...]
    if (Array.isArray(attachmentField) && attachmentField.length > 0 && typeof attachmentField[0] === 'object') {
      return attachmentField.map((att: any) => ({
        id: att.id,
        url: att.url ?? `${CONFIG.SERVER_URL}/web/content/${att.id}?download=true`,
        name: att.name ?? att.filename ?? String(att.id),
        filename: att.filename ?? att.name ?? String(att.id),
        mimetype: att.mimetype,
      }));
    }

    // fallback : vide
    return [];
  }

  // ---------- Long-polling useEffect (corrigé) ----------
  useEffect(() => {
    if (!channel_id) return;
    if (!partnerId) {
      console.log('[longpoll] waiting partnerId...');
      return;
    }

    let active = true;

    const poll = async () => {
      if (!active || pollingRef.current) return;
      pollingRef.current = true;

      try {
        const userData = await AsyncStorage.getItem("user");
        if (!userData) return;
        const user: UserInfo = JSON.parse(userData);

        // UTILISE UNE STRING (obligatoire pour bus.Bus)
        // Ex: "mail.channel_8" ou (si nécessaire) "mavis_prod/6/mail.channel" — la plupart fonctionnent avec mail.channel_<id>
        const channelsPayload = [`mail.channel_${channel_id}`];

        const response = await axios.post(
          `${CONFIG.SERVER_URL}/longpolling/poll`,
          {
            jsonrpc: "2.0",
            method: "call",
            params: {
              channels: channelsPayload,
              last: lastIdRef.current || 0,
              options: {}
            },
          },
          {
            headers: {
              "Content-Type": "application/json",
              Cookie: `session_id=${user.session_id}`,
            },
            timeout: 65000,
          }
        );
        console.log('[longpoll] response.data:', response.data);

        // si serveur renvoie un curseur global 'id' (optionnel), le prendre
        if (response.data && typeof response.data.id === 'number') {
          lastIdRef.current = Math.max(lastIdRef.current || 0, response.data.id);
        }

        const result = response.data.result;
        if (Array.isArray(result) && result.length > 0) {
          console.log('[longpoll] notifications count=', result.length);

          setMessages(prev => {
            const next = [...prev];

            for (const notif of result) {
              // parse payload for different formats:
              // - notif = { id: X, channel: [...], message: {...} }
              // - notif = [channel, id, payload]  (parfois)
              // - notif = { payload: {...} } (parfois)
              const payload = notif?.message ?? (Array.isArray(notif) ? notif[2] : (notif.payload || notif));

              console.log(" p l a y l o a d ------------ ", payload);
              // notification id (cursor) — mettre à jour lastIdRef
              if (typeof notif.id === 'number') {
                lastIdRef.current = Math.max(lastIdRef.current || 0, notif.id);
              }

              if (!payload) {
                console.log('[longpoll] notif without payload:', notif);
                continue;
              }

              // certains payloads sont des events (typing_status, channel_seen, etc.) -> skip si pas de message réel
              const isInfoEvent = !!payload.info && !payload.body && !payload.id;
              if (isInfoEvent) {
                // tu peux gérer typing_status / channel_seen ici si besoin
                continue;
              }

              // payload peut avoir message.id (id du message) ou payload.id
              const messageId = payload.id ?? payload.message_id ?? null;
              if (!messageId) {
                console.log('[longpoll] payload missing message id, skip', payload);
                continue;
              }

              // normaliser les attachments
              const attachments = normalizeAttachments(payload.attachment_ids ?? payload.attachment_ids);

              // pousser le message normalisé
              next.push({
                id: messageId,
                text: (payload.body ? String(payload.body).replace(/<[^>]+>/g, "") : 'No message'),
                time: payload.date || new Date().toISOString(),
                isMine: Array.isArray(payload.author_id) ? payload.author_id[0] === partnerId : false,
                attachments_ids: attachments,
              });
            }

            return next;
          });
        } else {
          // result vide = timeout normal (aucun event) -> on relance
          console.log('[longpoll] result empty (timeout or no events).');
        }
      } catch (err) {
        console.error('[longpoll] error:', err);
        // pause avant retry si erreur réseau / 401 etc.
        await new Promise(res => setTimeout(res, 2000));
      } finally {
        pollingRef.current = false;
        if (active) poll(); // relancer la boucle
      }
    };

    poll();

    return () => { active = false; };
  }, [channel_id, partnerId]);


  // ---------- Send message ----------
  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      const userData = await AsyncStorage.getItem('user');
      if (!userData) { setError('User not logged in'); return; }
      const user: UserInfo = JSON.parse(userData);
      if (!uuid) { setError('UUID is missing'); return; }

      const newMsg: ChatMessage = { id: Date.now(), text: newMessage, time: new Date().toISOString(), isMine: true, attachments_ids: [] };
      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
      setTimeout(() => { flatListRef.current?.scrollToEnd({ animated: true }); }, 100);

      const res = await axios.post(`${CONFIG.SERVER_URL}/mail/chat_post`,
        { jsonrpc: '2.0', method: 'call', params: { uuid, message_content: newMessage } },
        { headers: { 'Content-Type': 'application/json' }, withCredentials: true }
      );

      console.log(" res +++++++++++++ ", res.data.result);
      console.log(" res ++++++ 1 +++++++ ", newMessage);

      const result_id = res.data.result;
      Keyboard.dismiss();
      // await fetchMessages();
    } catch (err) {
      setError('Failed to send message');
      console.error('Erreur lors de l\'envoi du message:', err);
    }
  };

  const getPartnerId = async (): Promise<number | null> => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (!userData) { setError('User not logged in'); return null; }
      const user: UserInfo = JSON.parse(userData);

      const sessionResponse = await axios.post(`${CONFIG.SERVER_URL}/web/session/get_session_info`, { jsonrpc: '2.0', method: 'call', params: {} }, { withCredentials: true, headers: { 'Content-Type': 'application/json' } });
      const partnerId = sessionResponse.data?.result?.partner_id;
      return partnerId ?? null;
    } catch (err) {
      console.error('Erreur récupération partner_id:', err);
      return null;
    }
  };

  // ---------- RenderItem optimisé ----------
  const renderItem = useCallback(({ item, index }: { item: ChatMessage; index: number }) => {
    return (
      <ChatMessageItem
        message={item}
        previousMessage={messages[index - 1]}
        userTimezone={userTimezone}
      />
    )
  }, [messages, userTimezone]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 60}>
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.tint }]}>
            <View style={styles.profileIcon}>
              <Text style={styles.profileLetter}>{name?.charAt(0)}</Text>
              <View style={styles.onlineDot} />
            </View>
            <Text style={[styles.headerTitle, { color: theme.background }]}>{name}</Text>
            <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
              <Ionicons name="close" size={24} color={theme.background} />
            </TouchableOpacity>
          </View>

          {/* Error / Loading */}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {isLoading && <View style={styles.loadingContainer}><ActivityIndicator size="small" color="#007AFF" /></View>}

          {/* Messages */}
          {!isLoading && (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderItem}
              contentContainerStyle={[styles.messageList, messages.length === 0 && { flex: 1 }]}
              keyboardShouldPersistTaps="handled"
              // inverted
              initialNumToRender={20}
              maxToRenderPerBatch={20}
              windowSize={10}
              removeClippedSubviews
              onScroll={(event) => {
                const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
                const isContentSmallerThanScreen = contentSize.height <= layoutMeasurement.height;
                const isAtBottom = isContentSmallerThanScreen || layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
                setShowScrollToEnd(!isAtBottom);
              }}
              scrollEventThrottle={100}
            // ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>Aucun message</Text></View>} // voilà ce qui provoque le doublons d'affichage
            />
          )}

          {/* Input */}
          <View style={[styles.inputContainer, { backgroundColor: theme.tint }]}>
            <TouchableOpacity onPress={() => console.log('Add media')}><Ionicons name="camera-outline" size={24} color="#fff" style={styles.inputIcon} /></TouchableOpacity>
            <TouchableOpacity onPress={() => console.log('Voice input')}><Ionicons name="mic-outline" size={24} color="#fff" style={styles.inputIcon} /></TouchableOpacity>
            <TouchableOpacity onPress={() => console.log('Add image')}><Ionicons name="image-outline" size={24} color="#fff" style={styles.inputIcon} /></TouchableOpacity>
            <TouchableOpacity onPress={() => console.log('Add emoji')}><Ionicons name="happy-outline" size={24} color="#fff" style={styles.inputIcon} /></TouchableOpacity>
            <TouchableOpacity onPress={() => console.log('Add more')}><Ionicons name="add-circle-outline" size={24} color="#fff" style={styles.inputIcon} /></TouchableOpacity>
            <TextInput value={newMessage} onChangeText={setNewMessage} placeholder="Message..." style={[styles.input]} placeholderTextColor="#888" multiline />
            <TouchableOpacity onPress={sendMessage} disabled={!newMessage.trim()}><Ionicons name="send" size={24} color={newMessage.trim() ? '#0095f6' : '#888'} style={styles.inputIcon} /></TouchableOpacity>
          </View>

          {/* Scroll to bottom */}
          {showScrollToEnd && <TouchableOpacity style={styles.fab} onPress={() => flatListRef.current?.scrollToEnd({ animated: true })}><Ionicons name="arrow-down" size={28} color="#fff" /></TouchableOpacity>}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 40 : 20, paddingHorizontal: 15, paddingBottom: 5, marginTop: 25, shadowColor: '#d12020ff', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 20 },
  profileIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  profileLetter: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#00ff00', borderWidth: 2, borderColor: '#fff' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#000' },
  messageList: { flexGrow: 1, padding: 15, paddingBottom: 30 },
  messageContainer: { marginBottom: 5, padding: 5, borderRadius: 10, maxWidth: '75%', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  myMessage: { backgroundColor: '#dcf8c6', alignSelf: 'flex-end' },
  otherMessage: { backgroundColor: '#f0f0f0', alignSelf: 'flex-start' },
  messageText: { fontSize: 15, color: '#000', lineHeight: 20 },
  messageTime: { fontSize: 10, color: '#888', textAlign: 'right', marginTop: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 5, borderTopWidth: 1, borderTopColor: '#ccc', minHeight: 50, marginBottom: 35 },
  input: { flex: 1, paddingHorizontal: 5, backgroundColor: '#f0f0f0', fontSize: 16, marginHorizontal: 5, textAlignVertical: 'center', textAlign: 'left', paddingVertical: 5 },
  inputIcon: { paddingHorizontal: 3 },
  error: { color: 'red', textAlign: 'center', margin: 10 },
  dateSeparator: { flexDirection: 'row', alignItems: 'center', marginVertical: 10 },
  dateSeparatorText: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 15, color: '#555', fontSize: 12 },
  line: { flex: 1, height: 1, backgroundColor: '#a17676ff' },
  messageTimeLeft: { alignSelf: 'flex-start' },
  messageTimeRight: { alignSelf: 'flex-end' },
  fab: { position: 'absolute', bottom: 150, right: 20, backgroundColor: '#0d7ecac6', borderRadius: 25, width: 40, height: 40, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#888' },
});
