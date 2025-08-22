export interface UserInfo {
    uid: number;
    name: string;
    session_id: string;
    context: Record<string, any>;
}