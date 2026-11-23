// Firebase SDK 버전 10 (CDN ES Module 방식)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 사용자가 제공한 Firebase 설정 정보
const firebaseConfig = {
    apiKey: "AIzaSyCkTKNGXU_2d16ZQSACbhuz0KJ4nkECirA",
    authDomain: "guestbook-bdc07.firebaseapp.com",
    projectId: "guestbook-bdc07",
    storageBucket: "guestbook-bdc07.firebasestorage.app",
    messagingSenderId: "646690090121",
    appId: "1:646690090121:web:9b0d4a11f0752499b7ea58",
    measurementId: "G-G3SZ8M32TG"
};

// Firebase 앱 및 Firestore 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp };
