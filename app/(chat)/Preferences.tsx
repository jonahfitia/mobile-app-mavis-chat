import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

const Preferences = () => {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const [isDarkMode, setIsDarkMode] = useState(colorScheme === 'dark');
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [language, setLanguage] = useState('Français');

    useEffect(() => {
        // Charger les préférences sauvegardées
        const loadPreferences = async () => {
            const savedDarkMode = await AsyncStorage.getItem('darkMode');
            const savedNotifications = await AsyncStorage.getItem('notificationsEnabled');
            const savedLanguage = await AsyncStorage.getItem('language');
            if (savedDarkMode !== null) setIsDarkMode(savedDarkMode === 'true');
            if (savedNotifications !== null) setNotificationsEnabled(savedNotifications === 'true');
            if (savedLanguage) setLanguage(savedLanguage);
        };
        loadPreferences();
    }, []);

    const savePreferences = async () => {
        await AsyncStorage.setItem('darkMode', isDarkMode.toString());
        await AsyncStorage.setItem('notificationsEnabled', notificationsEnabled.toString());
        await AsyncStorage.setItem('language', language);
    };

    const toggleDarkMode = () => {
        setIsDarkMode((prev) => !prev);
        savePreferences();
    };

    const toggleNotifications = () => {
        setNotificationsEnabled((prev) => !prev);
        savePreferences();
    };

    const changeLanguage = (newLanguage: string) => {
        setLanguage(newLanguage);
        savePreferences();
    };

    return (
        <View style={[styles.container, isDarkMode && styles.darkContainer]}>
            <View style={styles.header}>
                <Text style={[styles.headerText, isDarkMode && styles.darkText]}>Préférences</Text>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="close" size={24} color={isDarkMode ? '#fff' : '#000'} />
                </TouchableOpacity>
            </View>

            {/* Option Mode sombre */}
            <View style={styles.preferenceItem}>
                <Text style={[styles.label, isDarkMode && styles.darkText]}>Mode sombre</Text>
                <Switch
                    onValueChange={toggleDarkMode}
                    value={isDarkMode}
                    trackColor={{ false: '#d3d3d3', true: '#aa2b2bff' }}
                    thumbColor={isDarkMode ? '#fff' : '#f4f3f4'}
                />
            </View>

            {/* Option Notifications */}
            <View style={styles.preferenceItem}>
                <Text style={[styles.label, isDarkMode && styles.darkText]}>Notifications</Text>
                <Switch
                    onValueChange={toggleNotifications}
                    value={notificationsEnabled}
                    trackColor={{ false: '#d3d3d3', true: '#aa2b2bff' }}
                    thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
                />
            </View>

            {/* Option Langue */}
            <View style={styles.preferenceItem}>
                <Text style={[styles.label, isDarkMode && styles.darkText]}>Langue</Text>
                <View style={styles.languageOptions}>
                    <TouchableOpacity
                        style={[styles.languageButton, language === 'Français' && styles.selectedLanguage]}
                        onPress={() => changeLanguage('Français')}
                    >
                        <Text style={[styles.languageText, isDarkMode && styles.darkText]}>Français</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.languageButton, language === 'English' && styles.selectedLanguage]}
                        onPress={() => changeLanguage('English')}
                    >
                        <Text style={[styles.languageText, isDarkMode && styles.darkText]}>English</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 20,
    },
    darkContainer: {
        backgroundColor: '#333',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
    },
    darkText: {
        color: '#fff',
    },
    preferenceItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    label: {
        fontSize: 18,
        color: '#000',
    },
    languageOptions: {
        flexDirection: 'row',
    },
    languageButton: {
        padding: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        marginLeft: 10,
    },
    selectedLanguage: {
        backgroundColor: '#aa2b2bff',
        borderColor: '#aa2b2bff',
    },
    languageText: {
        color: '#000',
    },
});

export default Preferences;