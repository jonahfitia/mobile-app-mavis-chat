import { ScrollView } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function ChaineScreen() {
  return (
      <ScrollView contentContainerStyle={{ padding: 8 }}>
        <ThemedView>
          <ThemedText type="title">Chaine!</ThemedText>
        </ThemedView>
      </ScrollView>
  );
}
