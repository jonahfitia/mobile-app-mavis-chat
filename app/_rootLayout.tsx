// app/_layout.tsx
import { useUser } from '@/contexts/UserContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import DrawerContent from '../components/drawer/DrawerContent';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { userData, setUserData } = useUser();

  const toggleDarkMode = async () => {
    try {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);
      await AsyncStorage.setItem('darkMode', newMode.toString());
    } catch (e) {
      console.error('Erreur lors de la sauvegarde du thème:', e);
    }
  };

  const initializeApp = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('darkMode');
      if (savedTheme !== null) setIsDarkMode(savedTheme === 'true');

      const storedUser = await AsyncStorage.getItem('user');
      const lastSession = await AsyncStorage.getItem('lastSession');
      const now = new Date();

      if (storedUser && lastSession) {
        const { timestamp } = JSON.parse(lastSession);
        const lastTime = new Date(timestamp);
        const diffMinutes = (now.getTime() - lastTime.getTime()) / (1000 * 60);

        if (diffMinutes < 30) {
          setUserData(JSON.parse(storedUser));
        } else {
          await AsyncStorage.removeItem('lastSession');
          await AsyncStorage.removeItem('user');
          setUserData(null);
        }
      } else {
        setUserData(null);
      }
    } catch (err) {
      console.error('Erreur initialization app:', err);
      setUserData(null);
    }
  };

  useEffect(() => {
    initializeApp();
  }, []);

  return (
    <ThemeProvider value={isDarkMode ? DarkTheme : DefaultTheme}>
      {userData ? (
        <Drawer
          screenOptions={{
            headerShown: false,
            drawerPosition: 'right',
          }}
          drawerContent={(props) => (
            <DrawerContent
              {...props}
              isDarkMode={isDarkMode}
              toggleDarkMode={toggleDarkMode}
            />
          )}
        >
          <Drawer.Screen name="(tabs)" options={{ title: 'Home' }} />
          <Drawer.Screen name="(chat)/[uuid]" options={{ title: 'Conversation' }} />
        </Drawer>
      ) : (
        <Drawer
          screenOptions={{
            headerShown: false,
            drawerPosition: 'right',
          }}
        >
          <Drawer.Screen name="(login)" options={{ title: 'Login' }} />
        </Drawer>
      )}
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
