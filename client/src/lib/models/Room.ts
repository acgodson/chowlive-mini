import { Message } from './Message';
import Song from './Song';
import User from './User';

interface Room {
  id: string;
  nftId: number;
  owner_id: string;
  creator_id: string;
  name: string;
  isPublic: boolean;
  messages: Message[];
  queuedSongs: Song[];
  users: User[];
  slug: string;
}
export type Queue = Song[];

export default Room;
