import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDXHqVpnN6mMOabojCvnNib969_GSg1A-A",
  authDomain: "formulaire-etp-formation.firebaseapp.com",
  projectId: "formulaire-etp-formation",
  storageBucket: "formulaire-etp-formation.firebasestorage.app",
  messagingSenderId: "562941796443",
  appId: "1:562941796443:web:5f25e9e2275b99bc7c1f7e",
  measurementId: "G-X6SH65EN25"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };