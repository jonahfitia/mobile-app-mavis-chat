// app/_layout.tsx

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Drawer } from 'expo-router/drawer';
import { StatusBar } from 'expo-status-bar';

import { useColorScheme } from '@/hooks/useColorScheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Drawer
        screenOptions={{
          headerShown: false,
          drawerPosition: 'right',
        }}
      >
        {/* Point vers le layout de ton TabNavigator */}
        <Drawer.Screen name="(tabs)" />
      </Drawer>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
