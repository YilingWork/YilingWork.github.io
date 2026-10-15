// Firebase 專案設定：建立專案後，把 Firebase 主控台「專案設定 → 你的應用程式 → SDK 設定」的值貼進來。
// 這些值本來就會出現在網頁原始碼裡，不是密碼；資料安全靠 database.rules.json。
window.QUIZ_CONFIG = {
  firebase: {
    apiKey: "AIzaSyCToZ89K-iaagDOVaQFwXv8uUbRa0-FLUc",
    authDomain: "ntunhs-quiz.firebaseapp.com",
    databaseURL: "https://ntunhs-quiz-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "ntunhs-quiz",
    appId: "1:213613591808:web:b1fd565c50758765b647e5"
  },
  // 學生手機端網址（上線後填正式網址，投影端的 QR code 會用這個）
  playUrl: "https://yilingtsai.tw/health-care-systems/quiz/play.html",
  // 作答秒數
  secSingle: 20,
  secMulti: 30
};
