import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  doc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { getAuth} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDXHqVpnN6mMOabojCvnNib969_GSglA-A",
  authDomain: "formulaire-etp-formation.firebaseapp.com",
  projectId: "formulaire-etp-formation",
  storageBucket: "formulaire-etp-formation.firebasestorage.app",
  messagingSenderId: "562941796443",
  appId: "1:562941796443:web:5f25e9e2275b99bc7c1f7e"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export { collection, addDoc, getDocs, serverTimestamp, doc, deleteDoc };
