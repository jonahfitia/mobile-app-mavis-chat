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
};

function getRandomColor() {
  // Génère une couleur hex aléatoire
  const letters = '0123456789ABCDEF';
  let color = '#';
  for(let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

export function ChatItem({ conversation_type, email, text, time }: ChatItemProps) {
  const isToday = dayjs(time).isSame(dayjs(), 'day');
  const colorScheme = useColorScheme();
  const formattedTime = isToday
    ? dayjs(time).format('HH:mm')
    : dayjs(time).locale('fr').format('D MMM');

  const isChaine = conversation_type === 'chaine';
  const randomBgColor = React.useMemo(() => getRandomColor(), []);

  return (
    <ThemedView style={[
      styles.container,
      { borderWidth: 1,
        borderColor: Colors[colorScheme ?? 'light'].tint }
    ]}>
      <View
        style={[
          styles.iconContainer,
          { borderRadius: isChaine ? 5 : 15,
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

      <ThemedText style={styles.timeText}>{formattedTime}</ThemedText>
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
});
