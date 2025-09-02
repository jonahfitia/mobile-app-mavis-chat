import { ChatMessage } from '@/types/chat/chatMessage';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import React from 'react';
import {
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import HTMLView from 'react-native-htmlview';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('fr');

// --------------------- Composant Message Memoisé ---------------------
type ChatMessageItemProps = {
  message: ChatMessage;
  previousMessage?: ChatMessage;
  userTimezone: string;
};

export const ChatMessageItem = React.memo(({ message, previousMessage, userTimezone }: ChatMessageItemProps) => {
  const currentDate = dayjs.utc(message.time).tz(userTimezone);
  const previousDate = previousMessage ? dayjs.utc(previousMessage.time).tz(userTimezone) : null;
  const showDate = !previousDate || !previousDate.isSame(currentDate, 'day');
  const showTime = !previousDate || currentDate.format('HH:mm') !== previousDate.format('HH:mm');

  const today = dayjs.tz(new Date(), userTimezone);
  const isToday = currentDate.isSame(today, 'day');

  // console.log(" --------------- ");
  // console.log("previousMessage --------------- ", previousMessage);
  // console.log("message ------------ ", message);
  // console.log(" --------------- ");

  return (
    <>
      {showDate && (
        <View style={styles.dateSeparator}>
          <View style={styles.line} />
          <Text style={styles.dateSeparatorText}>{isToday ? "Aujourd'hui" : currentDate.format('dddd DD MMMM YYYY')}</Text>
          <View style={styles.line} />
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <View style={[{ flex: 1 }, !message.isMine && { marginLeft: 5 }]}>
          {showTime && (
            <Text style={[styles.messageTime, message.isMine ? styles.messageTimeRight : styles.messageTimeLeft]}>
              {currentDate.format('HH:mm')}
            </Text>
          )}
          <View style={[styles.messageContainer, message.isMine ? styles.myMessage : styles.otherMessage]}>
            {message.text && <HTMLView value={message.text} stylesheet={styles} />}
            {message.attachments_ids?.filter(att => att.mimetype?.startsWith("image/")).map((att, idx) => (
              <Image key={idx} source={{ uri: att.url?.replace("?download=true", "") }} style={{ width: 200, height: 200, borderRadius: 8, marginTop: 5 }} resizeMode="cover" />
            ))}
            {message.attachments_ids?.filter(att => att.mimetype?.startsWith("application/")).map((att, idx) => (
              <TouchableOpacity key={idx} onPress={() => Linking.openURL(att.url)} style={{ marginTop: 5, flexDirection: "row", alignItems: "center" }}>
                <Text style={{ color: "#007bff" }}>📎 {att.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  myMessage: { backgroundColor: '#dcf8c6', alignSelf: 'flex-end' },
  otherMessage: { backgroundColor: '#f0f0f0', alignSelf: 'flex-start' },
  messageText: { fontSize: 15, color: '#000', lineHeight: 20 },
  messageTimeLeft: { alignSelf: 'flex-start' },
  messageTimeRight: { alignSelf: 'flex-end' },
  messageContainer: { marginBottom: 5, padding: 5, borderRadius: 10, maxWidth: '75%', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  dateSeparator: { flexDirection: 'row', alignItems: 'center', marginVertical: 10 },
  messageTime: { fontSize: 10, color: '#888', textAlign: 'right', marginTop: 4 },
  dateSeparatorText: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 15, color: '#555', fontSize: 12 },
  line: { flex: 1, height: 1, backgroundColor: '#a17676ff' },
});