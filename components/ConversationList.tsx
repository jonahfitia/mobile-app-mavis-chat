import { ChatItem } from '@/components/ChatItem';
import { ThemedView } from '@/components/ThemedView';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text } from 'react-native';

interface ChatData {
    name: string | undefined;
    conversation_type: 'channel' | 'chat' | 'group';
    email: string;
    text: string;
    time: string;
    uuid: string;
    unreadCount: number;
}

type Props = {
    chatData: ChatData[];
    filterType: 'chat' | 'channel' | 'group' | null;
    error?: string;
};

export function ConversationList({ chatData, filterType, error }: Props) {
    const router = useRouter();
    const filtered = filterType
        ? chatData.filter(item => item.conversation_type === filterType)
        : chatData;

    return (
        <ScrollView contentContainerStyle={{ padding: 8 }}>
            <ThemedView style={{ marginTop: 10 }}>
                {error ? <Text style={{ color: 'red', textAlign: 'center', marginBottom: 10 }}>{error}</Text> : null}
                {filtered.length === 0 && !error ? (
                    <Text style={{ textAlign: 'center', color: '#666' }}>Aucune converstion trouvé</Text>
                ) : (
                    filtered.map((item) => (
                        <Pressable
                            key={item.uuid}
                            onPress={() =>
                                router.push({
                                    pathname: "/(chat)/[uuid]",
                                    params: {
                                        uuid: item.uuid,
                                        conversation_type: item.conversation_type,
                                        email: item.email,
                                    },
                                })
                            }
                        >
                            <ChatItem {...item} />
                        </Pressable>
                    ))
                )}
            </ThemedView>
        </ScrollView>
    );
}