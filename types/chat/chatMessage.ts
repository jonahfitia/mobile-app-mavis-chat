import { Attachment } from "./attachment";

export interface ChatMessage {
    id: number;
    text: string;
    time: string;
    isMine: boolean;
    attachments_ids?: Attachment[];
}