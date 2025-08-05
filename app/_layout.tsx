import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import DrawerContent from './DrawerContent';
import SplashScreen from './screens/SplashScreen';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const [showSplash, setShowSplash] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // La vérification est maintenant dans SplashScreen
    setShowSplash(false); // Initialisé à false, SplashScreen gère la navigation
  }, []);

  if (!loaded || showSplash) {
    return <SplashScreen />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Drawer
        screenOptions={{
          headerShown: false,
          drawerPosition: 'right',
        }}
        drawerContent={(props) => <DrawerContent {...props} />}
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
