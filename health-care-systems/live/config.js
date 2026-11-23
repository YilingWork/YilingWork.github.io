// 課堂互動系統設定：與搶答遊戲共用 Firebase 專案 ntunhs-quiz（資料放在 live/ 底下，不碰搶答遊戲的 rooms/）。
// 這些值本來就會出現在網頁原始碼裡，不是密碼；資料安全靠 database.rules.json。
window.LIVE_CONFIG = {
  firebase: {
    apiKey: "AIzaSyCToZ89K-iaagDOVaQFwXv8uUbRa0-FLUc",
    authDomain: "ntunhs-quiz.firebaseapp.com",
    databaseURL: "https://ntunhs-quiz-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "ntunhs-quiz",
    appId: "1:213613591808:web:b1fd565c50758765b647e5"
  },
  // 學生手機端網址（投影端的 QR code 會用這個）
  playUrl: "https://yilingtsai.tw/health-care-systems/live/play.html",
  // 文字雲每則字數上限
  cloudMax: 12
};
