import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import useHomeChatData from '@/hooks/useHomeChatData';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('fr');

// interface Props {
//   chatData: ChatData[];
//   error: string;
//   filterType: 'chat' | 'channel' | 'group' | null;
//   onConversationPress: (uuid: string, channelId: number) => void;
// }

// export function ConversationList({ chatData, error, filterType, onConversationPress }: Props) {
//   const filteredData = filterType
//     ? chatData.filter(item => item.conversation_type === filterType)
//     : chatData;

//   return (
//     <>
//       {error ? <Text style={styles.error}>{error}</Text> : null}
//       <FlatList
//         data={filteredData}
//         keyExtractor={item => item.uuid}
//         renderItem={({ item }) => (
//           <TouchableOpacity onPress={() => onConversationPress(item.uuid, item.channelId)}>

type ConversationDrawerListItemProps = {
    channel: {
        name?: string;
        conversation_type: 'channel' | 'chat' | 'group';
        email: string;
        text: string;
        time: string;
        uuid: string;
        channelId: number;
        unreadCount: number;
    };
    theme: {
        tint: string;
    };
};

export function ConversationDrawerListItem({ channel, theme }: ConversationDrawerListItemProps) {
    const isChaine = channel.conversation_type === 'channel';
    const isGroup = channel.conversation_type === 'group';

    const { handleConversationPress } = useHomeChatData();

    return (
        <TouchableOpacity style={styles.contactItem} onPress={() => handleConversationPress(channel.uuid, channel.channelId)}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                    style={[
                        styles.iconContainer,
                        {
                            borderRadius: isChaine ? 5 : 15,
                            backgroundColor: theme.tint,
                            marginRight: 8,
                        },
                    ]}
                >
                    {isChaine ? (
                        <Text style={styles.hashtag}>#</Text>
                    ) : isGroup ? (
                        <IconSymbol name="person.3.fill" size={20} color="#FFFFFF" />
                    ) : (
                        <Text style={styles.hashtag}>
                            {(channel.name || channel.email).charAt(0).toUpperCase()}
                        </Text>
                    )}
                </View>
                <ThemedText style={styles.email}>{channel.name}</ThemedText>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    contactItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    hashtag: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    email: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    iconContainer: {
        backgroundColor: '#6B46C1',
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginRight: 10,
    },
});
