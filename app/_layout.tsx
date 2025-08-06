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
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

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

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('darkMode');
        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === 'true'); // 'true' (string) -> true (boolean)
        }
      } catch (error) {
        console.warn('Erreur de chargement du thème:', error);
      } finally {
        setShowSplash(false);
      }
    };

    initializeApp();
  }, []);

  if (showSplash || !loaded) {
    return <SplashScreen />;
  }

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
      </Drawer>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
