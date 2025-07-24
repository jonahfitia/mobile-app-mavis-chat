import { ChatItem } from '@/components/ChatItem';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const chatData = [
  {
    conversation_type: 'chaine',
    email: 'support@exemple.com',
    text: 'Voici le résumé de la réunion d\'hier.',
    time: '2025-07-24T08:15:00',
  },
  {
    conversation_type: 'direct_chat',
    email: 'alice@example.com',
    text: 'Peux-tu m\'appeler quand tu es dispo ?',
    time: '2025-07-24T09:50:00',
  },
  {
    conversation_type: 'chaine',
    email: 'marketing@entreprise.com',
    text: 'Annonce : lancement produit prévu lundi.',
    time: '2025-07-23T15:10:00',
  },
  {
    conversation_type: 'direct_chat',
    email: 'bob@openai.com',
    text: 'Le rapport est terminé, je te l’envoie.',
    time: '2025-07-24T10:33:00',
  },
  {
    conversation_type: 'chaine',
    email: 'teamdev@startup.io',
    text: 'Standup à 9h30, soyez à l’heure 😉',
    time: '2025-07-24T07:00:00',
  },
  {
    conversation_type: 'direct_chat',
    email: 'carla.design@uiux.co',
    text: 'J’ai mis à jour la maquette Figma.',
    time: '2025-07-22T16:25:00',
  },
  {
    conversation_type: 'chaine',
    email: 'news@company.org',
    text: 'Newsletter mensuelle de juillet 📬',
    time: '2025-07-01T11:42:00',
  },
  {
    conversation_type: 'direct_chat',
    email: 'devops@infra.net',
    text: 'Redémarrage du serveur prévu à minuit.',
    time: '2025-07-20T22:00:00',
  },
  {
    conversation_type: 'direct_chat',
    email: 'sophie.rh@entreprise.com',
    text: 'Rappel : entretien RH demain à 14h.',
    time: '2025-07-23T10:00:00',
  },
  {
    conversation_type: 'chaine',
    email: 'groupe.finance@company.org',
    text: 'Documents de clôture du trimestre.',
    time: '2025-07-18T17:00:00',
  },
];

const sortedChatData = [...chatData].sort(
  (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
);


export default function HomeScreen() {
  const colorScheme = useColorScheme();

  return (
    <View style={{ flex: 1 }}>
      {/* Boutons en haut fixes */}
      <ThemedView style={styles.fixedHeader}>
        <Pressable style={[styles.button, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}>
          <IconSymbol name="video.fill" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>Démarrer une réunion</Text>
        </Pressable>
        <Pressable style={[styles.button, { backgroundColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
          <IconSymbol name="video.fill" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Démarrer une conversation</Text>
        </Pressable>
      </ThemedView>

      {/* Contenu scrollable */}
      <ScrollView contentContainerStyle={{ padding: 8, paddingTop: 80 }}>
        <ThemedView style={{ marginTop: 10 }}>
          {sortedChatData.map((item, index) => (
            <ChatItem
              key={index}
              conversation_type={item.conversation_type}
              email={item.email}
              text={item.text}
              time={item.time}
            />
          ))}
        </ThemedView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fixedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    paddingBottom: 4,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  button: {
    width: '48%',
    padding: 10,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
});