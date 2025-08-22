import { Stack, useRouter } from 'expo-router';
import { Alert, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pressable } from 'react-native';

export default function NotFoundScreen() {

  const handleLogoutOrSwitchAccount = async () => {
    const user = await AsyncStorage.getItem('user');

    const router = useRouter();
    console.log("User data:", user);
    Alert.alert(
      'Change Account',
      'You want to logout or just change account ?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            await AsyncStorage.removeItem('user');
            await AsyncStorage.removeItem('lastSession');

            const user = await AsyncStorage.getItem('user');
            router.replace('/(login)');
          },
          style: 'destructive',
        },
        {
          text: 'Change account',
          onPress: async () => {
            await AsyncStorage.removeItem('user');
            await AsyncStorage.removeItem('lastSession');

            const user = await AsyncStorage.getItem('user');
            console.log("User data: ---12----------", user);
            router.replace('/(login)');
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <ThemedView style={styles.container}>
        <ThemedText type="title">This screen does not exist.</ThemedText>
        <Pressable
          style={styles.link}
          onPress={handleLogoutOrSwitchAccount}
        >
          <ThemedText type="link">Go to home screen!</ThemedText>
        </Pressable>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
