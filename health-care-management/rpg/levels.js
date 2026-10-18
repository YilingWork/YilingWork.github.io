// 醫療機構經營 RPG：關卡設定檔
// 教師每週更新講義後只需修改本檔案（任務、判斷準則、出處頁碼、表單連結）。
// 出處一律用講義 PDF 頁碼（p）。表單 url 建好後填入。
window.RPG = {
  title: "醫療機構經營 RPG",
  course: "健康照護管理學 115-1",
  leaderboardCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTSuCKWwziSr4bhobdetNOFKEEsi99Cs-4eCp4mHAXdfEKaggCLEQGa7JYvZ9eiz2NA2VqKPwEo5o_5/pub?gid=1130442393&single=true&output=csv", // 試算表「排行榜」分頁發布成 CSV 後填入
  gameUrl: "https://script.google.com/macros/s/AKfycbxFO4Qrq3e4UJoslolF7IMLAari9c4lV6aMuzhRAfDr_iEOZ3ec9TmY0qE0MM7lXg_T/exec", // 遊戲（Apps Script 網頁應用程式）網址；個人小關在遊戲裡以故事事件進行（2026-10-10 起）
  attendanceUrl: "https://docs.google.com/forms/d/e/1FAIpQLSe4Emj-c1fqcSNfnYv2rAwrEwuEX0MWdbDJet1FF6C-KszkbQ/viewform", // 課堂簽到表單
  appealUrl: "https://docs.google.com/forms/d/e/1FAIpQLSdPpGKTZJjDzdtxPfaSAbDlgDF2rDVzOFgMqYIvTh6hbWP8mQ/viewform", // 評分申訴表單
  zones: [
    { id: "camp", name: "開局營地", emoji: "🏕️" },
    { id: "plain", name: "規劃平原", emoji: "🌾" },
    { id: "castle", name: "組織城堡", emoji: "🏰" },
    { id: "forest", name: "領導森林", emoji: "🌲" },
    { id: "tower", name: "控制高塔", emoji: "🗼" }
  ],
  levels: [
    {
      no: 1, zone: "camp", name: "創立組織", date: "2026-10-10", type: "solo",
      story: "主管機關開放新設醫療機構。各組先到顧問醫院觀摩，認識一個正式組織需要具備的要素。",
      tasks: [
        { kind: "個人小關", text: "故事事件：審查官要你到顧問醫院「安和醫院」觀摩一天，依序遇到副院長、門診櫃檯組長、院長、統計室管理師，事件發生時回答問題，共 5 件事、11 題；含實務任務「讀懂醫院年報」：計算佔床率、平均住院日、粗死亡率，並對擴床提出建議（作答到 10/16（五）截止）", url: "https://docs.google.com/forms/d/e/1FAIpQLScst4Evzy63mpUoekJD8IO7ibnAjXJbfZFc-xyFfufrR9ku5Q/viewform" }
      ],
      criteria: [
        { name: "正式組織四要素", desc: "一群人、具備共同目標、正式結構、權責分工。", source: "W2 p5" },
        { name: "效能與效率", desc: "效能是做對的事情，關注結果是否符合目標；效率是把事情做對，關注投入與產出的關係。", source: "W2 p6" },
        { name: "醫療法五類機構", desc: "以設立單位、法定提撥、盈餘或結餘分配規定判別公立、私立、醫療財團法人、醫療社團法人、法人附設醫療機構。", source: "W4 p33" },
        { name: "組織文化四類型", desc: "宗族型、科層體制型、創業家型、市場型。", source: "W4 p7" },
        { name: "打造文化五部曲", desc: "篩選、高階行為示範、社會化、績效評估與獎酬、儀式故事與符號的增強。", source: "W4 p9" },
        { name: "醫院營運指標", desc: "佔床率、平均住院日（ALOS，Average Length of Stay）、粗死亡率；降低平均住院日勝過盲目擴床。", source: "W2 p18" }
      ],
      upgrade: ""
    },
    {
      no: 2, zone: "camp", name: "看清環境", date: "2026-10-10", type: "solo",
      story: "開業前先做市場偵察：哪些環境力量會直接影響你們？哪些是間接的大趨勢？哪些事件最值得盯緊？",
      tasks: [
        { kind: "個人小關", text: "故事事件：在安和醫院遇上員工罷工、地震停電、新聞事件，再接受資深顧問考驗，共 5 件事、8 題；含實務任務「主管審稿」：替實習生找出環境分析表中分類錯誤的項目（作答到 10/16（五）截止）", url: "https://docs.google.com/forms/d/e/1FAIpQLSfPhjuxZsXAVZX8dyB2nmRYkF6SmW7fVuf5k6ldlbONuyEj7w/viewform" },
        { kind: "個人小關", text: "事件都處理完、回到偵察隊長時，每人回報一則「與本組機構有關的環境事件」，第 5 關的優勢劣勢機會威脅分析（SWOT，Strengths、Weaknesses、Opportunities、Threats）機會與威脅會用到", url: "https://docs.google.com/forms/d/e/1FAIpQLSfPhjuxZsXAVZX8dyB2nmRYkF6SmW7fVuf5k6ldlbONuyEj7w/viewform" }
      ],
      criteria: [
        { name: "環境三層次", desc: "個體環境（直接且立即影響）、總體環境（間接的大趨勢）、超環境（不可預知的力量）。", source: "W3 p3" },
        { name: "六種競爭動力", desc: "供應商、購買者、潛在進入者、替代品、產業內部對抗、其他關係人（政府、工會、社區等）。", source: "W3 p7、p16" },
        { name: "PEST 分析", desc: "政治法律（Political）、經濟（Economic）、社會文化（Social）、科技（Technological）。", source: "W3 p20" },
        { name: "關鍵事件分析", desc: "依衝擊程度與影響時間幅度，鎖定最值得監控的關鍵環境事件。", source: "W3 p21–22" }
      ],
      upgrade: ""
    },
    {
      no: 3, zone: "camp", name: "立文化、守道德", date: "2026-10-10", type: "solo",
      story: "機構的文化看不見，卻決定問題會被藏起來還是被處理掉。這一關練習辨認文化與道德判斷。",
      tasks: [
        { kind: "個人小關", text: "故事事件：跟著安和醫院的新進人員導覽、病安分享、倫理委員會，看見文化與道德判斷，共 6 件事、11 題；含實務任務「查官方公開資料」：到衛福部醫事查詢系統查真實醫院的正式名稱與法律分類（作答到 10/16（五）截止）", url: "https://docs.google.com/forms/d/e/1FAIpQLSeDLN4r6GlEtvN-wN9smHstQohaRDJ4BQUH3Huu6wwQ3ghXVA/viewform" },
        { kind: "支線", text: "組織文化配對挑戰（已在 10/7 前於 Zuvio 完成並計分，這裡可自行複習）", url: "https://yilingtsai.tw/health-care-management/culture-game/" },
        { kind: "支線", text: "醫院法律分類配對遊戲（已在 10/7 前於 Zuvio 完成並計分，這裡可自行複習）", url: "https://yilingtsai.tw/health-care-management/hospital-category/" }
      ],
      criteria: [
        { name: "文化四層次", desc: "文化表象、行為型態、價值與信念、基本假設。", source: "W4 p6" },
        { name: "四個道德準則", desc: "功利主義（重視結果，追求最大整體利益）、道德權利（不侵犯個人基本權利）、普世觀點（己所不欲勿施於人）、正義觀點（成本與效益公平分配）。", source: "W4 p15" },
        { name: "社會責任三階梯", desc: "社會義務（只做法律要求的最低限度）、社會回應（順應當時的社會偏好）、社會責任（基於道德信念主動做正確的事）。", source: "W4 p25" }
      ],
      upgrade: ""
    },
    {
      no: 4, zone: "plain", name: "決策與目標", date: "2026-10-14", type: "boss", bossNo: 2,
      story: "開業第一年要做什麼？組內先用名目群體技術收斂出年度三大目標，再把創立時寫的目標升級成 SMART（具體 Specific、可衡量 Measurable、困難度適中 Attainable、支持共同目標 Relevant、有時限 Time-bound）。",
      tasks: [
        { kind: "個人小關", text: "故事事件：幫兒童病房算採購分數、主持創院團隊的規劃會議、替護理部檢查 SMART 目標，共 5 件事、11 題；含實務任務「決策鏈」：主持安和醫院新增服務的四步決策，每一步選完會看到結果（作答到 10/20（二）截止）", url: "https://docs.google.com/forms/d/e/1FAIpQLSdoUJs4oEC3ss6iK5PrGOqjp_rcQMbvXE6Nez3e1pwYwBWuyQ/viewform" },
        { kind: "魔王關", text: "魔王關 1 前半（占學期成績 4%）：寫下機構名稱與共同目標，用名目群體技術選出年度三大目標，改寫成 SMART，並畫出目標網。小組依課程系統的 Word 作答說明討論，由一位代表進遊戲找目標迷霧怪作答（10/27（二）截止）", url: "https://script.google.com/macros/s/AKfycbxFO4Qrq3e4UJoslolF7IMLAari9c4lV6aMuzhRAfDr_iEOZ3ec9TmY0qE0MM7lXg_T/exec" }
      ],
      criteria: [
        { name: "理性決策與加權計分", desc: "各方案依準則評分乘上權重後加總，選得分最高者。", source: "W5 p3–6" },
        { name: "名目群體技術", desc: "個人靜默思考、分類想法、小組澄清、個人評分、取平均最高的方案。", source: "W5 p16" },
        { name: "SMART 目標", desc: "Specific 具體（指向特定改善領域）、Measurable 可衡量（量化或至少提出進度指標）、Attainable 困難度適中（不會太高也不會太低）、Relevant 相關（目標要支持機構的共同目標）、Time-bound 有時限（何時達成）。", source: "W5 p31（SMART 原則）；A 本課對照課本「具挑戰性」、T 對照「時間特定性」（W5 p30）；R 對照目標網（W5 p36）" },
        { name: "目標網", desc: "下一階層目標支持上一階層；同一階層目標不可互相衝突。", source: "W5 p36" },
        { name: "計畫分類", desc: "策略性、戰術性、作業性計畫；經常性計畫分為政策、程序、規定。", source: "W5 p38、p40" }
      ],
      upgrade: "先寫下機構的共同目標，再把年度目標改寫成符合 SMART 的版本，並說明每個目標支持共同目標的哪一部分。"
    },
    {
      no: 5, zone: "plain", name: "策略作戰室", date: "2026-10-14", type: "boss", bossNo: 2,
      story: "目標定了，接下來要決定怎麼打。用 SWOT 盤點內外情勢，交叉出 TOWS 策略（把內部優劣勢與外部機會威脅兩兩配對，得出 SO、WO、ST、WT 四種策略），並選定機構的競爭方式。",
      tasks: [
        { kind: "個人小關", text: "故事事件：跟安和醫院人事室主任認識醫院的人力階梯與委員會、判讀探子帶回的對手情報、幫財務長分析服務組合、在軍師的沙盤上學 SWOT，共 6 件事、14 題；含實務任務「審一份 SWOT」與「替安和醫院寫 SWOT」（每格 3–5 項，依公開規準評分）（作答到 10/20（二）截止）", url: "https://docs.google.com/forms/d/e/1FAIpQLScTXMAe35Ah73WxxfXHjihZeoU_ecmubFJTrKWgAY_vVlHZ5A/viewform" },
        { kind: "支線", text: "陪林阿公看病：到安和醫院大廳找導覽志工，陪病人從掛號走到出院（24 站），每站決定要去哪個部門；第一次就選對的站數計入遊戲分數，可分次走完（10/14–10/20）", url: "https://script.google.com/macros/s/AKfycbxFO4Qrq3e4UJoslolF7IMLAari9c4lV6aMuzhRAfDr_iEOZ3ec9TmY0qE0MM7lXg_T/exec" },
        { kind: "魔王關", text: "魔王關 1 後半「策略一頁」（占學期成績 5%）：SWOT、TOWS 四策略、波特一般策略，每項策略對應一個 SMART 目標。由一位代表進遊戲找策略大魔王作答，組員回報的環境事件會自動帶入 O、T 欄（10/27（二）截止）", url: "https://script.google.com/macros/s/AKfycbxFO4Qrq3e4UJoslolF7IMLAari9c4lV6aMuzhRAfDr_iEOZ3ec9TmY0qE0MM7lXg_T/exec" }
      ],
      criteria: [
        { name: "醫院人力與委員會", desc: "醫師與護理人員的職涯階梯；委員會三項控制原則：訂定工作目標及完成期限、賦予積極性並特別指派任務與期限、委員遴聘注意新陳代謝。", source: "W6 p3、p6" },
        { name: "SWOT 常見錯誤", desc: "條列過多（每格約 3–5 項）、高估優勢、描述太廣泛不具體、輕描淡寫弱勢。", source: "W6 p13" },
        { name: "TOWS 四策略", desc: "SO 積極型、WO 改善型、ST 緩衝型、WT 防禦型。", source: "W6 p16" },
        { name: "策略三層次", desc: "醫院層次（總體策略、波士頓顧問公司（BCG，Boston Consulting Group）矩陣）、事業層次（波特一般策略、產品生命週期）、功能層次。", source: "W6 p18" },
        { name: "BCG 矩陣（波士頓顧問公司成長佔有率矩陣）", desc: "明星、問題兒童、現金牛、瘦狗。", source: "W6 p20" },
        { name: "波特一般策略", desc: "差異化、整體成本領導、專注。", source: "W6 p21" }
      ],
      upgrade: "SWOT 的機會與威脅取自第 2 關各人提交的環境事件；每項策略要連到第 4 關的一個 SMART 目標。"
    },
    {
      no: 6, zone: "castle", name: "組織設計藍圖", date: "2026-10-21", type: "boss", bossNo: 3,
      story: "機構要從一張圖變成一棟建築。到遊戲裡的「藍圖工地」找總建築師，跟著安和醫院成立出院準備小組，學會畫組織圖、確認每個人知道該向誰報告。",
      tasks: [
        { kind: "個人小關", text: "故事事件：跟著安和醫院院長、人事室主任、病房護理長、出院準備專案組長改組織圖，再回工地考驗結構選擇，共 7 件事、20 題；含實務任務「讀懂組織圖」：從職位清單算出管理層級、控制幅度，找出有兩位上司的職位（10/21（三）開放，作答到 11/3（二）截止）", url: "https://script.google.com/macros/s/AKfycbxFO4Qrq3e4UJoslolF7IMLAari9c4lV6aMuzhRAfDr_iEOZ3ec9TmY0qE0MM7lXg_T/exec" },
        { kind: "魔王關", text: "魔王關 2 前半（占學期成績 4%）：到藍圖工地找危樓巨像，填寫「職位｜直屬上司｜主要職責」，作答畫面即時畫出組織圖；說明部門化方式、雙重指揮的處理，以及結構偏向機械式或有機式的理由（10/21（三）開放，11/3（二）截止）", url: "https://script.google.com/macros/s/AKfycbxFO4Qrq3e4UJoslolF7IMLAari9c4lV6aMuzhRAfDr_iEOZ3ec9TmY0qE0MM7lXg_T/exec" }
      ],
      criteria: [
        { name: "組織圖四要素", desc: "任務、分工、管理層級、指揮鏈。", source: "W7 p3" },
        { name: "指揮統一與控制幅度", desc: "一人只對一位上司負責；控制幅度影響管理層級與管理者人數。", source: "W7 p5" },
        { name: "部門化與矩陣式", desc: "四種部門化方式；矩陣式混合兩種以上部門化，有雙重指揮。", source: "W7 p8–9" },
        { name: "機械式與有機式", desc: "機械式：高度專業化、高度正式化、集權；有機式：低度專業化、低度正式化、高度分權。權變因素有策略、規模、科技、環境；環境變化小適合機械式，環境變化大適合有機式。", source: "W7 p10–11" }
      ],
      upgrade: "組織圖的職位必須涵蓋第 4 關 SMART 目標與部門目標所列的負責職位；有調整的職位直接在本關組織圖中修正並說明。"
    },
    {
      no: 7, zone: "castle", name: "變革危機", date: "2026-10-28", type: "boss", bossNo: 3,
      story: "房子蓋好了，環境卻一直在變。到遊戲裡找翻修總監，跟著安和醫院導入「智慧病床＋電子交班」，看一家醫院怎麼推動變革、怎麼面對同仁的抗拒。",
      tasks: [
        { kind: "個人小關", text: "故事事件：跟著安和醫院院長、人事室主任、智慧病床專案組長、員工代表、兒童病房護理長、品管中心主任走一遍變革，共 7 件事、19 題；含實務任務「力場分析」：從 8 張便條找出驅離的力量。最後回報一則你看過或聽過的組織變革事例（不計對錯，組員在魔王關 2 後半會用到）（10/28（三）開放，作答到 11/10（二）截止）", url: "https://script.google.com/macros/s/AKfycbxFO4Qrq3e4UJoslolF7IMLAari9c4lV6aMuzhRAfDr_iEOZ3ec9TmY0qE0MM7lXg_T/exec" },
        { kind: "支線", text: "智慧病床上線記：到安和醫院找院長特助，擔任變革顧問走完 12 站，判斷每一步該做的事與同仁的抗拒理由；第一次就選對的站數計入遊戲分數，可分次完成，不需截圖、不上傳 Zuvio（10/28（三）開放，11/10（二）截止）", url: "https://script.google.com/macros/s/AKfycbxFO4Qrq3e4UJoslolF7IMLAari9c4lV6aMuzhRAfDr_iEOZ3ec9TmY0qE0MM7lXg_T/exec" },
        { kind: "魔王關", text: "魔王關 2 後半（占學期成績 4%）：找冰封巨人，替你們的機構規劃一項變革：類型與基礎、七步驟、力場分析、兩位抗拒者（要是前半組織圖上的職位）與降低抗拒的技術、黎溫三階段、評估指標（10/28（三）開放，11/17（二）截止）", url: "https://script.google.com/macros/s/AKfycbxFO4Qrq3e4UJoslolF7IMLAari9c4lV6aMuzhRAfDr_iEOZ3ec9TmY0qE0MM7lXg_T/exec" }
      ],
      criteria: [
        { name: "計畫性與因應性變革", desc: "計畫性：預先規劃，基於未來事件預測；因應性：對突發事件的零星反應。", source: "W8 p4" },
        { name: "五大基礎", desc: "技術、結構、文化、任務、人員。", source: "W8 p5" },
        { name: "黎溫模式與七步驟", desc: "解凍、實施變革、再凍；界定需求、設定目標、找出抗拒來源、選擇工具、擬定計畫、實施變革、評估與跟催。", source: "W8 p6–7" },
        { name: "四種抗拒理由", desc: "不確定性、害怕失去既有的利益、認知差距、社會關係的重新建構。", source: "W8 p8" },
        { name: "降低抗拒的技術", desc: "課本列 7 種：力場分析、溝通、參與、提昇和支持、協商、操縱及買通、強制（由溫和到剛性）。", source: "W8 p9；課本 p.205–208" }
      ],
      upgrade: "變革的抗拒者要寫成第 6 關組織圖上的職位；變革可以用來達成第 4 關的 SMART 目標，或解決第 6 關組織圖的問題。"
    },
    {
      no: 8, zone: "castle", name: "招兵買馬", date: "2026-11-11", type: "boss", bossNo: 4,
      story: "機構要開出第一個職缺，也要算清楚病房需要多少護理人力。",
      tasks: [
        { kind: "個人小關", text: "兩種甄選錯誤、績效評估方法判斷、自助餐式福利", url: "" },
        { kind: "魔王關", text: "魔王關 3 前半：一個職缺的工作說明書與工作規範、護理人力計算、選一種績效評估方法", url: "" }
      ],
      criteria: [
        { name: "工作說明書與工作規範", desc: "說明書寫工作內容；規範寫擔任者需具備的條件。", source: "W10 s10–11" },
        { name: "甄選錯誤", desc: "摒棄錯誤與選取錯誤。", source: "W10 s18" },
        { name: "績效評估方法", desc: "關鍵事件法、圖式評估量表、行為定錨量表、360 度評估。", source: "W10 s26–30" },
        { name: "護理人力計算", desc: "依床數、佔床率與每人每日護理時數推算所需人數。", source: "W10 s38–40" }
      ],
      upgrade: ""
    },
    {
      no: 9, zone: "forest", name: "實證與公關", date: "2026-11-18", type: "solo",
      story: "病人和民眾都在看：機構的醫療決策要有實證依據，對外溝通也要經營。",
      tasks: [
        { kind: "個人小關", text: "待 W11 講義完成後公布", url: "" }
      ],
      criteria: [
        { name: "待 W11 講義", desc: "實證醫學、臨床路徑、醫院公共關係管理。", source: "W11（講義待定）" }
      ],
      upgrade: ""
    },
    {
      no: 10, zone: "forest", name: "激勵團隊", date: "2026-11-25", type: "solo",
      story: "新人進來了，要怎麼讓大家願意全力以赴？",
      tasks: [
        { kind: "個人小關", text: "期望理論計算、保健與激勵因子分類、增強四法與時程、公平理論", url: "" }
      ],
      criteria: [
        { name: "雙因子理論", desc: "保健因子與激勵因子。", source: "W12 s13–14" },
        { name: "期望理論", desc: "激勵＝(努力→績效)×(績效→結果)×價值；先補最低的一項效果最大。", source: "W12 s30、s36–38" },
        { name: "增強理論", desc: "正增強、負增強、消弱、處罰，以及四種增強時程。", source: "W12 s33–34、s40–43" }
      ],
      upgrade: ""
    },
    {
      no: 11, zone: "forest", name: "誰來帶隊", date: "2026-12-02", type: "boss", bossNo: 4,
      story: "機構需要一位院長。誰最適合？要看人，也要看情境。",
      tasks: [
        { kind: "個人小關", text: "每人填寫費德勒最難共事者（LPC，Least Preferred Coworker）量表", url: "" },
        { kind: "魔王關", text: "魔王關 3 後半：依 LPC 選院長、判斷機構屬費德勒第幾情境、為第 8 關錄取的新人選擇情境領導方式", url: "" }
      ],
      criteria: [
        { name: "費德勒 LPC 量表（最難共事者量表）", desc: "16 題、每題 1–8 分；高於 64 為關係導向，低於 57 為任務導向。", source: "W13 補充資料" },
        { name: "費德勒情境三因子", desc: "領導者與部屬關係、任務結構、職位權力，組成八種情境。", source: "W13 s25–26" },
        { name: "情境領導", desc: "部屬準備度 R1–R4 對應命令、推銷、參與、授權。", source: "W13 s33–35" }
      ],
      upgrade: "情境領導的對象是第 8 關錄取的新進人員。"
    },
    {
      no: 12, zone: "tower", name: "庫存保衛戰", date: "2026-12-09", type: "solo",
      story: "藥品與耗材不能斷，也不能堆滿倉庫。守住庫存線！",
      tasks: [
        { kind: "個人小關", text: "再訂購點與經濟訂購量計算、三種補貨制度判斷、採購倍數", url: "" },
        { kind: "支線", text: "醫療庫存管理模擬器（將放進遊戲裡進行，依遊戲內得分，和個人小關合併計分）", url: "" }
      ],
      criteria: [
        { name: "採購倍數", desc: "淨利率 5% 時，採購省 1 元等於增加 20 元營收。", source: "W14 s16" },
        { name: "存量公式", desc: "最高存量、最低存量、再訂購點、經濟訂購量。", source: "W14 s36" },
        { name: "三種補貨制度", desc: "定量制（Q）、定期制（P）、(s,S) 制。", source: "W14 s43–45" }
      ],
      upgrade: ""
    },
    {
      no: 13, zone: "tower", name: "結算儀表板", date: "2026-12-16", type: "solo",
      story: "學期結算！用平衡計分卡檢視機構一整年的經營成果。",
      tasks: [
        { kind: "個人小關", text: "控制四步驟、事前事中事後控制、資訊品質四特性、控制失能原因", url: "" }
      ],
      criteria: [
        { name: "控制四步驟與容忍區間", desc: "建立績效標準、衡量實際績效、比較標準與實際的差異、評估差異並採取必要的修正行動；差異是否超出容忍範圍決定是否修正。", source: "W15 s5–7" },
        { name: "控制時點", desc: "事前、事中、事後控制。", source: "W15 s9" },
        { name: "平衡計分卡", desc: "財務、顧客、內部流程、學習與成長四構面（醫院版另列使命構面）；「平衡」包含內外部、結果與未來、短期與長期、客觀與主觀、財務與非財務。", source: "W15 Rew s5、s7" },
        { name: "指標選取原則", desc: "定義明確、具代表性與可控制性、攸關經營成敗，並依重要性給予權重。", source: "W15 Rew s4" }
      ],
      upgrade: ""
    }
  ]
};
