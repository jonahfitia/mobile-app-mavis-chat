import { Channel } from "./channel";

export interface InitMessagingResponse {
    jsonrpc: string;
    id: number | null;
    result: {
        channel_slots: {
            channel_channel: Channel[];
            channel_direct_message: Channel[];
            channel_private_group: Channel[];
        };
        current_partner: { id: number; email: string; name: string };
    };
}
