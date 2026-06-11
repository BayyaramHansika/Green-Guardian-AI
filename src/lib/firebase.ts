import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBRixS_GZ1HAEGbhodwa5_vlUqsm2R8uAw",
  authDomain: "green-guardian-ai-bc161.firebaseapp.com",
  projectId: "green-guardian-ai-bc161",
  storageBucket: "green-guardian-ai-bc161.firebasestorage.app",
  messagingSenderId: "365207570239",
  appId: "1:365207570239:web:b6709eb1e6205d7993f58a",
  measurementId: "G-SCX5C3REBN"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
