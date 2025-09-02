import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { CONFIG } from "@/config";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { ConversationType } from "@/types/chat/chatData";
import { ChatMessage } from "@/types/chat/chatMessage";
import { UserInfo } from "@/types/chat/userInfo";

type Props = {
  uuid: string;
  conversation: ConversationType;
};

export default function ChatScreen({ uuid, conversation }: Props) {
  const colorScheme = useColorScheme();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [userTimezone, setUserTimezone] = useState<string>("");

  const flatListRef = useRef<FlatList>(null);
  const channel_id = conversation.channel_id?.[0] ?? null;

  // ---- 1. Charger user au montage ----
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await AsyncStorage.getItem("user");
        if (userData) {
          const user: UserInfo = JSON.parse(userData);
          setUserId(user.partner_id);
        }
      } catch (err) {
        console.error("Erreur chargement user:", err);
      }
    };
    loadUser();
  }, []);

  // ---- 2. Charger historique au changement de conversation ----
  useEffect(() => {
    if (!uuid || !userId) return;
    let isMounted = true;

    const loadHistory = async () => {
      setIsLoading(true);
      await fetchMessages();
      if (isMounted) setIsLoading(false);
    };

    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [uuid, userId]);

  // ---- 3. Scroll auto à la fin quand messages changent ----
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, isLoading]);

  // ---- 4. Détecter le fuseau horaire une seule fois ----
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setUserTimezone(tz);
    console.log("Fuseau horaire détecté :", tz);
  }, []);

  // ---- 5. Long polling temps réel ----
  useEffect(() => {
    if (!channel_id || !userId) return;
    let isPolling = true;

    const pollForMessages = async () => {
      try {
        const userData = await AsyncStorage.getItem("user");
        if (!userData) return;
        const user: UserInfo = JSON.parse(userData);

        const session_id = await AsyncStorage.getItem("session_id");
        if (!session_id) return;

        const response = await axios.post(
          `${CONFIG.baseUrl}/longpolling/poll`,
          {
            channels: [[`mail.channel/${channel_id}`, user.partner_id]],
            last: 0,
            options: { bus_inactivity: true },
          },
          {
            headers: {
              "Content-Type": "application/json",
              Cookie: `session_id=${session_id}`,
            },
            timeout: 60000, // 60s max
          }
        );

        if (response.data && response.data.length > 0) {
          await fetchMessages();
        }

        if (isPolling) pollForMessages();
      } catch (err) {
        console.error("Erreur polling:", err);
        await new Promise((res) => setTimeout(res, 5000)); // retry après 5s
        if (isPolling) pollForMessages();
      }
    };

    pollForMessages();
    return () => {
      isPolling = false;
    };
  }, [channel_id, userId]);

  // ---- Charger messages ----
  const fetchMessages = async () => {
    try {
      const session_id = await AsyncStorage.getItem("session_id");
      if (!session_id || !channel_id) return;

      const response = await axios.post(
        `${CONFIG.baseUrl}/web/dataset/call_kw/mail.channel/message_fetch`,
        {
          model: "mail.channel",
          method: "message_fetch",
          args: [channel_id, false, false, false],
          kwargs: { limit: 30 },
        },
        {
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session_id}`,
          },
        }
      );

      if (response.data.result) {
        const fetched: ChatMessage[] = response.data.result.map(
          (msg: any) => ({
            id: msg.id,
            body: msg.body,
            date: msg.date,
            author_id: msg.author_id,
            isMine: msg.author_id[0] === userId,
          })
        );
        setMessages(fetched);
      }
    } catch (err) {
      console.error("Erreur fetch messages:", err);
    }
  };

  // ---- Envoyer un message ----
  const sendMessage = async () => {
    if (!text.trim() || !channel_id) return;
    try {
      const session_id = await AsyncStorage.getItem("session_id");
      if (!session_id) return;

      await axios.post(
        `${CONFIG.baseUrl}/web/dataset/call_kw/mail.channel/message_post`,
        {
          model: "mail.channel",
          method: "message_post",
          args: [channel_id],
          kwargs: {
            body: text,
            message_type: "comment",
            subtype_xmlid: "mail.mt_comment",
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session_id}`,
          },
        }
      );

      setText("");
      await fetchMessages();
    } catch (err) {
      console.error("Erreur envoi message:", err);
    }
  };

  // ---- Render item message ----
  const renderItem = ({ item }: { item: ChatMessage }) => (
    <View
      style={{
        flexDirection: "row",
        justifyContent: item.isMine ? "flex-end" : "flex-start",
        marginVertical: 4,
        paddingHorizontal: 10,
      }}
    >
      <View
        style={{
          backgroundColor: item.isMine
            ? Colors[colorScheme].tint
            : Colors[colorScheme].background,
          padding: 10,
          borderRadius: 12,
          maxWidth: "75%",
        }}
      >
        <Text style={{ color: item.isMine ? "#fff" : Colors[colorScheme].text }}>
          {item.body}
        </Text>
        <Text
          style={{
            fontSize: 10,
            marginTop: 4,
            textAlign: "right",
            color: item.isMine ? "#eee" : "#888",
          }}
        >
          {dayjs(item.date).locale("fr").format("HH:mm")}
        </Text>
      </View>
    </View>
  );

  // ---- UI ----
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors[colorScheme].background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {isLoading ? (
        <ActivityIndicator
          size="large"
          color={Colors[colorScheme].tint}
          style={{ marginTop: 20 }}
        />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 10 }}
        />
      )}

      {/* Zone saisie message */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderTopWidth: 1,
          borderTopColor: "#ccc",
          padding: 8,
          backgroundColor: Colors[colorScheme].background,
        }}
      >
        <TextInput
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 20,
            paddingHorizontal: 15,
            paddingVertical: 8,
            color: Colors[colorScheme].text,
          }}
          placeholder="Écrire un message..."
          placeholderTextColor="#888"
          value={text}
          onChangeText={setText}
        />
        <TouchableOpacity
          onPress={sendMessage}
          style={{ marginLeft: 8, padding: 6 }}
        >
          <Ionicons
            name="send"
            size={22}
            color={Colors[colorScheme].tint}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

