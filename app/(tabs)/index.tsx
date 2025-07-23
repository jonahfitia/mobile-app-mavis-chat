import { ChatItem } from '@/components/ChatItem';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Pressable, ScrollView, Text } from 'react-native';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  return (
    <ScrollView contentContainerStyle={{ padding: 8 }}>
      <ThemedView style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 0 }}>
        <Pressable style={{ backgroundColor: Colors[colorScheme ?? 'light'].tint, width: "48%", padding: 10, borderRadius: 5 }}>
          <Text style={{ color: '#FFFFFF', textAlign: 'center' }}>Démarrer une réunion</Text>
        </Pressable>
        <Pressable style={{ backgroundColor: Colors[colorScheme ?? 'light'].tabIconDefault, width: "48%", padding: 10, borderRadius: 5 }}>
          <Text style={{ color: '#FFFFFF', textAlign: 'center' }}>Démarrer une conversation</Text>
        </Pressable>
      </ThemedView>
      <ThemedView style={{ padding: 8 }}>
        <ThemedView style={{ marginTop: 10 }}>
          <ChatItem email="jonahrafft@gmail.com" time="10:33" />
          <ChatItem email="jonahrafft@gmail.com" time="09:50" />
          <ChatItem email="OdooBot" time="09:49" />
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}