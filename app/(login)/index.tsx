
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput, Title, useTheme } from 'react-native-paper';
import { CONFIG } from './../../config';

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState<string>('jonahrafit.ram@hotmail.com');
  const [password, setPassword] = useState<string>('admin');
  const [secureText, setSecureText] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true); // ✅ Commence le chargement
    setError(null);   // Réinitialise l'erreur

    try {
      const response = await fetch(`${CONFIG.SERVER_URL}/web/session/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          params: {
            db: CONFIG.DATABASE_NAME,
            login: email,
            password: password,
          },
        }),
      });

      const data = await response.json();

      if (data.error) {
        Alert.alert('Erreur', data.error.message || 'Échec de l\'authentification');
      } else if (data.result && data.result.uid) {

        if (data.result && data.result.uid) {
          const userInfo = {
            uid: data.result.uid,
            name: data.result.name,
            session_id: data.result.session_id,
            context: data.result.user_context,
          };

          await AsyncStorage.setItem('user', JSON.stringify(userInfo));

        router.replace('/(tabs)' as const);
        }
      } else {
        Alert.alert('Erreur', 'Identifiants incorrects');
      }
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      Alert.alert('Erreur', 'Une erreur s\'est produite. Vérifiez votre connexion réseau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.innerContainer}>
        <Title style={styles.title}>MAVIS CHAT</Title>
        <TextInput
          label="Mail Address"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setError(null);
          }}
          mode="outlined"
          keyboardType="default"
          textContentType="emailAddress"
          editable={true}
          autoCapitalize="none"
          style={styles.input}
          error={!!error}
        />

        <TextInput
          label="Password"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setError(null);
          }}
          autoCapitalize="none"
          secureTextEntry={secureText}
          mode="outlined"
          style={styles.input}
          error={!!error}
          right={
            <TextInput.Icon
              icon={secureText ? 'eye-off' : 'eye'}
              onPress={() => setSecureText(!secureText)}
            />
          }
        />
        {error && <Text style={styles.errorText}>{error}</Text>}

        <Button
          mode="contained"
          onPress={handleLogin}
          disabled={loading}
          loading={loading}
          style={styles.button}
          contentStyle={{ paddingVertical: 8 }}
        >
          Connexion
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    padding: 20,
  },
  innerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    color: '#555',
  },
  input: {
    marginBottom: 16,
  },
  errorText: {
    color: 'red',
    marginBottom: 12,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    borderRadius: 8,
  },
  footer: {
    marginTop: 20,
    textAlign: 'center',
    color: '#888',
  },
});