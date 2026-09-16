/* 看護師のためのライフプラン試算 — 画面エンジン
   ページ定義 → 描画 → 保存（localStorage） → 簡易試算 → 送信（GAS） */
(function () {
  'use strict';
  const D = window.LP_DATA;
  const CFG = window.LP_CONFIG || {};
  const STORE_KEY = 'lp_answers_v1';
  // ?reset=1 で、この端末に保存された回答と面談ページの残した条件を全部消して最初から
  if (/reset/.test(location.search)) { try { Object.keys(localStorage).filter(k => k === STORE_KEY || k.indexOf('lp_patterns_') === 0).forEach(k => localStorage.removeItem(k)); } catch (e) {} location.replace(location.pathname); }
  const A = loadAnswers();

  // ---------- ユーティリティ ----------
  function loadAnswers() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (e) { return {}; } }
  function saveAnswers() { try { localStorage.setItem(STORE_KEY, JSON.stringify(A)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function fmt(n) { if (n == null || isNaN(n)) return '—'; n = Math.round(n); const neg = n < 0; n = Math.abs(n); const s = n >= 10000 ? Math.floor(n / 10000) + '億' + (n % 10000 ? (n % 10000).toLocaleString() + '万' : '') : n.toLocaleString() + '万'; return (neg ? '−' : '') + s; }
  const ageFrom = dob => window.LP_CALC.ageFrom(dob);
  function table(head, rows) {
    return '<div class="tbl-wrap"><table><thead><tr>' + head.map(h => '<th>' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' +
      rows.map(r => '<tr>' + r.map((c, i) => '<td' + (i === 0 ? ' class="lbl"' : '') + '>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
  }
  function ref(title, body, src) {
    return '<section class="ref"><div class="ref-title">' + esc(title) + '</div>' + body + (src ? '<div class="src">出典：' + esc(src) + '</div>' : '') + '</section>';
  }

  // ---------- 参考表 ----------
  const REF = {
    income() {
      return ref('看護師の年収はこのくらい（全国平均・夜勤あり常勤）',
        table(['年齢', '年収の目安'], D.incomeCurve.filter(r => r.age >= 24 && r.age <= 57).map(r => [r.age + '歳前後', fmt(r.income) + '円'])) +
        '<p class="note">平均は約525万円。二交代の夜勤手当は1回約' + D.nightShiftAllowance.toLocaleString() + '円。師長 ' + D.managerIncome.師長 + '万・部長 ' + D.managerIncome.部長 + '万が相場。</p>',
        '厚労省 賃金構造基本統計調査（令和7年）・日本看護協会 賃金実態調査（2024年度）');
    },
    wedding() {
      return ref('結婚にかかるお金は、規模でこれだけ変わる',
        table(['プラン', '招待客', '挙式・披露宴', 'ご祝儀を引いた自己負担', '指輪・新婚旅行・新生活まで含めた持ち出し'],
          D.wedding.map(w => [esc(w.label), w.guests, w.total + '万', w.self + '万', w.all + '万'])) +
        '<p class="note">' + esc(D.weddingExtras) + '。親からの援助（平均169万）があれば大きく減る。</p>',
        'ゼクシィ 結婚マーケット調査2025・結婚トレンド調査2024');
    },
    children() {
      return ref('子ども1人にかかる教育費（幼稚園から大学まで）',
        '<p class="note" style="margin:0 0 8px">' + esc(D.educationNote) + '。</p>' +
        table(['幼稚園〜高校 → 大学', '幼〜高', '大学', '合計'], D.education.map(e => [e.rowLabel, fmt(e.k12), fmt(e.uni), '<b>' + fmt(e.total) + '</b>'])) +
        '<p class="note">大学で一人暮らしなら ＋約' + D.educationAloneAdd + '万（仕送り月8万×4年＋開始費用）。児童手当は子1人あたり約' + D.childAllowance + '万もらえる。試算では0〜2歳の保育料（月3万の目安）も加えている。' + esc(D.nursingRoutes) + '。</p>' +
        table(['出産', '出産費用', '一時金50万を引いた持ち出し', '準備費用込み'], D.birth.map(b => [esc(b.label), b.cost + '万', b.out + '万', b.withPrep + '万'])) +
        '<p class="note">' + esc(D.maternityLeave) + '</p>',
        '文科省 子供の学習費調査（令和5年度・2026年1月訂正版）・私立大学納付金調査・日本政策金融公庫・厚労省 出産費用の見える化・こども家庭庁');
    },
    housing() {
      return ref('マイホームは「買う時」と「買った後」の両方にお金がかかる',
        table(['種類', '実際に買った人の平均価格', '頭金の平均'], D.housing.map(h => [esc(h.label), fmt(h.price) + '円', h.down == null ? '—' : fmt(h.down) + '円'])) +
        '<p class="note">' + esc(D.housingFees) + '。</p>' +
        '<div class="ref-sub">借りる額と金利で、毎月の返済額はこう変わる（35年ローンの場合）</div>' +
        table(['借りる額', '金利 0.5%なら', '金利 1.0%なら', '金利 1.5%なら'], D.loanTable.map(l => ['<b>' + fmt(l.borrow) + '円</b>', '月 ' + l.m05 + '万', '月 ' + l.m10 + '万', '月 ' + l.m15 + '万'])) +
        '<div class="ref-sub">買った後の維持費と将来の修繕</div>' +
        D.housingMaint.map(m => '<div class="maint"><div class="m-head"><b>' + esc(m.type) + '</b><span>' + esc(m.yearly) + '</span></div><p>' + esc(m.detail) + '</p></div>').join('') +
        '<div class="ref-sub">ずっと賃貸だと</div>' +
        table(['家賃', '30歳〜90歳の合計'], D.rentLifetime.map(r => [r.rent + '万/月', fmt(r.total) + '円'])) +
        '<p class="note">' + esc(D.rentNote) + '。</p>',
        '住宅金融支援機構 フラット35利用者調査（2024年度）・不動産経済研究所（2025）・国交省・マンション総合調査（維持費は目安）');
    },
    work() {
      return ref('働き方が変わると、年収はこう変わる',
        table(['働き方', '年収の目安（平均525万の人の場合）'], [
          ['夜勤あり・常勤', '525万'],
          ['日勤のみ・常勤', '約445万（−15%）'],
          ['育児時短（6時間）', '約330万（−35〜40%・夜勤手当ゼロ）'],
          ['パート 週4×8時間', '約297万'],
          ['パート 週3×6時間', '約167万'],
          ['60歳から再雇用', '約−15%（役職者は−25〜30%）']
        ]) +
        '<p class="note">' + esc(D.nightShiftStopStat) + '。退職金の相場は民間病院 ' + D.retirementPay.民間 + '万、公立病院（公務員）' + D.retirementPay.公務員 + '万、クリニック・小規模は ' + D.retirementPay.小規模 + '。転職すると勤続年数はゼロからやり直し。</p>',
        '厚労省 賃金構造基本統計調査（令和7年）・日本看護協会（2021・2024）・就労条件総合調査（令和5年）');
    },
    retire() {
      return ref('老後は「年金」と「生活費」の差を自分で埋める',
        table(['現役時代の年収', '年金の目安（月）'], D.pensionByIncome.map(p => [p.income + '万', p.monthly + '万'])) +
        '<p class="note">' + esc(D.pensionNote) + '。</p>' +
        table(['暮らし方', '必要な生活費（月）'], D.retireLiving.map(r => [esc(r.label), r.monthly + '万'])) +
        '<p class="note">' + esc(D.retireShortfallExample) + '。これに介護が1人あたり約' + D.careCost + '万、医療の自己負担が上限で月8万円強かかる。</p>',
        '生命保険文化センター（2025年度）・総務省 家計調査（2025）・厚労省・日本年金機構（令和8年度）');
    }
  };

  // ---------- 選択肢 ----------
  const OPT = {
    yesNo: [{ v: 'yes', l: 'はい' }, { v: 'no', l: 'いいえ' }],
    employ: ['常勤（正職員）', '常勤（契約・嘱託）', '非常勤・パート', '派遣', 'その他'].map(s => ({ v: s, l: s })),
    years: ['1年未満', '1〜2年', '3〜5年', '6〜9年', '10〜14年', '15〜19年', '20年以上'].map(s => ({ v: s, l: s })),
    income: [['i300', '300万未満'], ['i350', '300〜349万'], ['i400', '350〜399万'], ['i450', '400〜449万'], ['i500', '450〜499万'], ['i550', '500〜549万'], ['i600', '550〜599万'], ['i700', '600〜699万'], ['i800', '700〜799万'], ['i1000', '800〜999万'], ['i1000p', '1,000万以上']].map(p => ({ v: p[0], l: p[1] })),
    role: ['一般職', 'プリセプター・リーダー', '主任', '師長', '副部長・部長', 'その他'].map(s => ({ v: s, l: s })),
    shift: ['二交代', '三交代', '日勤のみ', '夜勤専従', 'その他'].map(s => ({ v: s, l: s })),
    nights: ['0回', '1〜2回', '3〜4回', '5〜6回', '7〜8回', '9回以上'].map(s => ({ v: s, l: s })),
    housing: ['賃貸', '持ち家（ローンあり）', '持ち家（完済）', '実家', '社宅・寮', 'その他'].map(s => ({ v: s, l: s })),
    subsidy: [['none', 'なし'], ['h1', '1万円未満'], ['h2', '1〜2万円'], ['h3', '2〜3万円'], ['h3p', '3万円以上']].map(p => ({ v: p[0], l: p[1] })),
    household: ['独身・一人暮らし', '独身・実家', '独身・同棲', '既婚・子なし', '既婚・子あり', 'シングル（子あり）', 'その他'].map(s => ({ v: s, l: s })),
    marital: ['独身', '既婚', '離婚・死別'].map(s => ({ v: s, l: s })),
    shareMode: [{ v: 'all', l: 'ほぼ自分が全部' }, { v: 'more', l: '自分が多め' }, { v: 'half', l: '半々' }, { v: 'less', l: '相手が多め' }],
    wish3: [{ v: 'yes', l: 'したい' }, { v: 'no', l: 'しない・考えていない' }, { v: 'undecided', l: '未定' }],
    timing: ['1〜2年以内', '3〜5年以内', '5年より先', '未定'].map(s => ({ v: s, l: s })),
    weddingPlan: D.wedding.map(w => ({ v: w.key, l: w.label + '（' + w.guests + '）' })).concat([{ v: 'undecided', l: 'まだ決めていない' }]),
    partnerIncome: ['300万未満', '300〜499万', '500〜699万', '700〜999万', '1,000万以上', 'わからない'].map(s => ({ v: s, l: s })),
    childWish: [{ v: 'yes', l: '欲しい' }, { v: 'no', l: '欲しくない・考えていない' }, { v: 'enough', l: 'もう十分' }, { v: 'undecided', l: '未定' }],
    childNum: ['1人', '2人', '3人以上'].map(s => ({ v: s, l: s })),
    childNow: ['いない', '1人', '2人', '3人以上'].map(s => ({ v: s, l: s })),
    childAges: ['0〜2歳', '3〜5歳', '小学生', '中学生', '高校生', '大学生以上'].map(s => ({ v: s, l: s })),
    eduPath: D.education.map(e => ({ v: e.key, l: e.label })).concat([{ v: 'undecided', l: '本人次第・まだ決めていない' }]),
    uniLiving: [{ v: 'home', l: '自宅から通わせたい' }, { v: 'alone', l: '一人暮らしもさせてあげたい' }, { v: 'undecided', l: '未定' }],
    lessons: D.lessons.map(l => ({ v: l.key, l: l.label })),
    homeWish: [{ v: 'yes', l: '買いたい' }, { v: 'no', l: '買わない・賃貸でいい' }, { v: 'have', l: 'すでに持っている' }, { v: 'undecided', l: '未定' }],
    homeType: ['新築マンション', '中古マンション', '新築戸建', '中古戸建', '未定'].map(s => ({ v: s, l: s })),
    homeDown: [['d0', '0（全額ローン）'], ['d100', '100万くらい'], ['d300', '300万くらい'], ['d500', '500万くらい'], ['d1000', '1,000万以上']].map(p => ({ v: p[0], l: p[1] })),
    homeBudget: [['b2500', '2,500万以下'], ['b3500', '2,500〜3,500万'], ['b4500', '3,500〜4,500万'], ['b6000', '4,500〜6,000万'], ['b8000', '6,000万以上'], ['undecided', '未定']].map(p => ({ v: p[0], l: p[1] })),
    tripCount: [['n0', '行かない'], ['n1', '年1回'], ['n2', '年2〜3回'], ['n4', '年4回以上']].map(p => ({ v: p[0], l: p[1] })),
    tripDomestic: [['t5', '5万円まで'], ['t10', '5〜10万円'], ['t20', '10〜20万円'], ['t20p', '20万円以上']].map(p => ({ v: p[0], l: p[1] })),
    tripAbroad: [['a10', '10万円まで'], ['a20', '10〜20万円'], ['a30', '20〜30万円'], ['a30p', '30万円以上']].map(p => ({ v: p[0], l: p[1] })),
    carHave: [{ v: 'yes', l: '持っている' }, { v: 'plan', l: '持っていないが欲しい' }, { v: 'no', l: '持っていない・必要ない' }],
    carCycle: [['y5', '5年くらい'], ['y7', '7年くらい'], ['y10', '10年以上乗る'], ['none', '買い替えは考えていない']].map(p => ({ v: p[0], l: p[1] })),
    carLoanLeft: ['1年以内', '2〜3年', '4〜5年', '6年以上'].map(x => ({ v: x, l: x })),
    carPay: ['現金で一括', 'ローン（5年）', 'ローン（7年）'].map(x => ({ v: x, l: x })),
    carBudget: [['c150', '150万円まで'], ['c300', '150〜300万円'], ['c500', '300〜500万円'], ['c500p', '500万円以上']].map(p => ({ v: p[0], l: p[1] })),
    hobbyMonthly: ['1万円未満', '1〜3万円', '3〜5万円', '5〜10万円', '10万円以上'].map(s => ({ v: s, l: s })),
    nightUntil: ['もう夜勤はしていない', '35歳まで', '40歳まで', '45歳まで', '50歳まで', '55歳まで', 'できる限り続ける', 'わからない'].map(s => ({ v: s, l: s })),
    workUntil: ['55歳まで', '60歳まで', '65歳まで', '70歳まで', '働ける限り', 'わからない'].map(s => ({ v: s, l: s })),
    jobChange: ['予定あり（1年以内）', '考え中', '予定なし', 'わからない'].map(s => ({ v: s, l: s })),
    leavePlan: ['予定あり（1〜2年以内）', '将来的に', '予定なし', '経験済み'].map(s => ({ v: s, l: s })),
    workStyle: ['このまま病院で続ける', '日勤のみに切り替えたい', '時短にしたい', '訪問看護', 'クリニック・施設', '管理職を目指す', '独立・開業', '看護師以外の仕事', '未定'].map(s => ({ v: s, l: s })),
    care: ['すでにある', '近いうちにありそう', '今のところない', 'わからない'].map(s => ({ v: s, l: s })),
    debtType: ['奨学金（一般）', '病院の奨学金・お礼奉公', '車のローン', 'カードローン・キャッシング', '住宅ローン', 'リボ払い', 'その他'].map(s => ({ v: s, l: s })),
    assets: ['預貯金だけ', '財形貯蓄', 'NISA（つみたて）', 'NISA（成長投資）', 'iDeCo', '株式', '投資信託', '不動産', '貯蓄型の保険', '外貨・外貨建て保険', '暗号資産', '特に何もしていない', 'その他'].map(s => ({ v: s, l: s })),
    savingMonthly: [['s0', 'ほぼできていない'], ['s1', '1万円未満'], ['s3', '1〜3万円'], ['s5', '3〜5万円'], ['s8', '5〜8万円'], ['s10', '8〜10万円'], ['s15', '10〜15万円'], ['s15p', '15万円以上']].map(p => ({ v: p[0], l: p[1] })),
    insurance: ['医療保険', '生命保険（死亡保障）', 'がん保険', '貯蓄型・養老保険', '個人年金保険', '学資保険', '看護協会・共済', '入っていない', 'わからない'].map(s => ({ v: s, l: s })),
    insuranceMonthly: ['5千円未満', '5千〜1万円', '1〜2万円', '2〜3万円', '3万円以上', 'わからない'].map(s => ({ v: s, l: s })),
    worries: ['貯金ができない', '老後が不安', '子どもの教育費', '夜勤を外れた後の収入', '保険が合っているか分からない', '借入・奨学金', '転職・働き方', '結婚・出産のお金', '親の介護', '特にない'].map(s => ({ v: s, l: s })),
    retireStyle: ['旅行を楽しみたい', '趣味に時間を使いたい', '孫や家族と過ごしたい', '田舎でのんびり', '都会で便利に', '無理のない範囲で働き続けたい', '海外で暮らしてみたい', '健康第一で穏やかに', 'まだイメージがない'].map(s => ({ v: s, l: s })),
    retireLiving: [['r15', '15万円くらい'], ['r20', '20万円くらい'], ['r25', '25万円くらい'], ['r30', '30万円くらい'], ['r40', '40万円以上']].map(p => ({ v: p[0], l: p[1] })),
    contact: ['Zoom（オンライン）', '対面（一都三県）', '今は希望しない'].map(s => ({ v: s, l: s })),
    slot: ['平日の昼', '平日の夜', '夜勤明けの午前', '土日'].map(s => ({ v: s, l: s })),
    askTopics: ['節税（ふるさと納税・iDeCo・医療費控除など）', '老後の不安（年金・老後資金）', '月の収入を少し増やしたい（副収入・働き方）', '貯金が増えない・家計の見直し', 'NISA・iDeCoなど資産運用の始め方', '保険の見直し', '住まい（賃貸のままか・買うか・住宅ローン）', '結婚・出産・教育費の準備', '奨学金・借入の返し方', 'その他'].map(s => ({ v: s, l: s }))
  };

  // ---------- ページ定義 ----------
  const PAGES = [
    {
      id: 'intro', title: 'はじめに', short: '開始',
      html: '<div class="hero"><p class="lead">看護師さん限定の、ライフプラン試算です。</p>' +
        '<p>結婚・子ども・マイホーム・老後。これから先にいくらかかるのかを、看護師の働き方の実態に合わせて見ていきます。ほとんどが選ぶだけで、8分ほどで終わります。</p>' +
        '<ul class="bul"><li>答えた内容はページの下の「次へ」で保存されるので、途中で閉じても続きからできます</li><li>結果は目安です。詳しい内訳と「今なにができるか」は面談でお伝えします</li><li>入力いただいた情報は、ご相談への対応以外には使いません</li></ul></div>',
      questions: [
        { id: 'agree', type: 'check', label: 'はじめる前に、1つだけ確認させてください', required: true, agree: true, options: [{ v: 'yes', l: '<a href="privacy.html" target="_blank" rel="noopener">個人情報の取り扱い</a>を読んで、同意します' }], raw: true, note: '下の四角をタップしてチェックを入れてください' }
      ]
    },
    {
      id: 'you', title: 'あなたのことを教えてください', short: '基本',
      ref: REF.income,
      questions: [
        { id: 'name', type: 'text', label: 'お名前', required: true, ph: '例：山田 花子' },
        { id: 'dob', type: 'date', label: '生年月日', required: true },
        { id: 'address', type: 'text', label: 'ご住所', required: true, ph: '例：東京都台東区東上野1-1-1' },
        { id: 'employer', type: 'text', label: '勤務先名', required: true, ph: '例：○○総合病院' },
        { id: 'employerAddr', type: 'text', label: '勤務先の住所', ph: '市区町村までで大丈夫です' },
        { id: 'employ', type: 'radio', label: '雇用形態', required: true, options: OPT.employ },
        { id: 'years', type: 'radio', label: '今の勤務先での勤続年数', required: true, options: OPT.years },
        { id: 'totalYears', type: 'radio', label: '看護師としての経験年数', required: true, options: OPT.years },
        { id: 'income', type: 'radio', label: '年収（額面・だいたいで）', required: true, options: OPT.income },
        { id: 'role', type: 'radio', label: '役職', required: true, options: OPT.role },
        { id: 'shift', type: 'radio', label: '勤務形態', required: true, options: OPT.shift },
        { id: 'nights', type: 'radio', label: '夜勤の回数（月）', options: OPT.nights, showIf: a => a.shift && a.shift !== '日勤のみ' },
        { id: 'housing', type: 'radio', label: '今の住まい', required: true, options: OPT.housing },
        { id: 'housingCost', type: 'number', label: '家賃 または 住宅ローンの返済額（月）', required: true, unit: '万円', showIf: a => a.housing === '賃貸' || a.housing === '持ち家（ローンあり）' || a.housing === '社宅・寮' },
        { id: 'subsidy', type: 'radio', label: '家賃補助・住宅手当', required: true, options: OPT.subsidy },
        { id: 'household', type: 'radio', label: '世帯の状況', required: true, options: OPT.household }
      ]
    },
    {
      id: 'marriage', title: '結婚について教えてください', short: '結婚',
      ref: REF.wedding,
      questions: [
        { id: 'marital', type: 'radio', label: '現在', required: true, options: OPT.marital },
        { id: 'marryWish', type: 'radio', label: '結婚の希望', required: true, options: OPT.wish3, showIf: a => a.marital !== '既婚' },
        { id: 'marryWhen', type: 'radio', label: '時期のイメージ', options: OPT.timing, showIf: a => a.marital !== '既婚' && a.marryWish === 'yes' },
        { id: 'weddingPlan', type: 'radio', label: '式のイメージ', options: OPT.weddingPlan, showIf: a => a.marital !== '既婚' && a.marryWish === 'yes' },
        { id: 'partnerIncome', type: 'radio', label: 'パートナーの年収（だいたいで）', options: OPT.partnerIncome, showIf: a => a.marital === '既婚' || a.household === '独身・同棲' },
        { id: 'shareMode', type: 'radio', label: '家計の分担はどのくらいのイメージですか（結婚後の生活費・教育費・住まい・旅行など）', required: true, options: OPT.shareMode, showIf: a => isCouple(a) }
      ]
    },
    {
      id: 'children', title: '子どもについて教えてください', short: '子ども',
      ref: REF.children,
      questions: [
        { id: 'childNow', type: 'radio', label: '今、お子さんは', required: true, options: OPT.childNow },
        { id: 'childAge1', type: 'number', label: '1人目の年齢', required: true, unit: '歳', showIf: a => kidsNow(a) >= 1 },
        { id: 'childAge2', type: 'number', label: '2人目の年齢', required: true, unit: '歳', showIf: a => kidsNow(a) >= 2 },
        { id: 'childAge3', type: 'number', label: '3人目の年齢', required: true, unit: '歳', showIf: a => kidsNow(a) >= 3 },
        { id: 'childWish', type: 'radio', label: 'これから子どもは', required: true, options: OPT.childWish },
        { id: 'childNum', type: 'radio', label: '希望する人数（これからの分）', options: OPT.childNum, showIf: a => a.childWish === 'yes' },
        { id: 'childWhen', type: 'radio', label: '時期のイメージ', options: OPT.timing, showIf: a => a.childWish === 'yes' },
        { id: 'eduPath', type: 'radio', label: '進路のイメージ', options: OPT.eduPath, showIf: a => a.childWish === 'yes' || (a.childNow && a.childNow !== 'いない') },
        { id: 'uniLiving', type: 'radio', label: '大学は', options: OPT.uniLiving, showIf: a => a.childWish === 'yes' || (a.childNow && a.childNow !== 'いない') },
        { id: 'lessons', type: 'check', label: 'どんなふうに育てたいですか（あてはまるもの全部）', note: 'チェックしたものの費用だけを計算に入れます。決めていなければ「特に決めていない」を選ぶと、平均的な塾・習い事の費用で計算します', options: OPT.lessons, showIf: a => a.childWish === 'yes' || (a.childNow && a.childNow !== 'いない') }
      ]
    },
    {
      id: 'home', title: '住まいの理想を教えてください', short: '住まい',
      ref: REF.housing,
      questions: [
        { id: 'homeWish', type: 'radio', label: 'マイホームは', required: true, options: OPT.homeWish },
        { id: 'homeType', type: 'radio', label: '種類のイメージ', options: OPT.homeType, showIf: a => a.homeWish === 'yes' || a.homeWish === 'undecided' },
        { id: 'homeWhen', type: 'radio', label: '時期のイメージ', options: OPT.timing, showIf: a => a.homeWish === 'yes' },
        { id: 'homeBudget', type: 'radio', label: '予算のイメージ', options: OPT.homeBudget, showIf: a => a.homeWish === 'yes' || a.homeWish === 'undecided' },
        { id: 'homeDown', type: 'radio', label: '頭金はいくら用意する予定ですか', required: true, options: OPT.homeDown, note: '諸費用（予算の約8%）はローンに組み込む前提で計算します', showIf: a => a.homeWish === 'yes' }
      ]
    },
    {
      id: 'lifestyle', title: '暮らし方について教えてください', short: '暮らし',
      html: '<p class="lead-s">旅行や車は「楽しむためのお金」。我慢する前提ではなく、ちゃんと予定に入れておくために聞いています。</p>',
      questions: [
        { id: 'tripDomesticCount', type: 'radio', label: '国内旅行は年に', required: true, options: OPT.tripCount },
        { id: 'tripDomestic', type: 'radio', label: '国内旅行 1回の予算', options: OPT.tripDomestic, showIf: a => a.tripDomesticCount && a.tripDomesticCount !== 'n0' },
        { id: 'tripAbroadCount', type: 'radio', label: '海外旅行は年に', required: true, options: OPT.tripCount },
        { id: 'tripAbroad', type: 'radio', label: '海外旅行 1回の予算', options: OPT.tripAbroad, showIf: a => a.tripAbroadCount && a.tripAbroadCount !== 'n0' },
        { id: 'carHave', type: 'radio', label: '車は', required: true, options: OPT.carHave },
        { id: 'carWantWhen', type: 'radio', label: 'いつごろ欲しいですか', required: true, options: OPT.timing, showIf: a => a.carHave === 'plan' },
        { id: 'carLoanMonthly', type: 'number', label: '今の車のローン返済（月）', required: true, unit: '万円', note: 'ローンがなければ0', showIf: a => a.carHave === 'yes' },
        { id: 'carLoanLeft', type: 'radio', label: 'ローンの残り期間', required: true, options: OPT.carLoanLeft, showIf: a => a.carHave === 'yes' && Number(a.carLoanMonthly) > 0 },
        { id: 'carCycle', type: 'radio', label: '買い替えのペース', required: true, options: OPT.carCycle, showIf: a => a.carHave === 'yes' || a.carHave === 'plan' },
        { id: 'carBudget', type: 'radio', label: '1台の予算', required: true, options: OPT.carBudget, showIf: a => a.carHave === 'plan' || (a.carHave === 'yes' && a.carCycle && a.carCycle !== 'none') },
        { id: 'carPay', type: 'radio', label: '買うときの支払い方', required: true, options: OPT.carPay, showIf: a => a.carHave === 'plan' || (a.carHave === 'yes' && a.carCycle && a.carCycle !== 'none') },
        { id: 'hobbyMonthly', type: 'radio', label: '趣味・推し活・美容など、自分のために使うお金（月）', required: true, options: OPT.hobbyMonthly }
      ]
    },
    {
      id: 'work', title: '働き方のこれからを教えてください', short: '働き方',
      ref: REF.work,
      questions: [
        { id: 'nightUntil', type: 'radio', label: '夜勤は何歳までにやめたいですか', required: true, options: OPT.nightUntil },
        { id: 'workUntil', type: 'radio', label: '何歳まで働きたいですか', required: true, options: OPT.workUntil },
        { id: 'jobChange', type: 'radio', label: '転職は考えていますか', required: true, options: OPT.jobChange },
        { id: 'leavePlan', type: 'radio', label: '産休・育休の予定はありますか', required: true, options: OPT.leavePlan },
        { id: 'workStyle', type: 'check', label: '働き方について考えていること（あてはまるもの全部）', options: OPT.workStyle },
        { id: 'care', type: 'radio', label: '親の介護について', required: true, options: OPT.care }
      ]
    },
    {
      id: 'money', title: '今のお金について教えてください', short: 'お金',
      html: '<p class="lead-s">ここだけ金額を入力してもらいます。だいたいで大丈夫です。面談でいちばん役に立つところなので、分かる範囲で正確に。</p>',
      questions: [
        { id: 'debtHas', type: 'radio', label: '借入はありますか（奨学金・車・カードなども含めて）', required: true, options: OPT.yesNo },
        { id: 'debtType', type: 'check', label: '種類（あてはまるもの全部）', required: true, options: OPT.debtType, showIf: a => a.debtHas === 'yes' },
        { id: 'debtTotal', type: 'number', label: '借入の残高（合計）', required: true, unit: '万円', showIf: a => a.debtHas === 'yes' },
        { id: 'debtMonthly', type: 'number', label: '毎月の返済額（合計）', required: true, unit: '万円', showIf: a => a.debtHas === 'yes' },
        { id: 'savings', type: 'number', label: '預貯金の合計', required: true, unit: '万円' },
        { id: 'investAssets', type: 'number', label: '預貯金以外の資産（株・投信・保険の解約返戻金など）', unit: '万円', note: 'なければ0で' },
        { id: 'assets', type: 'check', label: '今取り組んでいる資産形成（あてはまるもの全部）', required: true, options: OPT.assets },
        { id: 'assetsOther', type: 'text', label: 'その他の内容', ph: '自由に', showIf: a => (a.assets || []).indexOf('その他') >= 0 },
        { id: 'savingMonthly', type: 'radio', label: '毎月、貯金や積立に回せている額', required: true, options: OPT.savingMonthly },
        { id: 'insurance', type: 'check', label: '入っている保険（あてはまるもの全部）', required: true, options: OPT.insurance },
        { id: 'insuranceMonthly', type: 'radio', label: '保険料の合計（月）', options: OPT.insuranceMonthly, showIf: a => (a.insurance || []).some(x => x !== '入っていない' && x !== 'わからない') },
        { id: 'worries', type: 'check', label: '今、お金で不安に思っていること（あてはまるもの全部）', required: true, options: OPT.worries },
        { id: 'worryText', type: 'textarea', label: 'ほかに気になっていること（あれば）', ph: '自由に。空欄でも大丈夫です' }
      ]
    },
    {
      id: 'retire', title: '老後の理想を教えてください', short: '老後',
      ref: REF.retire,
      questions: [
        { id: 'retireStyle', type: 'check', label: 'どんな老後を過ごしたいですか（あてはまるもの全部）', required: true, options: OPT.retireStyle },
        { id: 'retireText', type: 'text', label: '一言で言うと', ph: '例：年に2回は海外に行ける生活', note: '任意' },
        { id: 'retireLiving', type: 'radio', label: '老後、月にいくらで暮らしたいですか（夫婦なら世帯の額で）', required: true, options: OPT.retireLiving }
      ]
    },
    { id: 'result', title: '結果', short: '結果', isResult: true, questions: [
        { id: 'contact', type: 'radio', label: 'この結果のくわしい説明（面談）を希望しますか', required: true, options: OPT.contact },
        { id: 'slot', type: 'check', label: '都合のいい時間帯（あてはまるもの全部）', required: true, options: OPT.slot, showIf: a => a.contact && a.contact !== '今は希望しない' },
        { id: 'askTopics', type: 'check', label: '面談で聞きたいこと（あてはまるもの全部）', note: '選んでおくと、その話から始められます', options: OPT.askTopics, showIf: a => a.contact && a.contact !== '今は希望しない' },
        { id: 'askOther', type: 'textarea', label: '聞きたいことを具体的に（あれば）', ph: '例：家を買うなら今か、もう少し待つか', showIf: a => a.contact && a.contact !== '今は希望しない' && Array.isArray(a.askTopics) && a.askTopics.length > 0 }
      ] }
  ];

  // ---------- 簡易試算 ----------
  const calc = (a, o) => window.LP_CALC.calc(a, o);
  const kidsNew = a => window.LP_CALC.kidsNew(a);
  const kidsNow = a => window.LP_CALC.kidsNow(a);
  const isCouple = a => window.LP_CALC.isCouple(a);

  function renderResult() {
    const r = calc(A);
    const v = { ok: ['余裕がありそう', 'このペースなら、老後に自分で用意する分まで届きそうです。ただし途中の働き方の変化は入っていません。'],
      tight: ['ぎりぎり', '65歳に残る見込みと、老後に用意したい額がほぼ同じです。少しの変化で足りなくなります。'],
      short: ['老後に向けて、あと' + fmt(-r.gap) + '円', '今のペースだと、65歳の時点で老後に用意したい額に届かない計算です。'] }[r.verdict];
    const tl = [];
    if (r.marry) tl.push('結婚');
    if (r.birth) tl.push('出産');
    if (r.kids) tl.push('教育費（' + r.kids + '人）');
    if (r.homeUp) tl.push('マイホーム');
    if (r.nightStop < 65 && r.nightStop > r.age) tl.push(r.nightStop + '歳 夜勤を外れる');
    tl.push('65歳');
    const row = (label, val, cls) => '<div class="eq-row' + (cls ? ' ' + cls : '') + '"><span>' + label + '</span><b>' + val + '</b></div>';
    const sub = (label, val) => '<div class="eq-sub"><span>' + label + '</span><span>' + val + '</span></div>';
    return '<div class="result">' +
      '<div class="verdict ' + r.verdict + '"><div class="v-label">今のままだと</div><div class="v-main">' + v[0] + '</div><p>' + v[1] + '</p></div>' +
      '<div class="eq">' +
      row('65歳までに入るお金', fmt(r.totalIn) + '円', 'in') +
      sub('手取りの合計（昇給・夜勤離脱・時短を反映）', fmt(r.netIn) + '円') + sub('今の預貯金と資産', fmt(r.now) + '円') + sub('退職金の目安（税引後' + (r.severanceTax ? '・額面' + fmt(r.severance) + '−税' + fmt(r.severanceTax) : '・控除内で税0') + '）', fmt(r.severanceNet) + '円') +
      row('− 65歳までに出ていくお金', fmt(r.totalOut) + '円', 'out') +
      sub('生活費（家賃・食費など）', fmt(r.livingPaid) + '円') + sub('旅行・趣味', fmt(r.tripPaid + r.hobbyPaid) + '円') +
      sub('大きなお金の自分の負担分（結婚・出産・教育・住まいの頭金とローン・車）', fmt(r.bigPersonal) + '円') + (r.debt ? sub('借入の返済', fmt(r.debt) + '円') : '') + (r.leaked > 0 ? sub('使いみちが決まらないまま消えるお金（余った年の余り）', fmt(r.leaked) + '円') : '') +
      row('＝ 65歳のときに手元に残る見込み', fmt(r.at65) + '円', 'eq-result') +
      (r.at65raw < 0 ? '<div class="eq-warn">今のペースだと、65歳までの出費の方が入るお金より多い計算です（' + fmt(-r.at65raw) + '円分）。</div>' : '') +
      row('老後に自分で用意したい目安', fmt(r.retireNeed) + '円', 'need') +
      sub('（希望の生活費 ' + r.living + '万' + (r.retireShare < 1 ? '×分担' + Math.round(r.retireShare * 100) + '%' : '') + ' − 年金の目安 ' + r.pension + '万' + (r.pensionLevel < 1 ? '（今の制度なら' + r.pensionFull + '万。将来の給付水準を見込んで' + Math.round(r.pensionLevel * 100) + '%で計算）' : '') + '）× 12か月 × 25年分 ＋ 介護費用の目安 ' + D.careCost + '万円（一時費用47万＋月9万×約4年半・生命保険文化センター）', '') +
      '</div>' +
      '<p class="note">家族全体でこれからかかる大きなお金は約 <b>' + fmt(r.bigHH) + '円</b>（結婚・出産・教育・住まい・車・旅行・趣味の合計）。上の式には、そのうち自分の負担分だけが入っています。</p>' +
      '<div class="timeline">' + tl.map(t => '<span>' + esc(t) + '</span>').join('<i></i>') + '</div>' +
      '<p class="note">※ 家計の分担は「' + esc(r.shareLabel) + '」として計算しています。<br>※ 現在ご自身で取り組まれている資産形成（NISA・iDeCo・保険など）の運用による増加分は含まれていません。</p>' +
      (/debug/.test(location.search) ? '<div class="ref"><div class="ref-title">内訳（確認用・debug表示）</div>' + table(['項目', '万円'], [
        ['結婚（自己負担＋指輪・旅行・新生活）×分担', fmt(r.marry)], ['出産（' + r.kNew + '人×35）×分担', fmt(r.birth)], ['住まいの頭金（×分担・諸費用8%はローン側）', fmt(r.homeUp)], ['<b>一時支出の合計</b>', '<b>' + fmt(r.oneTime) + '</b>'],
        ['教育費（世帯の総額・0〜2歳の保育料込み・児童手当差引後）', fmt(r.eduTotalHH)], ['→ 65歳までに給料から払う自分の負担', fmt(r.eduPaid)], ['住まいのローン返済（購入年〜65歳）×分担', fmt(r.loanPaid)], ['購入後に消える家賃（年）', fmt(r.rentNetYear)],
        ['車（購入・買い替えの年に予算×分担＋今のローン）', fmt(r.carPaid)], ['旅行（年回数×予算×人数[2人＋子0.5]）×分担', fmt(r.tripPaid)], ['自分のためのお金（趣味・推し活・美容・年収に連動）', fmt(r.hobbyPaid)],
        ['年収（帯の中央値）→ 手取り（×0.77）', fmt(r.incomeNow) + ' → ' + fmt(r.incomeNow * 0.77)], ['今の生活費（手取り−貯金−旅行−自分のためのお金）→ 結婚まで固定', fmt(r.livingNow)], ['結婚後の一人あたり生活費（統計・住居除く・' + (r.livingArea ? '住所から' + r.livingArea : '全国') + '）→ ×世帯倍率＋今の家賃、分担で割る', r.livingStat + '万/月'], ['65歳までの基礎生活費（累計・購入後は家賃分を除く）', fmt(r.livingPaid)], ['夜勤離脱・時短で65歳までに減る手取り（累計）', fmt(r.incomeLost)],
        ['今の預貯金＋資産', fmt(r.now)], ['65歳までの積み上げ（貯金ペース＋残った余り−赤字の年の取り崩し）', fmt(r.savedByYear)], ['使途未定で消える分（余りのうち貯まらない分・貯まる割合' + Math.round(r.keepRate * 100) + '%）', fmt(r.leaked)], ['退職金の目安（勤続' + Math.round(r.tenure) + '年想定・本人の月給で換算）額面→税引後', fmt(r.severance) + ' → ' + fmt(r.severanceNet)], ['借入残高', fmt(r.debt)],
        ['<b>65歳に残る見込み（下限0の前）</b>', '<b>' + fmt(r.at65raw) + '</b>'],
        ['年金の目安：今の制度' + r.pensionFull + '万 × 給付水準' + Math.round(r.pensionLevel * 100) + '%', r.pension + '万/月'], ['老後（希望' + r.living + '万×分担' + Math.round(r.retireShare * 100) + '%−年金' + r.pension + '万）×12×25年＋介護542', fmt(r.retireNeed)], ['<b>差額（判定）</b>', '<b>' + fmt(r.gap) + '</b>'],
        ['分担割合／結婚の年', r.shareVal + '／' + (r.marryYear === 999 ? 'なし' : r.marryYear + '歳')]
      ]) + '</div>' : '') +
      '<div class="detail"><div class="d-title">くわしくは、面談でお見せします</div>' +
      '<ul><li>年ごとの収入と支出の表（結婚・出産・教育・住まい・老後まで）</li><li>夜勤をやめたとき、時短にしたとき、転職したときの3パターン比較</li><li>今の貯金・保険・借入を踏まえて、今からできること</li></ul>' +
      '<p>ここに出ている数字は、あくまで目安です。' + (A.name ? esc(String(A.name).trim().replace(/s+/g, ' ')) + 'さんの' : 'あなたの') + '数字で組み直したものを、1回目の面談でご説明します。</p></div>' +
      '<form id="f" autocomplete="on">' + visibleQuestions(PAGES[page]).map(renderQuestion).join('') + '</form>' +
      '<div class="actions"><button class="btn primary" id="btnSend">' + (A.contact === '今は希望しない' ? 'この内容を送る' : 'この内容を送って、面談を申し込む') + '</button></div>' +
      '<p class="tiny">' + (A.contact === '今は希望しない' ? '送信後、担当（藤田）からLINEでひとことご連絡します。面談はいつでも申し込めます。' : '送信後、担当（藤田）からLINEで日程のご連絡をします。看護師さん限定です。') + '</p>' +
      '</div>';
  }

  // ---------- 描画 ----------
  let page = Math.min(Number(A._page || 0), PAGES.length - 1);
  const root = document.getElementById('app');
  function maxPage() { return Math.max(page, Number(A._max || 0)); }
  function goTo(i) { readForm(); page = i; A._page = page; A._max = Math.max(Number(A._max || 0), page); saveAnswers(); render(); }

  function visibleQuestions(p) { return (p.questions || []).filter(q => !q.showIf || q.showIf(A)); }

  function renderQuestion(q) {
    const val = A[q.id];
    let inner = '';
    if (q.type === 'radio' || q.type === 'check') {
      inner = '<div class="opts">' + q.options.map((o, i) => {
        const checked = q.type === 'radio' ? val === o.v : (val || []).indexOf(o.v) >= 0;
        const lbl = q.raw ? o.l : esc(o.l);
        return '<label class="opt' + (q.agree ? ' agree' : '') + (checked ? ' on' : '') + '"><input type="' + (q.type === 'radio' ? 'radio' : 'checkbox') + '" name="' + q.id + '" value="' + esc(o.v) + '"' + (checked ? ' checked' : '') + '>' + (q.agree ? '<i class="box"></i>' : '') + '<span>' + lbl + '</span></label>';
      }).join('') + '</div>';
    } else if (q.type === 'textarea') {
      inner = '<textarea name="' + q.id + '" rows="3" placeholder="' + esc(q.ph || '') + '">' + esc(val || '') + '</textarea>';
    } else {
      const t = q.type === 'number' ? 'number' : q.type === 'date' ? 'date' : 'text';
      inner = '<div class="inp' + (q.unit ? ' unit' : '') + '"><input type="' + t + '" name="' + q.id + '" value="' + esc(val || '') + '" placeholder="' + esc(q.ph || '') + '"' + (t === 'number' ? ' inputmode="numeric" min="0"' : '') + '>' + (q.unit ? '<span>' + esc(q.unit) + '</span>' : '') + '</div>';
    }
    return '<div class="q" data-q="' + q.id + '"><div class="q-label">' + esc(q.label) + (q.required ? '<em>必須</em>' : '') + '</div>' + (q.note ? '<div class="q-note">' + esc(q.note) + '</div>' : '') + inner + '<div class="err"></div></div>';
  }

  function render(keepScroll) {
    const y = keepScroll ? window.scrollY : 0;
    const p = PAGES[page];
    const pct = Math.round(page / (PAGES.length - 1) * 100);
    let html = '<div class="progress"><div class="bar" style="width:' + pct + '%"></div></div>' +
      '<div class="steps">' + PAGES.map((x, i) => { const reach = i <= maxPage(); return '<span class="' + (i === page ? 'cur' : reach ? 'done' : '') + '"' + (reach && i !== page ? ' data-go="' + i + '" role="button"' : '') + '>' + esc(x.short) + '</span>'; }).join('') + '</div>' +
      '<h1>' + esc(p.title) + '</h1>';
    if (p.isResult) {
      html += renderResult();
      html += '<div class="nav"><button class="btn ghost" id="btnBack">戻る</button></div>';
    } else {
      if (p.html) html += p.html;
      if (p.ref) html += p.ref();
      html += '<form id="f" autocomplete="on">' + visibleQuestions(p).map(renderQuestion).join('') + '</form>';
      html += '<div class="nav">' + (page > 0 ? '<button class="btn ghost" id="btnBack">戻る</button>' : '<span></span>') +
        '<button class="btn primary" id="btnNext">' + (page === PAGES.length - 2 ? '結果を見る' : '次へ') + '</button></div>';
    }
    root.innerHTML = html;
    window.scrollTo(0, y);
    bind();
  }

  function readForm() {
    const f = document.getElementById('f'); if (!f) return;
    // 分岐で隠れた質問の答えは捨てる（例：借入「はい」で残高を入れた後に「いいえ」へ変えた場合）
    (PAGES[page].questions || []).forEach(q => { if (q.showIf && !q.showIf(A)) delete A[q.id]; });
    visibleQuestions(PAGES[page]).forEach(q => {
      if (q.type === 'check') A[q.id] = Array.from(f.querySelectorAll('input[name="' + q.id + '"]:checked')).map(x => x.value);
      else if (q.type === 'radio') { const c = f.querySelector('input[name="' + q.id + '"]:checked'); A[q.id] = c ? c.value : ''; }
      else { const el = f.querySelector('[name="' + q.id + '"]'); A[q.id] = el ? el.value.trim() : ''; }
    });
  }

  function validate() {
    let ok = true, first = null;
    visibleQuestions(PAGES[page]).forEach(q => {
      const box = root.querySelector('[data-q="' + q.id + '"]'); const err = box.querySelector('.err');
      const v = A[q.id]; const empty = q.type === 'check' ? !(v && v.length) : !v;
      let msg = '';
      if (q.required && empty) msg = '選んでください';
      if (!msg && q.type === 'date' && v && ageFrom(v) == null) msg = '日付を確認してください';
      if (!msg && q.type === 'number' && v && Number(v) < 0) msg = '0以上で入力してください';
      err.textContent = msg; box.classList.toggle('bad', !!msg);
      if (msg) { ok = false; if (!first) first = box; }
    });
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return ok;
  }

  function bind() {
    const f = document.getElementById('f');
    if (f) {
      f.addEventListener('change', e => {
        readForm(); saveAnswers();
        const q = visibleQuestions(PAGES[page]).find(x => x.id === e.target.name);
        // 分岐が変わる質問は再描画
        if (q && (q.type === 'radio' || q.type === 'check')) render(true);
        else root.querySelectorAll('.opt').forEach(o => o.classList.toggle('on', o.querySelector('input').checked));
      });
      f.addEventListener('submit', e => { e.preventDefault(); next(); });
    }
    const b = document.getElementById('btnBack'); if (b) b.onclick = () => goTo(page - 1);
    const n = document.getElementById('btnNext'); if (n) n.onclick = next;
    root.querySelectorAll('.steps [data-go]').forEach(s => { s.onclick = () => goTo(Number(s.getAttribute('data-go'))); });
    const s = document.getElementById('btnSend'); if (s) s.onclick = send;
  }

  function next() { readForm(); if (!validate()) return; goTo(page + 1); }

  // ---------- 送信 ----------
  function send() {
    readForm(); saveAnswers(); if (!validate()) return;
    const btn = document.getElementById('btnSend'); btn.disabled = true; btn.textContent = '送信中…';
    const r = calc(A);
    const payload = { submittedAt: new Date().toISOString(), version: D.version, answers: A, calc: r, ua: navigator.userAgent, page: location.href };
    const done = () => {
      A._sent = true; saveAnswers();
      root.innerHTML = '<div class="thanks"><h1>ありがとうございました</h1><p>' + esc(A.name || '') + ' さんの内容を受け取りました。詳しい内訳と、今できることのプランを用意して、LINEでご連絡します。</p>' +
        (CFG.lineUrl ? '<a class="btn primary" href="' + esc(CFG.lineUrl) + '">LINEに戻る</a>' : '') +
        '<p class="tiny">まだ友だち追加がお済みでない方は、上のボタンから追加してお待ちください。</p></div>';
      window.scrollTo(0, 0);
    };
    if (!CFG.endpoint) { console.warn('endpoint未設定'); setTimeout(done, 400); return; }
    fetch(CFG.endpoint, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) })
      .then(done).catch(() => { btn.disabled = false; btn.textContent = 'もう一度送る'; alert('送信できませんでした。電波の良いところでもう一度お試しください。'); });
  }

  render();
})();
