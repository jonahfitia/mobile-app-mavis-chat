import { Message } from "./message";

export interface PollResponse {
    jsonrpc: string;
    id: number | null;
    result: Array<{
        channel: ['mail.channel', number];
        message: Message;
    }>;
}