import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import useHomeChatData from '@/hooks/useHomeChatData';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ConversationDrawerListItem } from './ConversationDrawerListItem';

// Define the type for a conversation item (based on ChatData from useHomeChatData)
interface Conversation {
    name: string;
    conversation_type: 'channel' | 'chat' | 'group' | 'notification';
    email: string;
    text: string;
    time: string;
    uuid: string;
    channelId: number;
    unreadCount: number;
}

// Define the props interface for ConversationDrawer
interface ConversationDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    conversations?: Conversation[];
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

const ConversationDrawer = ({ isOpen, onClose, conversations }: ConversationDrawerProps) => {
    const slideAnim = useRef(new Animated.Value(0)).current;
    const [searchQuery, setSearchQuery] = useState('');
    const randomBgColor = React.useMemo(() => getRandomColor(), []);
    const colorScheme = useColorScheme();

    const { handleConversationPressWithAllParameter } = useHomeChatData();

    useEffect(() => {
        if (isOpen) {
            Animated.timing(slideAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [isOpen]);

    const translateY = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [200, 0],
    });

    const allChannels = conversations?.filter(c => c.conversation_type === 'channel' || c.conversation_type === 'group') || [];
    const users = conversations?.filter(c => c.conversation_type === 'chat') || [];

    const filteredUsers = users.filter(item =>
        (item.name || item.email)?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const theme = Colors[colorScheme ?? 'light'] || Colors.light;
    if (!isOpen) return null;


    return (
        <View style={styles.overlay}>
            <Animated.View
                style={[
                    styles.drawer,
                    {
                        backgroundColor: theme.background,
                        transform: [{ translateY }],
                        height: '90%', // Ajustez selon vos besoins
                    },
                ]}
            >
                {/* Barre de recherche */}
                <View style={styles.buttonContainer}>
                    <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Rechercher une conversation..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} color="#000" />
                    </TouchableOpacity>
                </View>
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={[styles.createButton, { backgroundColor: theme.tabIconSelected }]} onPress={() => console.log('Créer un canal')}>
                        <Text style={styles.buttonText}>Créer un canal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.createButton, { backgroundColor: theme.tabIconSelected }]} onPress={() => console.log('Créer un chat')}>
                        <Text style={styles.buttonText}>Créer un chat</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.drawerSectionTitle}>Tous les canaux</Text>
                <ScrollView style={styles.drawerContent}>
                    {allChannels.length > 0 ? (
                        allChannels.map((channel, index) => (
                            <ConversationDrawerListItem
                                key={channel.uuid}
                                channel={channel}
                                theme={theme}
                                onConversationPress={handleConversationPressWithAllParameter}
                            />
                        ))
                    ) : (
                        <Text>Aucun canal disponible</Text>
                    )}
                </ScrollView>
                <Text style={styles.drawerSectionTitle}>Utilisateurs</Text>
                <ScrollView style={styles.drawerContent}>
                    {filteredUsers.length > 0 ? (
                        filteredUsers.map((user, index) => (
                            <ConversationDrawerListItem
                                key={index}
                                channel={user}
                                theme={theme}
                                onConversationPress={handleConversationPressWithAllParameter}
                            />
                        ))
                    ) : (
                        <Text>Aucun utilisateur</Text>
                    )}
                </ScrollView>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
        zIndex: 1000,
    },
    drawer: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 5,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
        paddingHorizontal: 10,
    },
    searchIcon: {
        marginRight: 5,
    },
    searchInput: {
        flex: 1,
        height: 40,
        fontSize: 16,
        color: '#333',
    },
    drawerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    drawerContent: {
        padding: 5,
    },
    drawerSectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 10,
        marginBottom: 5,
        color: '#333',
    },
    contactItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    separator: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 10,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
    },
    createButton: {
        flex: 1,
        paddingVertical: 5,
        borderRadius: 5,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
    },
    email: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 2,
    },
});

export default ConversationDrawer;