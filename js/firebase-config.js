// Firebase設定
// ※ 自分のFirebaseプロジェクトの設定に書き換えてください
// 設定方法はREADME.mdを参照
const firebaseConfig = {
  apiKey: "AIzaSyBCMwWFiPNGAc6TM70cMXyFP2kTeVJ8eo8",
  authDomain: "beyblade-record.firebaseapp.com",
  databaseURL: "https://beyblade-record-default-rtdb.firebaseio.com",
  projectId: "beyblade-record",
  storageBucket: "beyblade-record.firebasestorage.app",
  messagingSenderId: "402316707012",
  appId: "1:402316707012:web:a5bb74d59214b6646ef591"
};

// Firebase初期化
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
