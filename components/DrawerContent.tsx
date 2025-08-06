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

export default function DrawerContent(props: any & Props) {
    const colorScheme = useColorScheme();
    const { isDarkMode, toggleDarkMode } = props;
    const router = useRouter();
    const [user_name, setUsername] = useState<string>('Guest');
    const [mail, setMail] = useState<string>('');

    useEffect(() => {
        getUser();
    }, []);

    const getUser = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                setUsername(user.name || 'Guest');
                setMail(user.mail || 'No email provided');
            } else {
                setUsername('Guest');
                setMail('No email provided');
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            setUsername('Guest');
            setMail('No email provided');
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
                        await AsyncStorage.removeItem('user');
                        await AsyncStorage.removeItem('lastSession');
                        router.replace('/(login)');
                    },
                },
            ]
        );
    };

    const theme = Colors[colorScheme ?? 'light'] || Colors.light;

    return (
        <DrawerContentScrollView
            {...props}
            contentContainerStyle={[styles.drawerContainer, { backgroundColor: theme.background }]}
        >
            <View style={[styles.drawerHeader, { backgroundColor: theme.tint }]}>
                <Image
                    source={require('../assets/images/splash-icon.png')}
                    style={styles.profileImage}
                />
                <View style={styles.profileInfo}>
                    <Text style={[styles.drawerName, { color: theme.text }]}>
                        {user_name}
                    </Text>
                    <Text style={[styles.drawerStatus, { color: theme.text }]}>
                        {mail}
                    </Text>
                </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
                <DrawerItem
                    label={({ focused, color }) => (
                        <Text style={{ fontSize: 16, color }}>
                            Thème sombre
                        </Text>
                    )}
                    icon={({ focused, size, color }) => (
                        <Ionicons name={isDarkMode ? 'moon' : 'sunny'} size={20} color={color} />
                    )}
                    onPress={toggleDarkMode}
                    style={{ flex: 1 }}
                />
                <Switch value={isDarkMode} onValueChange={toggleDarkMode} />
            </View>

            <DrawerItem
                label={({ focused, color }) => (
                    <Text style={{ fontSize: 16, color }}>
                        Préférences
                    </Text>
                )}
                icon={({ focused, size, color }) => (
                    <Ionicons name="settings" size={20} color={color} />
                )}
                onPress={() => router.push('/Preferences')}
            />
            <DrawerItem
                label={({ focused, color }) => (
                    <Text style={{ fontSize: 16, color }}>
                        Déconnexion / Changer de compte
                    </Text>
                )}
                icon={({ focused, size, color }) => (
                    <Ionicons name="log-out" size={20} color={color} />
                )}
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
    },
    drawerStatus: {
        fontSize: 14,
    },
});
