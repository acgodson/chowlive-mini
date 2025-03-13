export enum MessageType {
  UserChat = 'chat',
  UserJoin = 'join',
  UserLeave = 'leave',
}

export interface Message {
  id: string; // Firestore auto-generated ID
  type: 'chat' | 'join' | 'leave';
  content: string;
  timestamp: number; 
  roomId: string; 
  userId: string; 
}
