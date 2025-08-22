export interface Channel {
    unreadCount: number | null;
    id: number;
    name: string;
    uuid: string;
    channel_type: 'chat' | 'channel' | 'group';
    members?: { id: number; email: string; name: string }[];
    last_message_id?: number;
}