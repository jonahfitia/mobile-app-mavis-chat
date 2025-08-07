import { useColorScheme } from '@/hooks/useColorScheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import DrawerContent from '../components/DrawerContent';
import SplashScreen from './screens/SplashScreen';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  })

  const [showSplash, setShowSplash] = useState(true);
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);

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
      console.log("saveTheme", savedTheme);
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'true');
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.warn('Erreur de chargement du thème:', error);
    } finally {
      setShowSplash(false);
    }
  };

  useEffect(() => {
    initializeApp();
  }, []);

  if (!loaded || error || showSplash) {
    return <SplashScreen />;
  }

  console.log('RootLayout rendered');
  return (
    <ThemeProvider value={isDarkMode ? DarkTheme : DefaultTheme}>
      <Drawer
        screenOptions={{
          headerShown: false,
          drawerPosition: 'right',
        }}
        drawerContent={(props) =>
          <DrawerContent
            {...props}
            isDarkMode={isDarkMode}
            toggleDarkMode={toggleDarkMode}
          />
        }
      >
        <Drawer.Screen
          name="(login)"
          options={{ title: 'Login' }}
        />
        <Drawer.Screen name="/home" options={{ title: 'Home' }} />
        <Drawer.Screen name="/(chat)/[uuid]" options={{ title: 'Conversation' }} />
      </Drawer>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
