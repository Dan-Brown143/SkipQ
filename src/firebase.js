import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAB9aNmaY9r-978WblrfmnY6gGVJR8IRrk",
  authDomain: "skipq-7ef64.firebaseapp.com",
  projectId: "skipq-7ef64",
  storageBucket: "skipq-7ef64.firebasestorage.app",
  messagingSenderId: "756243761893",
  appId: "1:756243761893:web:d494ef5013233eccd7e20c"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);