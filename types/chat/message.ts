import { Attachment } from "./attachment";

export interface Message {
    result: any;
    id: number;
    body: string;
    author_id: [number, string];
    channel_id: number;
    date: string;
    attachments_ids?: Attachment[];
}