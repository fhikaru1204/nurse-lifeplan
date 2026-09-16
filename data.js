// 参考表・計算パラメータ（出典は nurse-threads/data/相場_*.md 参照）
// 単位：万円。数字はすべて公的統計または業界調査の相場。個別の結果は目安。
window.LP_DATA = {
  version: '2026-09-11',

  // フルタイムで働き続けたときの年収の伸び率（年・本人の今の年収に複利で掛ける）。同一病院の初任給→勤続10年 +16%（病院看護実態調査2025＝約1.5%/年）と、年齢カーブの35-39→40-44 +5.7%／40-44→50-54 +5.4%から段階設定。60歳以降は再雇用カーブ（下の incomeCurve の59歳比）に切替。出典 data/相場_看護師収入.md §1-2・§1-6
  wageGrowth: [{ until: 34, rate: 0.015 }, { until: 44, rate: 0.01 }, { until: 54, rate: 0.005 }, { until: 59, rate: 0 }],
  // 看護師の年収カーブ（令和7年 賃金構造基本統計調査・常勤・夜勤あり）。結果ページの参考表と、60歳以降の再雇用の低下率に使う
  incomeCurve: [
    { age: 22, income: 345 }, { age: 24, income: 440 }, { age: 27, income: 501 },
    { age: 32, income: 491 }, { age: 37, income: 519 }, { age: 42, income: 548 },
    { age: 47, income: 561 }, { age: 52, income: 578 }, { age: 57, income: 574 },
    { age: 62, income: 503 }, { age: 67, income: 424 }
  ],
  nightShiftAllowance: 11815, // 二交代 1回（看護協会 2024年度賃金実態調査）
  dayOnlyCut: 0.15,           // 日勤のみ化の減額率（目安）
  shortHoursCut: 0.375,       // 育児時短の減額率（−35〜40%の中央）
  pensionLevel: 0.8,          // 年金の将来の給付水準（今の制度で計算した額に掛ける）。2024年財政検証で所得代替率が現在の約61%から50%台へ低下する見通し＝おおむね2割減。面談パネルで1.0（今の制度どおり）に戻せる。出典 data/相場_住宅老後.md §6-4
  hhCouple: 1.9,              // 結婚後の世帯生活費＝一人あたり生活費×1.9（住居・教養娯楽を除いたベースで、二人以上勤労者29.2万 − 子0.2×1.2人×13.7 ＝ 25.9 ÷ 13.7。旧1.6は住居込みの比だった・2026-09-13）
  livingStatSingle: 13.7,     // 結婚後の一人あたり生活費（万円/月）＝家計調査2025 単身勤労者世帯（全国）の消費支出19.15万 − 住居3.03万 − 教養娯楽2.42万（住居は今の家賃を別途足す・旅行趣味は別枠のため除く）。出典 data/相場_住宅老後.md §11
  livingByArea: {
    single: [{ a: '全国', v: 13.7 }, { a: '大都市', v: 13.7 }, { a: '中都市', v: 13.1 }, { a: '小都市・町村', v: 14.6 }, { a: '北海道・東北地方', v: 13.7 }, { a: '関東地方', v: 13.6 }, { a: '北陸・東海地方', v: 13.5 }, { a: '近畿地方', v: 15.5 }, { a: '中国・四国地方', v: 13.1 }, { a: '九州・沖縄地方', v: 12.6 }],
    multi: [{ a: '全国', v: 29.2, p: 3.2, ad: 13.6 }, { a: '大都市', v: 29.8, p: 3.23, ad: 13.9 }, { a: '中都市', v: 28.9, p: 3.19, ad: 13.5 }, { a: '小都市Ａ', v: 28.9, p: 3.19, ad: 13.5 }, { a: '小都市Ｂ・町村', v: 29.2, p: 3.18, ad: 13.7 }, { a: '北海道地方', v: 26.6, p: 2.97, ad: 12.6 }, { a: '東北地方', v: 29.7, p: 3.22, ad: 13.9 }, { a: '関東地方', v: 31, p: 3.17, ad: 14.6 }, { a: '北陸地方', v: 30, p: 3.3, ad: 13.9 }, { a: '東海地方', v: 28.7, p: 3.23, ad: 13.3 }, { a: '近畿地方', v: 28.5, p: 3.23, ad: 13.2 }, { a: '中国地方', v: 27.7, p: 3.25, ad: 12.8 }, { a: '四国地方', v: 28.4, p: 3.16, ad: 13.3 }, { a: '九州地方', v: 26.7, p: 3.22, ad: 12.3 }, { a: '沖縄地方', v: 21.9, p: 3.32, ad: 9.6 }, { a: '東京都区部', v: 31.6, p: 3.16, ad: 15 }, { a: 'さいたま市', v: 32.3, p: 3.3, ad: 15.1 }, { a: '千葉市', v: 32.2, p: 3.09, ad: 15.4 }, { a: '横浜市', v: 29.3, p: 3.26, ad: 13.6 }, { a: '川崎市', v: 31.8, p: 3.48, ad: 14.6 }, { a: '相模原市', v: 28.4, p: 3.22, ad: 13.2 }, { a: '札幌市', v: 26.4, p: 3.14, ad: 12.3 }, { a: '仙台市', v: 27.7, p: 3.13, ad: 12.9 }, { a: '名古屋市', v: 34.3, p: 3.24, ad: 16.3 }, { a: '京都市', v: 26.8, p: 3.09, ad: 12.5 }, { a: '大阪市', v: 28.1, p: 3.28, ad: 12.9 }, { a: '神戸市', v: 23.7, p: 3.06, ad: 10.9 }, { a: '広島市', v: 32.3, p: 3.23, ad: 15.2 }, { a: '福岡市', v: 28.4, p: 3.34, ad: 13 }, { a: '那覇市', v: 21.5, p: 3.25, ad: 9.5 }]
  },  // エリア別の参考（同上・住居と教養娯楽を除く月額万円。single=単身勤労者・multi=二人以上勤労者[v=世帯の額・p=世帯人員・ad=大人一人あたり（モデル換算）＝(v − 0.2×(p−2)×13.7)÷1.9]。標本が少ない地方があるので参考程度）
  partTimeIncome: { w3: 167, w4: 297 }, // パート 週3×6h／週4×8h
  managerIncome: { 師長: 676, 副部長: 759, 部長: 818, 非管理職: 530 },
  nightShiftStopStat: '50代で約4割、60代で約7割が夜勤なし（看護協会 2021）',
  retirementPay: { 民間: '1,000〜1,500', 公務員: '約2,199（定年・全職種平均）', 小規模: '150〜500 または制度なし' },

  // 結婚（ゼクシィ結婚マーケット調査2025・結婚トレンド調査2024）
  wedding: [
    { key: 'photo',  label: '写真だけ・挙式のみ', guests: '0〜10人',  total: '26〜70',  self: '26〜70',  all: '約130〜190' },
    { key: 'family', label: '親族だけの食事会婚', guests: '10〜20人', total: '192',     self: '約80',    all: '約190〜210' },
    { key: 'small',  label: '友人も呼ぶ小規模',   guests: '30〜40人', total: '285',     self: '約150',   all: '約270' },
    { key: 'std',    label: '標準（全国平均）',   guests: '57人',     total: '299',     self: '159',     all: '約290' },
    { key: 'large',  label: '大規模',             guests: '70〜80人', total: '435',     self: '184',     all: '約310' }
  ],
  weddingSelfMid: { photo: 50, family: 80, small: 150, std: 159, large: 184, none: 0, undecided: 120 },
  weddingExtras: '指輪（婚約43.8＋結婚36.4）＋新婚旅行56.3＋家具家電62.6 ≒ 約199万を自己負担に足したのが「結婚まるごと」',

  // 出産（厚労省 出産費用の見える化 令和6年度・こども家庭庁）
  birth: [
    { label: '地方・正常分娩', cost: '40〜48', out: '0（おつりあり）', withPrep: '約27' },
    { label: '全国平均・正常分娩', cost: '52', out: '約2', withPrep: '約29' },
    { label: '東京・正常分娩', cost: '65', out: '約15', withPrep: '約42' },
    { label: '無痛分娩', cost: '62〜72', out: '12〜22', withPrep: '約39〜49' }
  ],
  birthPerChild: 35, // 出産＋準備の目安（全国平均と東京の間）
  maternityLeave: '年収500万の看護師なら、産休＋育休1年で約288万円を受け取れる（非課税・手取りの約85%→64%）',

  // 教育費（文科省 令和5年度 子供の学習費調査〔2026年1月訂正版〕・私大納付金調査2023・国立標準額・日本政策金融公庫2021）
  education: [
    { key: 'pub_nat',  label: '全部公立 → 国立大', rowLabel: '<b>全部公立</b><br>→ 国立大',           k12: 614,  uni: 243, total: 857 },
    { key: 'pub_priA', label: '全部公立 → 私立文系', rowLabel: '<b>全部公立</b><br>→ 私立文系',       k12: 614,  uni: 443, total: 1057 },
    { key: 'pub_priS', label: '全部公立 → 私立理系・看護系', rowLabel: '<b>全部公立</b><br>→ 私立理系・看護系', k12: 614, uni: 587, total: 1201 },
    { key: 'jhs_priS', label: '中学から私立 → 私立理系', rowLabel: '<b>中学から私立</b><br>→ 私立理系', k12: 1092, uni: 573, total: 1665 },
    { key: 'all_pri',  label: '幼稚園から私立 → 私立理系', rowLabel: '<b>幼稚園から私立</b><br>→ 私立理系', k12: 1969, uni: 573, total: 2542 }
  ],
  educationNote: '幼稚園から高校までと、大学の組み合わせで合計が決まる。金額は自宅から通う場合',
  educationAloneAdd: 422,   // 一人暮らし4年（仕送り月8万＋開始費用）
  childAllowance: 235,      // 児童手当 子1人（第3子以降は最大約650）
  nursingRoutes: '看護師ルート：国立242万／専門3年301万／私立601万',
  lessons: [
    { key: 'juku',   label: '学習塾（小4〜高3・年12〜30万）', add: 180 },
    { key: 'sports', label: 'スポーツ・スイミング（年10万）', add: 80 },
    { key: 'music',  label: 'ピアノ・音楽（年12万）', add: 100 },
    { key: 'english',label: '英語・英会話（年10万）', add: 90 },
    { key: 'exam',   label: '中学・高校受験の対策（受験学年に50万）', add: 150 },
    { key: 'abroad', label: '留学・海外経験（300万）', add: 300 },
    { key: 'none',   label: '特に決めていない（平均的な塾・習い事の費用で計算）', add: 0 }
  ],
  educationMid: { pub_nat: 857, pub_priA: 1057, pub_priS: 1201, jhs_priS: 1665, all_pri: 2542, undecided: 1057 },
  // 教育費の段階別 年額（万円・文科省 令和5年度 子供の学習費調査〔2026年1月訂正版〕・私大納付金調査2023・国立標準額・日本政策金融公庫）
  // school = 学校教育費＋給食費（塾・習い事を除く） / extra = 学校外活動費の全員平均（塾＋習い事）
  eduStages: {
    nursery:  { ages: [0, 2],   pub: { school: 36,   extra: 0    }, pri: { school: 36,   extra: 0    } },   // 認可保育園 共働き世帯の目安 月3万
    kinder:   { ages: [3, 5],   pub: { school: 8.4,  extra: 10.0 }, pri: { school: 19.0, extra: 15.8 } },
    elem:     { ages: [6, 11],  pub: { school: 11.0, extra: 25.6 }, pri: { school: 103.2, extra: 71.0 } },
    junior:   { ages: [12, 14], pub: { school: 18.7, extra: 35.6 }, pri: { school: 113.7, extra: 42.3 } },
    high:     { ages: [15, 17], pub: { school: 35.2, extra: 24.5 }, pri: { school: 83.3, extra: 34.7 } },
    univ:     { ages: [18, 21], nat: 60.6, priA: 110.8, priS: 143.3, nurse: 146.8, aloneAdd: 105.5 }
  },
  // 進路 → 各段階の公私と大学の種類
  eduPaths: {
    pub_nat:  { kinder: 'pub', elem: 'pub', junior: 'pub', high: 'pub', univ: 'nat' },
    pub_priA: { kinder: 'pub', elem: 'pub', junior: 'pub', high: 'pub', univ: 'priA' },
    pub_priS: { kinder: 'pub', elem: 'pub', junior: 'pub', high: 'pub', univ: 'nurse' },
    jhs_priS: { kinder: 'pub', elem: 'pub', junior: 'pri', high: 'pri', univ: 'priS' },
    all_pri:  { kinder: 'pri', elem: 'pri', junior: 'pri', high: 'pri', univ: 'priS' },
    undecided:{ kinder: 'pub', elem: 'pub', junior: 'pub', high: 'pub', univ: 'priA' }
  },
  // 育て方チェック → 平均の上に乗せる分（年額・対象年齢）または一時（年齢）
  // 育て方チェック → チェックした分だけを計算に入れる（塾・習い事の平均は入れない）。何も決めていなければ平均の塾・習い事費で計算
  lessonSchedule: {
    juku:    { stages: { elem: 12, junior: 30, high: 25 }, ages: [9, 17] },   // 小4〜小6 12万／中 30万／高 25万（通っている家庭の相場）
    sports:  { yearly: 10, ages: [6, 14] },                                    // 小1〜中3
    music:   { yearly: 12, ages: [3, 14] },                                    // 幼〜中3
    english: { yearly: 10, ages: [3, 14] },                                    // 幼〜中3
    exam:    { once: 50, at: 14, atIfPriJunior: 11 },                          // 受験学年に一時50万（中学から私立なら小6）
    abroad:  { once: 300, at: 16 },                                            // 高2で一時300万
    none:    { average: true }                                                 // 平均の塾・習い事費（学校外活動費）を入れる
  },
  childAllowanceYearly: { under3: 18, upto17: 12 },  // 児童手当 0〜2歳 月1.5万／3〜17歳 月1万


  // 住宅（フラット35利用者調査2024年度・不動産経済研究所2025・国交省ほか。維持費は目安）
  housing: [
    { label: '中古戸建',       price: 2573, down: 233 },
    { label: '中古マンション', price: 3033, down: 300 },
    { label: '建売戸建',       price: 3826, down: 323 },
    { label: '新築マンション', price: 5592, down: 1338 },
    { label: '（首都圏の新築マンション市場平均）', price: 9182, down: null }
  ],
  housingFees: '購入時の諸費用は物件価格の6〜9%（仲介・登記・ローン手数料・税）',
  housingMaint: [
    { type: 'マンション', yearly: '約40〜50万/年', detail: '管理費 約13.8万＋修繕積立 約15.7万＋固定資産税 約12万＋保険 約3万。修繕積立金は25年で約1.8倍に上がるのが平均的' },
    { type: '戸建',       yearly: '約15〜25万/年＋修繕の積立', detail: '固定資産税・保険に加えて、外壁・屋根の塗り替えが10〜15年ごとに100〜200万（目安）。自分で月1〜2万を積み立てる前提' }
  ],
  loanTable: [
    { borrow: 3000, m05: 7.8, m10: 8.5, m15: 9.2 },
    { borrow: 4000, m05: 10.4, m10: 11.3, m15: 12.2 },
    { borrow: 5000, m05: 13.0, m10: 14.1, m15: 15.3 }
  ],
  rentLifetime: [
    { rent: 8,  total: 5760 }, { rent: 10, total: 7200 }, { rent: 12, total: 8640 }
  ],
  rentNote: '30歳から90歳まで60年間の家賃合計（計算値）。持ち家は資産として残り、賃貸は住み替えが自由で修繕がいらない',
  housingUpfrontRate: 0.18, // （旧）頭金10%＋諸費用8%。2026-09-12 以降は頭金は設問の額、諸費用8%のみ一律
  housingFeeRate: 0.08,     // 諸費用（仲介・登記・ローン手数料・税）＝予算の8%
  downPayMid: { d0: 0, d100: 100, d300: 300, d500: 500, d1000: 1000 },
  housingBudgetMid: { b2500: 2500, b3500: 3500, b4500: 4500, b6000: 6000, b8000: 8000, undecided: 3800 },

  // 車
  carBudgetMid: { c150: 120, c300: 220, c500: 400, c500p: 600, none: 0 },
  carCycle: { y5: 5, y7: 7, y10: 10, none: 0 },

  // 旅行（1回あたり予算の中央値）
  tripDomesticMid: { t5: 4, t10: 7.5, t20: 15, t20p: 25, none: 0 },
  tripAbroadMid: { a10: 8, a20: 15, a30: 25, a30p: 40, none: 0 },
  tripCount: { n0: 0, n1: 1, n2: 2.5, n4: 5 },

  // 老後（生命保険文化センター2025年度・総務省家計調査2025・年金額 令和8年度）
  retireLiving: [
    { label: '単身・実態の平均', monthly: 14.8 },
    { label: '夫婦・実態の平均', monthly: 26.4 },
    { label: '夫婦・最低限', monthly: 23.9 },
    { label: '夫婦・ゆとりある老後', monthly: 39.1 }
  ],
  pensionByIncome: [
    { income: 400, monthly: 14.4 }, { income: 500, monthly: 16.2 },
    { income: 600, monthly: 18.0 }, { income: 700, monthly: 19.8 }
  ],
  pensionNote: '厚生年金に38〜40年加入した場合の目安（基礎年金込み・月額）。国民年金だけなら約7.1万',
  careCost: 542, // 介護 1人あたり（一時費用47.2＋月9.0×55か月）
  retireShortfallExample: '年金だけの夫婦は平均で月4.2万円の赤字。25年で約1,260万円（家計調査2025）',
  retireLivingMid: { r15: 15, r20: 20, r25: 25, r30: 30, r40: 40 },

  // 選択肢の中央値（年収・貯金・家賃補助など）
  incomeMid: { i300: 280, i350: 325, i400: 375, i450: 425, i500: 475, i550: 525, i600: 575, i700: 650, i800: 750, i1000: 900, i1000p: 1100 },
  savingMonthlyMid: { s0: 0, s1: 0.5, s3: 2, s5: 4, s8: 6.5, s10: 9, s15: 12.5, s15p: 18 },
  subsidyMid: { none: 0, h1: 0.5, h2: 1.5, h3: 2.5, h3p: 4 },
  hobbyMonthlyMid: { '1万円未満': 0.5, '1〜3万円': 2, '3〜5万円': 4, '5〜10万円': 7.5, '10万円以上': 12 }
};
