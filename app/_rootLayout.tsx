import { useUser } from '@/contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import DrawerContent from '../components/drawer/DrawerContent';

export default function RootLayout() {
  const { userData, setUserData } = useUser();
  const router = useRouter();
  const [loaded] = useFonts({ SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf') });
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleDarkMode = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    await AsyncStorage.setItem('darkMode', newMode.toString());
  };

  const initializeApp = async () => {
    const savedTheme = await AsyncStorage.getItem('darkMode');
    if (savedTheme !== null) setIsDarkMode(savedTheme === 'true');

    const storedUser = await AsyncStorage.getItem('user');
    const lastSession = await AsyncStorage.getItem('lastSession');
    const now = new Date();

    if (storedUser && lastSession) {
      const { timestamp } = JSON.parse(lastSession);
      const lastTime = new Date(timestamp);
      const diffMinutes = (now.getTime() - lastTime.getTime()) / (1000 * 60);

      if (diffMinutes < 30) setUserData(JSON.parse(storedUser));
      else {
        await AsyncStorage.removeItem('lastSession');
        await AsyncStorage.removeItem('user');
        setUserData(null);
      }
    } else setUserData(null);
  };

  useEffect(() => {
    initializeApp();
  }, []);

  return (
    <ThemeProvider value={isDarkMode ? DarkTheme : DefaultTheme}>
      {userData ? (
        <Drawer
          screenOptions={{ headerShown: false, drawerPosition: 'right' }}
          drawerContent={(props) => <DrawerContent {...props} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />}
        >
          {/* Menu et ses enfants avec header */}
          <Drawer.Screen name="(menu)" options={{ title: 'Menu' }} />

          {/* Tabs également enfant du menu layout, header reste */}
          <Drawer.Screen name="(tabs)" options={{ title: 'Home' }} />

          {/* Chat indépendant, pas de header */}
          <Drawer.Screen name="(chat)/[uuid]" options={{ title: 'Conversation' }} />
        </Drawer>
      ) : (
        // Login, pas de header
        <Drawer screenOptions={{ headerShown: false, drawerPosition: 'right' }}>
          <Drawer.Screen name="(login)" options={{ title: 'Login' }} />
        </Drawer>
      )}
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
