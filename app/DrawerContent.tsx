import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Image, StyleSheet, Text, View } from "react-native";

export default function CustomDrawerContent(props: any) {
    const { isDarkMode, toggleDarkMode } = props;
    const router = useRouter();

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
        <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContainer}>
            {/* En-tête personnalisé */}
            <View style={styles.drawerHeader}>
                <Image
                    source={require('../assets/images/splash-icon.png')} // Image locale fictive
                    style={styles.profileImage}
                />
                <View style={styles.profileInfo}>
                    <Text style={styles.drawerName}>John Doe</Text> {/* Remplacez par le nom réel */}
                    <Text style={styles.drawerStatus}>En ligne</Text>
                </View>
            </View>

            {/* Options du drawer */}
            <DrawerItem
                label={isDarkMode ? 'Mode clair' : 'Mode sombre'}
                icon={() => <Ionicons name={isDarkMode ? 'sunny' : 'moon'} size={20} color="#000" />}
                onPress={toggleDarkMode}
            />
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
        backgroundColor: '#f5f5f5',
    },
    drawerHeader: {
        padding: 20,
        backgroundColor: '#aa2b2bff',
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#fff',
    },
    profileImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
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