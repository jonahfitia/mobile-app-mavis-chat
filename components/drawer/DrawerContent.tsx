import { Colors } from "@/constants/Colors";
import { useUser } from "@/contexts/UserContext";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Image, StyleSheet, Switch, Text, useColorScheme, View } from "react-native";

interface DrawerContentProps {
    isDarkMode: boolean;
    toggleDarkMode: () => void;
};

export default function DrawerContent(props: any & DrawerContentProps) {
    const colorScheme = useColorScheme();
    const { isDarkMode, toggleDarkMode } = props;
    const router = useRouter();
    const [user_name, setUsername] = useState<string>('');
    const [mail, setMail] = useState<string>('');
    const { userData, logout } = useUser();

    useEffect(() => {
        getUser();
    }, []);

    const handleLogoutOrSwitchAccount = async () => {
        Alert.alert(
            'Change Account',
            'You want to logout or just change account ?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    onPress: async () => {
                        await logout();
                        await AsyncStorage.clear();
                        router.replace('/(login)');
                    },
                    style: 'destructive',
                },
                {
                    text: 'Change account',
                    onPress: async () => {
                        await logout();
                        await AsyncStorage.removeItem('user');
                        await AsyncStorage.removeItem('lastSession');
                        router.replace('/(login)');
                    },
                },
            ]
        );
    };

    const getUser = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                setUsername(user.name);
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

    const theme = Colors[colorScheme ?? 'light'] || Colors.light;

    return (
        <DrawerContentScrollView
            {...props}
            contentContainerStyle={[styles.drawerContainer, { backgroundColor: theme.background }]}
        >
            <View style={[styles.drawerHeader, { backgroundColor: theme.tint }]}>
                <Image
                    source={require('../../assets/images/splash-icon.png')}
                    style={styles.profileImage}
                />
                <View style={styles.profileInfo}>
                    <Text style={[styles.drawerName, { color: '#fff' }]}>
                        {user_name}
                    </Text>
                    <Text style={[styles.drawerStatus, { color: "#fff" }]}>
                        {mail}
                    </Text>
                </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
                <DrawerItem
                    label={({ focused, color }) => (
                        <Text style={{ fontSize: 16, color }}>
                            Dark / Light
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
                        Preferences
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
                        Logout / Change account
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
        color: "#fff"
    },
    drawerName: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    drawerStatus: {
        fontSize: 14,
    },
});
