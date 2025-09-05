import { Attachment } from "./attachment";

export interface ChatMessage {
    id: number | string;
    clientId?: string;
    text: string;
    time: string;
    isMine: boolean;
    attachments_ids?: Attachment[];
}