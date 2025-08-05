import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { ProgressBar } from 'react-native-paper';

const SplashScreen = () => {
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  useEffect(() => {
    // Animation de fondu du texte
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
    }).start();

    // Progression dynamique
    const interval = setInterval(() => {
      if (progressRef.current < 1) {
        progressRef.current += 0.01;
        setProgress(progressRef.current);
      } else {
        clearInterval(interval); // Arrête la progression à 100%
        checkAuthAndNavigate();
      }
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const checkAuthAndNavigate = async () => {
    const userData = await AsyncStorage.getItem('user');
    const lastSession = await AsyncStorage.getItem('lastSession');
    const now = new Date();
    if (userData && lastSession) {
      const { timestamp } = JSON.parse(lastSession);
      const lastTime = new Date(timestamp);
      const diffMinutes = (now.getTime() - lastTime.getTime()) / (1000 * 60);
      if (diffMinutes < 30) {
        router.replace('/(tabs)/ChatScreen'); // Connecté
      } else {
        await AsyncStorage.removeItem('lastSession');
        router.replace('/(login)'); // Déconnecté après 30 min
      }
    } else {
      router.replace('/(login)'); // Pas de données utilisateur
    }
  };

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.title, { opacity: fadeAnim }]}>
        MAVIS CHAT
      </Animated.Text>
      <ProgressBar
        progress={progress}
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