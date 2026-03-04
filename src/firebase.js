import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBq6GdINtwloen5NtNdkylH_Bc0Yhz2lBM",
  authDomain: "skipq-b3a49.firebaseapp.com",
  projectId: "skipq-b3a49",
  storageBucket: "skipq-b3a49.firebasestorage.app",
  messagingSenderId: "660807174169",
  appId: "1:660807174169:web:97328b8133e421a16e4288"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);