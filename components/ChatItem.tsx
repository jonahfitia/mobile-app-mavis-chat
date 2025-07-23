import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { StyleSheet, View } from 'react-native';

type ChatItemProps = {
  email: string;
  time: string;
};

export function ChatItem({ email, time }: ChatItemProps) {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.iconContainer}>
        <IconSymbol name="person.fill" size={20} color="#FFFFFF" />
      </View>
      <ThemedView style={styles.content}>
        <ThemedText>{email}</ThemedText>
        <ThemedText style={styles.actionText}>
          Vous : {email} a démarré un appel
        </ThemedText>
      </ThemedView>
      <ThemedText style={styles.timeText}>{time}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#2D2D2D',
    borderRadius: 5,
    marginBottom: 5,
  },
  iconContainer: {
    backgroundColor: '#6B46C1',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  content: {
    flex: 1,
  },
  actionText: {
    fontSize: 14,
    color: '#A0AEC0',
  },
  timeText: {
    fontSize: 12,
    color: '#A0AEC0',
  },
});