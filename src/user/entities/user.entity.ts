export class User {
  id: string;
  firebaseUid: string;
  email: string;
  username: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Date;
  updatedAt: Date;
}
