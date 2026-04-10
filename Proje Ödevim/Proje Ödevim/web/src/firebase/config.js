// Firebase Yapılandırması
// ÖNEMLİ: Bu bilgileri Firebase Console'dan alarak buraya yapıştırın
// https://console.firebase.google.com → Proje Ayarları → Web Uygulaması Ekle

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDZUU2y6RrpUceSGQJKxRtqsNGJVT-31Sk",
  authDomain: "proje-odevim-1b12c.firebaseapp.com",
  projectId: "proje-odevim-1b12c",
  storageBucket: "proje-odevim-1b12c.firebasestorage.app",
  messagingSenderId: "550310950985",
  appId: "1:550310950985:web:d38efda308a831fd7c6798"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
