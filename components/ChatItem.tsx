import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type ChatItemProps = {
  conversation_type: string;
  email: string;
  text: string;
  time: string;
  unreadCount: number | null;
};

function getRandomColor() {
  // Génère une couleur hex aléatoire
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

export function ChatItem({ conversation_type, email, text, time, unreadCount }: ChatItemProps) {
  const isToday = dayjs(time).isSame(dayjs(), 'day');
  const colorScheme = useColorScheme();
  const formattedTime = isToday
    ? dayjs(time).format('HH:mm')
    : dayjs(time).locale('fr').format('D MMM');

  const isChaine = conversation_type === 'channel';
  const randomBgColor = React.useMemo(() => getRandomColor(), []);

  return (
    <ThemedView style={[
      styles.container,
      {
        borderWidth: 1,
        borderColor: Colors[colorScheme ?? 'light'].tint
      }
    ]}>
      <View
        style={[
          styles.iconContainer,
          {
            borderRadius: isChaine ? 5 : 15,
            backgroundColor: randomBgColor
          },
        ]}
      >
        {isChaine ? (
          <Text style={styles.hashtag}>#</Text>
        ) : (
          <IconSymbol name="person.3.fill" size={20} color="#FFFFFF" />
        )}
      </View>

      <ThemedView style={styles.content}>
        <ThemedText style={styles.email}>{email}</ThemedText>
        <ThemedText numberOfLines={1} ellipsizeMode="tail" style={styles.message}>
          {text}
        </ThemedText>
      </ThemedView>
      <View style={{ alignItems: 'center', justifyContent: 'flex-end', minHeight: 38 }}>
        {/* {unreadCount && unreadCount > 0 && ( */}
          <View style={[styles.badge, { position: 'relative', top: 0, right: 0, marginBottom: 2 }]}>
            <Text style={styles.badgeText}>{unreadCount ? (unreadCount > 9 ? '9+' : unreadCount) : null}</Text>
          </View>
        {/* )} */}
        <ThemedText style={styles.timeText}>{String(formattedTime)}</ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 5,
    marginBottom: 5,
  },
  iconContainer: {
    backgroundColor: '#6B46C1',
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginRight: 10,
  },
  hashtag: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  email: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
  },
  timeText: {
    fontSize: 12,
    color: '#A0AEC0',
    alignSelf: 'flex-end',
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: -8,
    backgroundColor: '#E53E3E',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#f1e8e8ff',
    fontSize: 8,
    fontWeight: 'bold',
  },
});
