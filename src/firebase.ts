import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyDBv_Uue2q-t3tU2jWz7moy5F0PemrEt1A",
    authDomain: "clipzrun.firebaseapp.com",
    projectId: "clipzrun",
    storageBucket: "clipzrun.firebasestorage.app",
    messagingSenderId: "590774403152",
    appId: "1:590774403152:web:05d8361816352512599155",
    measurementId: "G-XP83J48JYF"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
