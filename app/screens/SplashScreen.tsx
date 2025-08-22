import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { ProgressBar } from 'react-native-paper';

const SplashScreen = () => {
  const [progressValue, setProgressValue] = useState(0); // State to hold number value for ProgressBar
  const animatedProgress = useRef(new Animated.Value(0)).current; // Animated.Value for animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const hasNavigated = useRef(false);

  useEffect(() => {
    // Animation de fondu du texte
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
    }).start();

    // Animation de la barre de progression
    Animated.timing(animatedProgress, {
      toValue: 1,
      duration: 3000, // Durée totale de 3 secondes
      useNativeDriver: false, // ProgressBar ne prend pas en charge useNativeDriver
    }).start(({ finished }) => {
      if (finished) {
        console.log('Animation terminée, appel de checkAuthAndNavigate');
        checkAuthAndNavigate();
      }
    });

    // Écouter les changements de animatedProgress pour mettre à jour progressValue
    const listener = animatedProgress.addListener(({ value }) => {
      setProgressValue(value); // Convertir Animated.Value en number
    });

    // Nettoyer le listener pour éviter les fuites de mémoire
    return () => {
      animatedProgress.removeListener(listener);
    };
  }, []);

  const checkAuthAndNavigate = async () => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    try {
      const userData = await AsyncStorage.getItem('user');
      const lastSession = await AsyncStorage.getItem('lastSession');
      console.log('userData:', userData);
      console.log('lastSession:', lastSession);

      const now = new Date();
      if (userData && lastSession) {
        const { timestamp } = JSON.parse(lastSession);
        const lastTime = new Date(timestamp);
        const diffMinutes = (now.getTime() - lastTime.getTime()) / (1000 * 60);
        if (diffMinutes < 30) {
          router.replace('/(tabs)');
        } else {
          await AsyncStorage.removeItem('lastSession');
          router.replace('/(login)');
        }
      } else {
        router.replace('/(login)');
      }
    } catch (error) {
      console.error('Erreur dans checkAuthAndNavigate:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.title, { opacity: fadeAnim }]}>
        MAVIS CHAT
      </Animated.Text>
      <ProgressBar
        progress={progressValue} // Utiliser progressValue (number) au lieu de animatedProgress
        color="#0c25e1ff"
        style={styles.progressBar}
      />
      <Text style={styles.loadingText}>Loading in progress...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#aa2b2bff',
    marginBottom: 40,
    letterSpacing: 2,
  },
  progressBar: {
    width: '80%',
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e0e0e0',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 14,
    color: '#555',
    fontStyle: 'italic',
  },
});

export default SplashScreen;