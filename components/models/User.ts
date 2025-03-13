// import Service from './Service';

// interface User {
//   id: string;
//   service: Service;
//   serviceId: string;
//   online: boolean;
//   name: string;
//   imageSrc: string;
//   // favoritedRooms: Room[];
// }

interface User {
  id: string; // Firestore auto-generated ID
  service: 'spotify';
  online: boolean;
  name: string;
  imageSrc?: string;
  serviceId: string;
  // favoritedRooms: Room[];
}

export default User;
