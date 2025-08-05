import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Image, StyleSheet, Switch, Text, useColorScheme, View } from "react-native";

type Props = {
    isDarkMode: boolean;
    toggleDarkMode: () => void;
};

export default function CustomDrawerContent(props: any & Props) {
    const colorScheme = useColorScheme();
    const { isDarkMode, toggleDarkMode } = props;
    const router = useRouter();
    const [user_name, setUsername] = useState('');
    const [mail, setMail] = useState('');
    useEffect(() => {
        getUser();
    }, []);

    const getUser = async () => {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setUsername(user.name);
            setMail(user.mail || ''); // Assurez-vous que l'email est défini
        }
    };

    const handleLogoutOrSwitchAccount = async () => {
        Alert.alert(
            'Changer de compte',
            'Voulez-vous vous déconnecter ou changer de compte ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Déconnexion',
                    onPress: async () => {
                        await AsyncStorage.removeItem('user');
                        await AsyncStorage.removeItem('lastSession');
                        router.replace('/(login)');
                    },
                    style: 'destructive',
                },
                {
                    text: 'Changer de compte',
                    onPress: async () => {
                        // Logique pour changer de compte (par ex., rediriger vers une page de sélection)
                        await AsyncStorage.removeItem('user');
                        await AsyncStorage.removeItem('lastSession');
                        router.replace('/(login)'); // Remplacez par une route de sélection de compte si disponible
                    },
                },
            ]
        );
    };

    return (
        <DrawerContentScrollView {...props}
            contentContainerStyle={[styles.drawerContainer, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>

            <View style={[styles.drawerHeader, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}>
                <Image
                    source={require('../assets/images/splash-icon.png')} // Image locale fictive
                    style={styles.profileImage}
                />
                <View style={styles.profileInfo}>
                    <Text style={styles.drawerName}>{user_name}</Text> {/* Remplacez par le nom réel */}
                    <Text style={styles.drawerStatus}>{mail}</Text>
                </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
                <DrawerItem
                    label="Thème sombre"
                    icon={() => <Ionicons name={isDarkMode ? 'moon' : 'sunny'} size={20} color="#000" />}
                    onPress={toggleDarkMode}
                    style={{ flex: 1 }}
                />
                <Switch value={isDarkMode} onValueChange={toggleDarkMode} />
            </View>
            <DrawerItem
                label="Préférences"
                icon={() => <Ionicons name="settings" size={20} color="#000" />}
                onPress={() => router.push('/Preferences')} // Créez une page Preferences si nécessaire
            />
            <DrawerItem
                label="Déconnexion / Changer de compte"
                icon={() => <Ionicons name="log-out" size={20} color="#000" />}
                onPress={handleLogoutOrSwitchAccount}
            />
        </DrawerContentScrollView>
    );
}

const styles = StyleSheet.create({
    drawerContainer: {
        flex: 1,
    },
    drawerHeader: {
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#fff',
    },
    profileImage: {
        width: 50,
        height: 50,
        borderRadius: 20,
        marginRight: 15,
        borderWidth: 2,
        borderColor: '#fff',
    },
    profileInfo: {
        flex: 1,
    },
    drawerName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    drawerStatus: {
        fontSize: 14,
        color: '#ddd',
    },
});