export type ConversationType = 'channel' | 'chat' | 'group' | 'notification';

export interface ChatData {
    name: string;
    conversation_type: ConversationType;
    email: string;
    text: string;
    time: string;
    uuid: string;
    channelId: number;
    unreadCount: number;
    target?: {
        model: string;
        res_id: number;
    };
}