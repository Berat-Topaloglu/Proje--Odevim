// Mobile Firebase Configuration
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

// Web ile aynı config kullanılır
const firebaseConfig = {
    apiKey: "AIzaSyDZUU2y6RrpUceSGQJKxRtqsNGJVT-31Sk",
    authDomain: "proje-odevim-1b12c.firebaseapp.com",
    projectId: "proje-odevim-1b12c",
    storageBucket: "proje-odevim-1b12c.firebasestorage.app",
    messagingSenderId: "550310950985",
    appId: "1:550310950985:web:d38efda308a831fd7c6798"
};

const app = initializeApp(firebaseConfig);

// React Native için persistent auth kurulumu
export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
