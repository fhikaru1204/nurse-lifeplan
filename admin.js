/* 面談用 詳細ページ：回答JSON → 年ごとの収支表・パターン比較・提案レバー（端末内で計算・送信なし） */
(function () {
  'use strict';
  const D = window.LP_DATA, C = window.LP_CALC;
  const MODE = window.LP_ADMIN_MODE || 'interview'; // interview = 1回目（働き方のみ）/ proposal = 2回目（積立・家賃収入あり）
  const PROPOSAL = MODE === 'proposal';
  const $ = id => document.getElementById(id);
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function fmt(n) { if (n == null || isNaN(n)) return '—'; n = Math.round(n); const neg = n < 0; n = Math.abs(n); const s = n >= 10000 ? Math.floor(n / 10000) + '億' + (n % 10000 ? (n % 10000).toLocaleString() + '万' : '') : n.toLocaleString() + '万'; return (neg ? '−' : '') + s; }
  function f0(n) { return n == null || isNaN(n) ? '' : Math.round(n).toLocaleString(); }
  function j(v) { return Array.isArray(v) ? v.join('、') : (v == null || v === '' ? '—' : String(v)); }
  function label(opts, v) { const o = (opts || []).find(x => x.v === v); return o ? o.l : j(v); }

  // 選択肢の表示名（app.js と同じ値）
  const L = {
    income: { i300: '300万未満', i350: '300〜349万', i400: '350〜399万', i450: '400〜449万', i500: '450〜499万', i550: '500〜549万', i600: '550〜599万', i700: '600〜699万', i800: '700〜799万', i1000: '800〜999万', i1000p: '1,000万以上' },
    subsidy: { none: 'なし', h1: '1万円未満', h2: '1〜2万円', h3: '2〜3万円', h3p: '3万円以上' },
    wish3: { yes: 'したい', no: 'しない', undecided: '未定' },
    childWish: { yes: '欲しい', no: '欲しくない', enough: 'もう十分', undecided: '未定' },
    weddingPlan: { photo: '写真だけ・挙式のみ', family: '親族だけの食事会婚', small: '友人も呼ぶ小規模', std: '標準', large: '大規模', undecided: '未定' },
    shareMode: { all: 'ほぼ自分が全部', more: '自分が多め（7割）', half: '半々', less: '相手が多め（3割）' },
    eduPath: Object.fromEntries(D.education.map(e => [e.key, e.label]).concat([['undecided', '本人次第・未定']])),
    uniLiving: { home: '自宅通学', alone: '一人暮らし', undecided: '未定' },
    lessons: Object.fromEntries(D.lessons.map(l => [l.key, l.label])),
    homeWish: { yes: '買いたい', no: '買わない', have: '持っている', undecided: '未定' },
    homeDown: { d0: '0（全額ローン）', d100: '100万', d300: '300万', d500: '500万', d1000: '1,000万以上' },
    homeBudget: { b2500: '2,500万以下', b3500: '2,500〜3,500万', b4500: '3,500〜4,500万', b6000: '4,500〜6,000万', b8000: '6,000万以上', undecided: '未定' },
    tripCount: { n0: '行かない', n1: '年1回', n2: '年2〜3回', n4: '年4回以上' },
    tripDomestic: { t5: '5万まで', t10: '5〜10万', t20: '10〜20万', t20p: '20万以上' },
    tripAbroad: { a10: '10万まで', a20: '10〜20万', a30: '20〜30万', a30p: '30万以上' },
    carHave: { yes: '持っている', plan: '欲しい', no: '不要' },
    carCycle: { y5: '5年', y7: '7年', y10: '10年以上', none: '買い替えなし' },
    carBudget: { c150: '150万まで', c300: '150〜300万', c500: '300〜500万', c500p: '500万以上' },
    savingMonthly: { s0: 'ほぼ0', s1: '1万未満', s3: '1〜3万', s5: '3〜5万', s8: '5〜8万', s10: '8〜10万', s15: '10〜15万', s15p: '15万以上' },
    retireLiving: { r15: '15万', r20: '20万', r25: '25万', r30: '30万', r40: '40万以上' }
  };
  const range = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };
  const lv = (map, v) => Array.isArray(v) ? v.map(x => map[x] || x).join('、') : (map[v] || j(v));

  // ---------- データ読み込み ----------
  function decodeHash() {
    const m = location.hash.match(/[#&]d=([^&]+)/);
    if (!m) return null;
    try {
      let raw = m[1]; try { raw = decodeURIComponent(raw); } catch (e) {}
      let b = raw.replace(/[^A-Za-z0-9_-]/g, '').replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '=';
      const bin = atob(b); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return JSON.parse(new TextDecoder('utf-8').decode(bytes));
    } catch (e) { console.warn('hash decode failed', e); window.LP_HASH_BROKEN = true; return null; }
  }
  function normalize(obj) { if (!obj) return null; if (obj.answers) return obj.answers; if (obj.dob) return obj; return null; }

  // ---------- 描画 ----------
  const PATTERNS = a => {
    const age = C.ageFrom(a.dob) || 30;
    const base = C.calc(a);
    const dayOnly = a.shift === '日勤のみ' || a.nightUntil === 'もう夜勤はしていない';
    const list = [{ key: 'base', name: '回答どおり', r: base }];
    if (!dayOnly && base.nightStop > age) list.push({ key: 'nightNow', name: '今すぐ夜勤をやめる', r: C.calc(a, { nightStop: age }) });
    if (!dayOnly && base.nightStop < 60) list.push({ key: 'night60', name: '夜勤を60歳まで続ける', r: C.calc(a, { nightStop: 60 }) });
    if (base.kNew) list.push({ key: 'short6', name: '時短を長め（子1人につき6年）', r: C.calc(a, { shortYears: 6 }) });
    list.push({ key: 'job', name: '転職あり（来年・退職金の勤続を転職後だけで数える）', r: C.calc(a, { jobChange: true }) });
    return list;
  };

  // 年ごとの表の合計行（65歳までの累計・現金は最終年）
  function totalsRow(rows, hasInv) {
    const sum = k => rows.reduce((t, r) => t + (r[k] || 0), 0);
    const last = rows[rows.length - 1] || {};
    return '<tr class="total"><td class="lbl">合計</td><td class="ev-label">' + rows.length + '年分</td><td>' + f0(sum('income')) + '</td><td>' + f0(sum('net') + sum('rent')) + '</td><td>' + f0(sum('living')) + '</td><td>' + f0(sum('trip')) + '</td><td>' + f0(sum('hobby')) + '</td><td>' + f0(sum('loan')) + '</td><td>' + f0(sum('edu')) + '</td><td>' + f0(sum('car')) + '</td><td>' + f0(sum('once')) + '</td>' + (hasInv ? '<td>' + f0(sum('invest')) + '</td>' : '') + '<td class="' + (sum('surplus') < 0 ? 'neg' : '') + '">' + f0(sum('surplus')) + '</td><td>' + f0(sum('saving')) + '</td><td class="tiny">' + f0(sum('leak')) + '</td><td>' + f0(last.cash || 0) + '</td>' + (hasInv ? '<td>' + f0(last.investValue || 0) + '</td><td><b>' + f0(last.balance || 0) + '</b></td>' : '') + '</tr>';
  }
  // 退職金の算出の仕方（年ごとの表の備考・転職で大きく変わるので必ず見せる）
  function sevNote(r) {
    const how = r.severance > 0
      ? '勤続' + Math.round(r.tenure) + '年（' + (r.jobChange ? r.jobYear + '歳で転職→転職後の' + Math.max(0, 60 - r.jobYear) + '年だけ。転職前の分は入れない' : '今の勤続' + r.yearsNow + '年＋60歳までの' + Math.max(0, 60 - r.age) + '年') + '）→ 支給月数' + r.sevMonths + 'か月 × 月給' + fmt(r.monthlyPay60) + '（58歳時の年収÷12×0.84＝賞与分を除いた月給）＝ 額面' + fmt(r.severance) + '。退職所得控除' + fmt(r.sevDeduct) + (r.severanceTax ? 'を超えた分に課税→税' + fmt(r.severanceTax) + '・手取り' + fmt(r.severanceNet) : 'の内側なので税0')
      : (r.fullTime ? '「60歳以上まで働く」以外の回答のため0で計算' : '常勤（正職員）以外のため0で計算');
    return '<p class="note"><b>退職金の出し方：</b>' + how + '。<br>支給月数は勤続30年以上 24か月／20年以上 14／10年以上 8／5年以上 2.5／5年未満 0（民間中堅病院の目安・公立病院はこの1.5〜2倍・小規模クリニックは制度なしが多い）。<b>転職すると勤続がリセット</b>され、転職前の分は自己都合の少額精算になるため、この試算では転職後の勤続だけで数える（比較表の「転職あり」がその条件）。<b>実際の退職金規程が分かればそれを優先する</b>。</p>';
  }
  function chart(patterns) {
    const W = 720, H = 300, pl = 56, pr = 12, pt = 50, pb = 28;   // 上に3段ぶんの余白（ライフイベントのラベル用）
    const all = patterns.flatMap(p => p.r.rows.map(x => x.balance));
    const minV = Math.min(0, ...all), maxV = Math.max(100, ...all);
    const ages = patterns[0].r.rows.map(x => x.age);
    const x = a => pl + (a - ages[0]) / Math.max(1, ages[ages.length - 1] - ages[0]) * (W - pl - pr);
    const y = v => pt + (maxV - v) / (maxV - minV) * (H - pt - pb);
    const colors = ['#04419e', '#e08e0b', '#2e7d32', '#8e24aa', '#9b2c2c'];
    let g = '';
    // 軸・目盛
    const step = niceStep(maxV - minV);
    for (let v = Math.ceil(minV / step) * step; v <= maxV; v += step) g += '<line x1="' + pl + '" y1="' + y(v) + '" x2="' + (W - pr) + '" y2="' + y(v) + '" stroke="#e3e8ee"/><text x="' + (pl - 6) + '" y="' + (y(v) + 4) + '" font-size="10" text-anchor="end" fill="#5f6b7a">' + fmt(v) + '</text>';
    g += '<line x1="' + pl + '" y1="' + y(0) + '" x2="' + (W - pr) + '" y2="' + y(0) + '" stroke="#5f6b7a"/>';
    ages.forEach(a => { if (a % 5 === 0) g += '<text x="' + x(a) + '" y="' + (H - 8) + '" font-size="10" text-anchor="middle" fill="#5f6b7a">' + a + '歳</text>'; });
    // ライフイベント（最後のパターン＝「調整中」の条件・パネルで結婚や購入の年齢を動かすと一緒に動く）：縦の点線＋上に名前。近い年は最大3段に分けて重なりを避ける（同じ段の直前ラベルと80px以上離れる段を選ぶ）
    const lastX = [-999, -999, -999];
    patterns[patterns.length - 1].r.rows.forEach(r => {
      if (!r.events.length) return;
      const cx = x(r.age); let row = lastX.findIndex(v => cx - v >= 80); if (row < 0) row = lastX.indexOf(Math.min(...lastX)); lastX[row] = cx;
      g += '<line x1="' + cx.toFixed(1) + '" y1="' + (pt - 4) + '" x2="' + cx.toFixed(1) + '" y2="' + (H - pb) + '" stroke="#c9a227" stroke-width="1" stroke-dasharray="3 3"/>';
      g += '<text x="' + cx.toFixed(1) + '" y="' + (12 + row * 12) + '" font-size="10" text-anchor="middle" fill="#8a6d00">' + esc(r.events.join('・')) + '<tspan fill="#5f6b7a"> ' + r.age + '</tspan></text>';
    });
    // 教育費（年額・本人負担）：緑の面で下に敷く（「調整中」の条件）。かかる年とピークが残高の山谷と重ねて見える
    const curRows = patterns[patterns.length - 1].r.rows; const eduRows = curRows.filter(r => r.edu > 0);
    if (eduRows.length) {
      const area = 'M' + x(curRows[0].age).toFixed(1) + ' ' + y(0).toFixed(1) + ' ' + curRows.map(r => 'L' + x(r.age).toFixed(1) + ' ' + y(r.edu).toFixed(1)).join(' ') + ' L' + x(curRows[curRows.length - 1].age).toFixed(1) + ' ' + y(0).toFixed(1) + ' Z';
      g += '<path d="' + area + '" fill="#00838f" fill-opacity="0.18" stroke="#00838f" stroke-width="1.5"/>';
      const peak = eduRows.reduce((m, r) => r.edu > m.edu ? r : m, eduRows[0]);
      g += '<text x="' + x(peak.age).toFixed(1) + '" y="' + (y(peak.edu) - 5).toFixed(1) + '" font-size="10" text-anchor="middle" fill="#00838f">教育費 最大' + fmt(peak.edu) + '/年（' + peak.age + '歳）</text>';
    }
    patterns.forEach((p, i) => {
      const d = p.r.rows.map((r, k) => (k ? 'L' : 'M') + x(r.age).toFixed(1) + ' ' + y(r.balance).toFixed(1)).join(' ');
      g += '<path d="' + d + '" fill="none" stroke="' + colors[i % colors.length] + '" stroke-width="' + (i ? 2 : 3) + '"' + (i ? ' stroke-dasharray="6 3"' : '') + '/>';
    });
    const legend = '<div class="legend">' + patterns.map((p, i) => '<span><i style="background:' + colors[i % colors.length] + '"></i>' + esc(p.name) + '</span>').join('') + (eduRows.length ? '<span><i style="background:#00838f;opacity:.5"></i>教育費（年額・自分の負担分）</span>' : '') + '<span><i style="background:#c9a227"></i>ライフイベント</span></div>';
    return legend + '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="残高の推移">' + g + '</svg>';
  }
  function niceStep(range) { const raw = range / 5; const p = Math.pow(10, Math.floor(Math.log10(raw))); const m = raw / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; }

  function render(a, meta) {
    const base = C.calc(a);
    const rep = $('report');
    const age = base.age;
    const yearsTo = { '1〜2年以内': 2, '3〜5年以内': 4, '5年より先': 7 };
    let h = '';
    // 見出し
    h += '<h1>' + esc(a.name || '') + ' さん（' + age + '歳）' + (meta && meta.submittedAt ? '<span class="tiny">　回答日 ' + esc(String(meta.submittedAt).slice(0, 10)) + '</span>' : '') + '</h1>';
    // 判定と式
    // 上部の4カード（判定・入る・出る・残る→老後）。パネルを動かすと「調整中」の値で描き直す
    const verdictText = r => ({ ok: '余裕がありそう', tight: 'ぎりぎり', short: '老後に向けて、あと' + fmt(-r.gap) + '円' }[r.verdict]);
    const sumCards = (r, tag, baseV) => {
      const v = verdictText(r);
      const bal65 = r.at65raw - (r.investPaid || 0) + (r.investValue || 0); // 65歳時に貯まっている金額（マイナスもそのまま・2回目は積立の増減込み）
      const gap = bal65 - r.retireNeed;
      const gapCls = gap >= 0 ? 'ok' : 'short';
      const gapLabel = gap >= 0 ? '余剰' : '不足';
      return '<div class="card"><div class="c-label">判定（' + tag + '）</div><div class="c-num">' + v + '</div>' + (baseV && baseV !== v ? '<div class="c-sub">回答どおり：' + baseV + '</div>' : '') +
          '<div class="c-sub">65歳時に貯まっている金額 <b>' + fmt(bal65) + '円</b></div></div>' +
        '<div class="card"><div class="c-label">65歳までの収入</div><div class="c-num">' + fmt(r.totalIn) + '</div><div class="c-sub">手取り ' + fmt(r.netIn) + '＋今の預貯金・資産 ' + fmt(r.now) + '＋退職金（税引後） ' + fmt(r.severanceNet) + '</div></div>' +
        '<div class="card"><div class="c-label">65歳までの支出</div><div class="c-num">' + fmt(r.totalOut) + '</div><div class="c-sub">生活費 ' + fmt(r.livingPaid) + '／旅行趣味 ' + fmt(r.tripPaid + r.hobbyPaid) + '／大きなお金 ' + fmt(r.bigPersonal) + '／借入 ' + fmt(r.debt) + '／使途未定 ' + fmt(r.leaked) + '</div></div>' +
        '<div class="card c-gap ' + gapCls + '"><div class="c-label">65歳時に貯まっている金額 − 老後に必要な資金</div>' +
          '<div class="c-formula">' + fmt(bal65) + ' − ' + fmt(r.retireNeed) + '</div>' +
          '<div class="c-num">＝ ' + (gap >= 0 ? '' : '−') + fmt(Math.abs(gap)) + '円 <span class="c-tag">' + gapLabel + '</span></div>' +
          '<div class="c-sub">老後に必要な資金＝（希望 ' + r.living + '万/月' + (r.retireShare < 1 ? '×分担' + Math.round(r.retireShare * 100) + '%' : '') + ' − 年金 ' + r.pension + '万/月）×12か月×25年＋介護費用' + D.careCost + '万</div></div>'
;
    };
    h += '<div class="sum" id="sumCards">' + sumCards(base, '回答どおり') + '</div>';
    // 回答の要約
    h += '<div class="grid2">' +
      '<div class="box"><h2>基本</h2><dl class="kv">' +
      kv('生年月日', a.dob) + kv('住所', a.address) + kv('勤務先', a.employer + (a.employerAddr ? '（' + a.employerAddr + '）' : '')) + kv('雇用・役職', j(a.employ) + '／' + j(a.role)) + kv('勤続／経験', j(a.years) + '／' + j(a.totalYears)) +
      kv('年収', lv(L.income, a.income)) + kv('勤務形態', j(a.shift) + (a.nights ? '・夜勤' + a.nights + '/月' : '')) + kv('住まい', j(a.housing) + (a.housingCost ? '・月' + a.housingCost + '万' : '') + '・補助' + lv(L.subsidy, a.subsidy)) + kv('世帯', a.household) +
      '</dl></div>' +
      '<div class="box"><h2>家族と希望</h2><dl class="kv">' +
      kv('婚姻', j(a.marital) + (a.marital !== '既婚' ? '・結婚' + lv(L.wish3, a.marryWish) + (a.marryWhen ? '・' + a.marryWhen : '') + (a.weddingPlan ? '・' + lv(L.weddingPlan, a.weddingPlan) : '') : '')) +
      kv('パートナー年収', a.partnerIncome) + kv('家計の分担', lv(L.shareMode, a.shareMode)) +
      kv('子ども', j(a.childNow) + ([a.childAge1, a.childAge2, a.childAge3].filter(x => x !== undefined && x !== '').length ? '（' + [a.childAge1, a.childAge2, a.childAge3].filter(x => x !== undefined && x !== '').join('歳・') + '歳）' : '') + '・これから' + lv(L.childWish, a.childWish) + (a.childNum ? a.childNum : '') + (a.childWhen ? '・' + a.childWhen : '')) +
      kv('進路', lv(L.eduPath, a.eduPath) + '・' + lv(L.uniLiving, a.uniLiving)) + kv('育て方', lv(L.lessons, a.lessons)) +
      kv('マイホーム', lv(L.homeWish, a.homeWish) + (a.homeType ? '・' + a.homeType : '') + (a.homeWhen ? '・' + a.homeWhen : '') + (a.homeBudget ? '・' + lv(L.homeBudget, a.homeBudget) : '') + (a.homeDown ? '・頭金' + lv(L.homeDown, a.homeDown) : '')) +
      '</dl></div>' +
      '<div class="box"><h2>暮らし・働き方</h2><dl class="kv">' +
      kv('国内旅行', lv(L.tripCount, a.tripDomesticCount) + (a.tripDomestic ? '・' + lv(L.tripDomestic, a.tripDomestic) : '')) + kv('海外旅行', lv(L.tripCount, a.tripAbroadCount) + (a.tripAbroad ? '・' + lv(L.tripAbroad, a.tripAbroad) : '')) +
      kv('車', lv(L.carHave, a.carHave) + (a.carWantWhen ? '・' + a.carWantWhen + 'に' : '') + (a.carHave === 'yes' ? '・今のローン 月' + j(a.carLoanMonthly) + '万' + (Number(a.carLoanMonthly) > 0 ? '（残り' + j(a.carLoanLeft) + '）' : '') : '') + (a.carCycle ? '・買い替え' + lv(L.carCycle, a.carCycle) : '') + (a.carBudget ? '・' + lv(L.carBudget, a.carBudget) : '') + (a.carPay ? '・' + a.carPay : '')) + kv('趣味（月）', a.hobbyMonthly) +
      kv('夜勤は', a.nightUntil) + kv('働くのは', a.workUntil) + kv('転職', a.jobChange) + kv('産休育休', a.leavePlan) + kv('働き方の希望', lv({}, a.workStyle)) + kv('親の介護', a.care) +
      '</dl></div>' +
      '<div class="box"><h2>今のお金・老後</h2><dl class="kv">' +
      kv('借入', a.debtHas === 'yes' ? lv({}, a.debtType) + '・残' + j(a.debtTotal) + '万・月' + j(a.debtMonthly) + '万' : 'なし') + kv('預貯金／資産', j(a.savings) + '万／' + j(a.investAssets) + '万') +
      kv('資産形成', lv({}, a.assets) + (a.assetsOther ? '（' + a.assetsOther + '）' : '')) + kv('毎月の貯金', lv(L.savingMonthly, a.savingMonthly)) + kv('保険', lv({}, a.insurance) + (a.insuranceMonthly ? '・月' + a.insuranceMonthly : '')) +
      kv('不安', lv({}, a.worries)) + kv('自由記述', a.worryText) + kv('老後', lv({}, a.retireStyle) + (a.retireText ? '「' + a.retireText + '」' : '') + '・月' + lv(L.retireLiving, a.retireLiving)) +
      kv('面談', j(a.contact) + (a.slot ? '・' + lv({}, a.slot) : '')) + (a.askTopics && a.askTopics.length ? kv('聞きたいこと', lv({}, a.askTopics) + (a.askOther ? '「' + a.askOther + '」' : '')) : '') +
      '</dl></div>' +
      '</div>';
    // パターン比較（調整パネル：お客さんに見せながら条件を変える）
    h += '<div class="box pat" id="cmpBox"><h2>' + (PROPOSAL ? '提案を含めた比較（2回目用）' : '働き方を変えたときの比較') + '</h2>' +
      '<div class="panel">' +
      '<div class="lever">' +
      '<div><label>パターン名</label><input type="text" id="pName" value="調整中" maxlength="20"></div>' +
      '<div><label>夜勤をやめる年齢</label><select id="pNight"><option value="">回答どおり（' + (base.nightStop >= 65 ? 'やめない' : base.nightStop + '歳') + '）</option><option value="now">今すぐ</option>' + [35, 40, 45, 50, 55, 60].filter(x => x > age).map(x => '<option value="' + x + '">' + x + '歳</option>').join('') + '</select></div>' +
      '<div><label>時短（子1人につき）</label><select id="pShort"><option value="">回答どおり</option><option value="0">なし</option><option value="3">3年</option><option value="6">6年</option><option value="10">10年</option></select></div>' +
      '<div><label>転職</label><select id="pJob"><option value="">回答どおり</option><option value="0">なし</option><option value="1">あり（退職金の勤続を転職後だけで数える）</option></select></div>' +
      '<div><label>転職の年齢（転職ありのとき）</label><select id="pJobYear"><option value="">来年（' + (age + 1) + '歳）</option>' + range(age + 2, Math.min(age + 25, 59)).map(x => '<option value="' + x + '">' + x + '歳</option>').join('') + '</select></div>' +
      (base.marryYear !== 999 && a.marital !== '既婚' && a.household !== '独身・同棲' ? '<div><label>結婚の年齢</label><select id="pMarry"><option value="">回答どおり（' + base.marryYear + '歳）</option>' + range(age + 1, Math.min(age + 15, 50)).map(x => '<option value="' + x + '">' + x + '歳</option>').join('') + '</select></div>' : '') +
      (base.kNew ? '<div><label>第1子の出産年齢</label><select id="pChild"><option value="">回答どおり（' + base.childStart + '歳）</option>' + range(age + 1, Math.min(age + 15, 45)).map(x => '<option value="' + x + '">' + x + '歳</option>').join('') + '</select></div>' : '') +
      (base.homeYear !== 999 ? '<div><label>マイホーム購入の年齢</label><select id="pHome"><option value="">回答どおり（' + base.homeYear + '歳）</option>' + range(age + 1, Math.min(age + 25, 60)).map(x => '<option value="' + x + '">' + x + '歳</option>').join('') + '</select></div>' : '') +
      '<div><label>結婚後の一人あたり生活費（万円/月・統計' + (base.livingArea ? '・住所から「' + esc(base.livingArea) + '」' : '・全国') + '）</label><input type="number" id="pLivingStat" value="' + base.livingStat + '" min="8" max="30" step="0.5"></div>' +
      '<details class="ref" style="grid-column:1/-1"><summary>参考：エリア別の生活費（家計調査2025・住居と教養娯楽を除く・万円/月・参考程度）</summary><div class="ref-grid">' +
      '<div><b>単身・勤労者（一人）</b><table class="ref-tbl">' + D.livingByArea.single.map(x => '<tr><td>' + esc(x.a) + '</td><td>' + x.v + '</td></tr>').join('') + '</table></div>' +
      '<div><b>二人以上・勤労者（世帯の額／<u>大人一人あたり</u>）</b><table class="ref-tbl">' + D.livingByArea.multi.map(x => '<tr><td>' + esc(x.a) + '</td><td>' + x.v + '<span class="tiny">（' + x.p + '人）</span></td><td><b>' + x.ad + '</b></td></tr>').join('') + '</table></div>' +
      '</div><p class="note">上の「結婚後の一人あたり生活費」に入れる数字＝右の表の<b>大人一人あたり</b>（世帯の額から子ども分[0.2×(世帯人員−2)×13.7]を引いて夫婦倍率1.9で割ったもの）。例：東京都区部15.0・全国13.6・沖縄9.6。左の単身の値は独身時代の参考。単身は各地方の標本が26〜59世帯しかないので参考程度。</p></details>' +
      '<div><label>結婚後の生活費の倍率（一人＝1）</label><input type="number" id="pHhCouple" value="' + D.hhCouple + '" min="1" max="2.5" step="0.1"></div>' +
      '<div><label>年金の給付水準（今の制度＝100%）</label><select id="pPension"><option value="0.8">80%（将来の低下を見込む・初期）</option><option value="0.9">90%</option><option value="1">100%（今の制度どおり）</option></select></div>' +
      '<div><label>余ったお金のうち貯まる割合</label><select id="pKeep"><option value="0">0%（今の貯金ペース以上は貯まらない）</option><option value="0.5">50%</option><option value="1">100%（余りは全部貯まる）</option></select></div>' +
      '<div><label>子1人あたりの生活費の上乗せ</label><input type="number" id="pHhChild" value="0.2" min="0" max="1" step="0.05"></div>' +
      '<div><label>家計の分担</label><select id="pShare"><option value="">回答どおり</option><option value="all">ほぼ自分が全部</option><option value="more">自分が多め（7割）</option><option value="half">半々</option><option value="less">相手が多め（3割）</option></select></div>' +
      (PROPOSAL ? '<div><label>積立 月額（万円）</label><input type="number" id="pInv" value="0" min="0" step="0.5"></div>' +
      '<div><label>積立 年利（%）</label><input type="number" id="pRate" value="3" min="0" step="0.5"></div>' +
      '<div><label>積立の開始年齢</label><input type="number" id="pInvFrom" value="' + age + '" min="' + age + '" max="64"></div>' +
      '<div><label>家賃収入 月額（万円）</label><input type="number" id="pRent" value="0" min="0" step="0.5"></div>' +
      '<div><label>家賃収入の開始年齢</label><input type="number" id="pRentFrom" value="' + (age + 1) + '" min="' + age + '" max="64"></div>' : '') +
      '</div>' +
      '<div class="panel-actions"><button class="btn primary small" id="pAdd">この条件を比較表に残す</button><button class="btn ghost small" id="pReset">条件を回答どおりに戻す</button><button class="btn ghost small" id="pClear">残した条件を全部消す</button></div>' +
      '</div>' +
      '<div id="cmpTable"></div><div id="cmpChart"></div>' +
      '<p class="note">「調整中」の行はパネルの値でその場で動く。「65歳に残る」は結果ページと違い、マイナスの場合もそのまま表示する。残したい条件は「比較表に残す」で行として固定（最大4つ）。残した条件はこの端末に保存され、1回目・2回目のページで同じ人（氏名＋生年月日）なら自動で引き継がれる。' + (PROPOSAL ? '積立は元本を現金から出して年利で複利、家賃収入は手取りに加算。' : '') + '</p></div>';
    // 年ごとの収支表
    h += '<div class="box"><h2>年ごとの収支（万円）</h2><div class="lever" style="margin-bottom:8px"><div><label>表に出すパターン</label><select id="yrPick"><option value="cur">調整中（パネルの条件）</option><option value="base">回答どおり</option></select></div></div><div id="yrTable"><div class="tbl-wrap yr"><table><thead><tr><th>年齢</th><th>出来事</th><th>年収</th><th>手取り</th><th>生活費</th><th>旅行</th><th>趣味</th><th>ローン</th><th>教育</th><th>車</th><th>一時支出</th><th>年間収支</th><th>貯金</th><th>使途未定</th><th>残高</th></tr></thead><tbody>' +
      base.rows.map(r => '<tr' + (r.events.length ? ' class="ev"' : '') + '><td class="lbl">' + r.age + '</td><td class="ev-label">' + esc(r.events.join('・')) + '</td><td>' + f0(r.income) + '</td><td>' + f0(r.net) + '</td><td>' + f0(r.living) + '</td><td>' + f0(r.trip) + '</td><td>' + f0(r.hobby) + '</td><td>' + f0(r.loan) + '</td><td>' + f0(r.edu) + (r.kids ? '<span class="tiny">（' + r.kids + '人）</span>' : '') + '</td><td>' + f0(r.car) + '</td><td>' + f0(r.once) + '</td><td class="' + (r.surplus < 0 ? 'neg' : '') + '">' + f0(r.surplus) + '</td><td>' + f0(r.saving) + '</td><td class="tiny">' + f0(r.leak) + '</td><td class="' + (r.balance < 0 ? 'neg' : '') + '">' + f0(r.balance) + '</td></tr>').join('') +
      totalsRow(base.rows, false) +
      '</tbody></table></div></div><p class="note">年間収支＝手取り−支出（貯金を引く前）＝貯金＋使途未定。貯金は回答のペース（月額×12）を上限に年間収支から積む。使途未定＝ペースを超えた余りのうち貯まらずに消える分（パネル「余ったお金のうち貯まる割合」・初期0%）。赤字の年は貯金0で、赤字分を残高から取り崩す。残高の増減＝年間収支−使途未定。65歳の行（退職金を受け取る年）の現金が「65歳に残る見込み」（マイナスなら結果ページでは0表示）。</p><p class="note"><b>上記はあくまでもシミュレーションになります。</b></p></div>';
    rep.innerHTML = h;
    rep.hidden = false; $('loader').hidden = true;
    const cp = $('btnCopy'); if (cp) { cp.hidden = false; cp.onclick = () => { const txt = JSON.stringify({ submittedAt: meta && meta.submittedAt, answers: a }); (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => { cp.textContent = 'コピーしました'; setTimeout(() => cp.textContent = '回答データをコピー', 1500); }).catch(() => { prompt('この文字列をコピーしてください', txt); }); }; }
    try { const json = JSON.stringify({ submittedAt: meta && meta.submittedAt, answers: a }); const bytes = new TextEncoder().encode(json); let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b)); const b64 = btoa(bin).replace(/[+]/g, '-').replace(/[/]/g, '_').replace(/=+$/, ''); const link = $('otherPage'); if (link) { link.href = (PROPOSAL ? 'admin.html' : 'proposal.html') + '#d=' + b64; link.hidden = false; } } catch (e) {}
    window.scrollTo(0, 0);
    // 比較パネルのロジック
    const storeKey = 'lp_patterns_' + (a.name || '') + '|' + (a.dob || '');
    let saved = [];
    try { saved = JSON.parse(localStorage.getItem(storeKey) || '[]'); if (!Array.isArray(saved)) saved = []; } catch (e) { saved = []; }
    const persist = () => { try { localStorage.setItem(storeKey, JSON.stringify(saved)); } catch (e) {} };
    const readPanel = () => {
      const o = {};
      const n = $('pNight').value; if (n === 'now') o.nightStop = age; else if (n) o.nightStop = Number(n);
      const s = $('pShort').value; if (s !== '') o.shortYears = Number(s);
      const jb = $('pJob').value; if (jb !== '') o.jobChange = jb === '1';
      if ($('pJobYear') && $('pJobYear').value && (o.jobChange || (jb === '' && a.jobChange === '予定あり（1年以内）'))) o.jobYear = Number($('pJobYear').value);
      if (PROPOSAL) {
        const inv = Number($('pInv').value || 0); if (inv > 0) o.invest = { monthly: inv, rate: Number($('pRate').value || 0), from: Number($('pInvFrom').value || age) };
        const rent = Number($('pRent').value || 0); if (rent > 0) o.rent = { monthly: rent, from: Number($('pRentFrom').value || age) };
      }
      const share = $('pShare').value;
      if ($('pLivingStat') && $('pLivingStat').value !== '' && Number($('pLivingStat').value) !== base.livingStat) o.livingStat = Number($('pLivingStat').value);
      if ($('pHhCouple') && $('pHhCouple').value !== '' && Number($('pHhCouple').value) !== D.hhCouple) o.hhCouple = Number($('pHhCouple').value);
      if ($('pHhChild') && $('pHhChild').value !== '' && Number($('pHhChild').value) !== 0.2) o.hhChild = Number($('pHhChild').value);
      if ($('pKeep') && Number($('pKeep').value) !== 0) o.surplusKeep = Number($('pKeep').value);
      if ($('pPension') && Number($('pPension').value) !== D.pensionLevel) o.pensionLevel = Number($('pPension').value);
      if ($('pMarry') && $('pMarry').value) o.marryYear = Number($('pMarry').value);
      if ($('pChild') && $('pChild').value) o.childStart = Number($('pChild').value);
      if ($('pHome') && $('pHome').value) o.homeYear = Number($('pHome').value);
      return { name: ($('pName').value || '調整中').trim(), opts: o, share: share };
    };
    const runPattern = p => { const a2 = p.share ? Object.assign({}, a, { shareMode: p.share }) : a; const r = C.calc(a2, p.opts); r.at65adj = r.at65raw - r.investPaid + r.investValue; return r; };
    const describe = p => {
      const d = [];
      if (p.opts.nightStop != null) d.push('夜勤' + (p.opts.nightStop <= age ? '今すぐやめる' : p.opts.nightStop + '歳まで'));
      if (p.opts.shortYears != null) d.push('時短' + (p.opts.shortYears ? p.opts.shortYears + '年' : 'なし'));
      if (p.opts.jobChange != null) d.push(p.opts.jobChange ? '転職あり' + (p.opts.jobYear ? p.opts.jobYear + '歳' : '') : '転職なし');
      else if (p.opts.jobYear != null) d.push('転職' + p.opts.jobYear + '歳');
      if (p.share) d.push('分担:' + ({ all: '全部', more: '7割', half: '半々', less: '3割' }[p.share]));
      if (p.opts.livingStat != null) d.push('生活費' + p.opts.livingStat + '万/月');
      if (p.opts.hhCouple != null) d.push('世帯倍率' + p.opts.hhCouple);
      if (p.opts.hhChild != null) d.push('子上乗せ' + p.opts.hhChild);
      if (p.opts.surplusKeep != null) d.push('余り' + Math.round(p.opts.surplusKeep * 100) + '%貯まる');
      if (p.opts.pensionLevel != null) d.push('年金' + Math.round(p.opts.pensionLevel * 100) + '%');
      if (p.opts.marryYear != null) d.push('結婚' + p.opts.marryYear + '歳');
      if (p.opts.childStart != null) d.push('第1子' + p.opts.childStart + '歳');
      if (p.opts.homeYear != null) d.push('購入' + p.opts.homeYear + '歳');
      if (p.opts.invest) d.push('積立' + p.opts.invest.monthly + '万/月・' + p.opts.invest.rate + '%・' + p.opts.invest.from + '歳〜');
      if (p.opts.rent) d.push('家賃' + p.opts.rent.monthly + '万/月・' + p.opts.rent.from + '歳〜');
      return d.length ? d.join('／') : '回答どおり';
    };
    const yearTable = r => { const hasInv = r.investPaid > 0; return '<div class="tbl-wrap yr"><table><thead><tr><th>年齢</th><th>出来事</th><th>年収</th><th>手取り</th><th>生活費</th><th>旅行</th><th>趣味</th><th>ローン</th><th>教育</th><th>車</th><th>一時支出</th>' + (hasInv ? '<th>積立</th>' : '') + '<th>年間収支</th><th>貯金</th><th>使途未定</th><th>現金</th>' + (hasInv ? '<th>積立の評価額</th><th>合計</th>' : '') + '</tr></thead><tbody>' +
      r.rows.map(x => '<tr' + (x.events.length ? ' class="ev"' : '') + '><td class="lbl">' + x.age + '</td><td class="ev-label">' + esc(x.events.join('・')) + '</td><td>' + f0(x.income) + '</td><td>' + f0(x.net + (x.rent || 0)) + '</td><td>' + f0(x.living) + '</td><td>' + f0(x.trip) + '</td><td>' + f0(x.hobby) + '</td><td>' + f0(x.loan) + '</td><td>' + f0(x.edu) + (x.kids ? '<span class="tiny">（' + x.kids + '人）</span>' : '') + '</td><td>' + f0(x.car) + '</td><td>' + f0(x.once) + '</td>' + (hasInv ? '<td>' + f0(x.invest) + '</td>' : '') + '<td class="' + (x.surplus < 0 ? 'neg' : '') + '">' + f0(x.surplus) + '</td><td>' + f0(x.saving) + '</td><td class="tiny">' + f0(x.leak) + '</td><td class="' + (x.cash < 0 ? 'neg' : '') + '">' + f0(x.cash) + '</td>' + (hasInv ? '<td>' + f0(x.investValue) + '</td><td class="' + (x.balance < 0 ? 'neg' : '') + '"><b>' + f0(x.balance) + '</b></td>' : '') + '</tr>').join('') +
      totalsRow(r.rows, hasInv) +
      '</tbody></table></div>' + sevNote(r); };
    const refresh = () => {
      const cur = readPanel();
      const list = [{ name: '回答どおり', desc: '回答どおり', r: base, base: true }]
        .concat(saved.map((p, i) => ({ name: p.name, desc: describe(p), r: runPattern(p), idx: i })))
        .concat([{ name: cur.name === '調整中' ? '調整中' : cur.name + '（調整中）', desc: describe(cur), r: runPattern(cur), cur: true }]);
      const baseGap = base.at65raw - base.retireNeed;
      { const cp = list.find(p => p.cur); const changed = cp && cp.desc !== '回答どおり'; const sc = $('sumCards'); if (sc) sc.innerHTML = sumCards(changed ? cp.r : base, changed ? '調整中' : '回答どおり', changed ? verdictText(base) : null); }
      $('cmpTable').innerHTML = '<div class="tbl-wrap"><table><thead><tr><th>パターン</th><th>条件</th><th>65歳までの手取り</th><th>退職金の目安</th><th>65歳に残る</th><th>老後の目安</th><th>差額</th><th>回答どおりとの差</th></tr></thead><tbody>' +
        list.map(p => { const r = p.r; const at = p.base ? r.at65raw : r.at65adj; const g = at - r.retireNeed; const d = g - baseGap; return '<tr' + (p.cur ? ' class="cur"' : '') + '><td class="lbl">' + esc(p.name) + (p.idx != null ? ' <button class="del" data-del="' + p.idx + '" title="この行を消す">×</button>' : '') + '</td><td class="lbl small">' + esc(p.desc) + '</td><td>' + fmt(r.netIn + (r.rentIn || 0)) + '</td><td>' + fmt(r.severance) + '</td><td class="' + (at < 0 ? 'neg' : '') + '">' + fmt(at) + '</td><td>' + fmt(r.retireNeed) + '</td><td class="' + (g >= 0 ? 'best' : 'neg') + '">' + fmt(g) + '</td><td>' + (p.base ? '—' : (d >= 0 ? '+' : '') + fmt(d)) + '</td></tr>'; }).join('') +
        '</tbody></table></div>';
      $('cmpChart').innerHTML = chart(list.map(p => ({ name: p.name, r: p.r })));
      const pick = $('yrPick');
      if (pick) { const v = pick.value || 'cur'; pick.innerHTML = ['<option value="cur">調整中（' + esc(describe(cur)) + '）</option>', '<option value="base">回答どおり</option>'].concat(saved.map((p, i) => '<option value="s' + i + '">' + esc(p.name) + '</option>')).join(''); pick.value = v; if (!pick.value) pick.value = 'cur'; const target = pick.value === 'base' ? base : pick.value === 'cur' ? runPattern(cur) : runPattern(saved[Number(pick.value.slice(1))] || cur); $('yrTable').innerHTML = yearTable(target); }
    };
    ['pName', 'pNight', 'pShort', 'pJob', 'pJobYear', 'pShare', 'pMarry', 'pChild', 'pHome', 'pLivingStat', 'pHhCouple', 'pHhChild', 'pKeep', 'pPension', 'pInv', 'pRate', 'pInvFrom', 'pRent', 'pRentFrom', 'yrPick'].forEach(id => { const el = $(id); if (!el) return; el.addEventListener('input', refresh); el.addEventListener('change', refresh); });
    $('pAdd').onclick = () => { if (saved.length >= 4) { alert('残せるのは4つまでです。「全部消す」で整理してください。'); return; } const p = readPanel(); if (p.name === '調整中') p.name = 'パターン' + (saved.length + 1); saved.push(p); persist(); $('pName').value = '調整中'; refresh(); };
    $('pReset').onclick = () => { ['pNight', 'pShort', 'pJob', 'pJobYear', 'pShare', 'pMarry', 'pChild', 'pHome'].forEach(id => { if ($(id)) $(id).value = ''; }); if ($('pLivingStat')) $('pLivingStat').value = base.livingStat; if ($('pHhCouple')) $('pHhCouple').value = D.hhCouple; if ($('pHhChild')) $('pHhChild').value = 0.2; if ($('pKeep')) $('pKeep').value = '0'; if ($('pPension')) $('pPension').value = String(D.pensionLevel); if (PROPOSAL) { $('pInv').value = 0; $('pRate').value = 3; $('pInvFrom').value = age; $('pRent').value = 0; $('pRentFrom').value = age + 1; } $('pName').value = '調整中'; refresh(); };
    $('pClear').onclick = () => { saved.length = 0; persist(); refresh(); };
    $('cmpTable').addEventListener('click', e => { const b = e.target.closest('[data-del]'); if (!b) return; saved.splice(Number(b.getAttribute('data-del')), 1); persist(); refresh(); });
    refresh();
  }
  function kv(k, v) { return '<dt>' + esc(k) + '</dt><dd>' + esc(j(v)) + '</dd>'; }

  // ---------- 起動 ----------
  function load(obj) { const a = normalize(obj); if (!a) { alert('回答データの形式が違います'); return; } render(a, obj); }
  $('btnLoad').onclick = () => { const t = $('rawInput').value.trim(); if (!t) { alert('上の欄にrawシートのJSONを貼ってから押してください。手元で試すなら「この端末で回答した内容を読み込む」を使ってください。'); return; } try { load(JSON.parse(t)); } catch (e) { alert('JSONとして読めませんでした'); } };
  $('btnLocal').onclick = () => { try { const s = localStorage.getItem('lp_answers_v1'); if (!s) { alert('この端末にはまだ回答が保存されていません。先に試算ページを最後まで進めてください。'); return; } load({ answers: JSON.parse(s), submittedAt: new Date().toISOString() }); } catch (e) { alert('読み込めませんでした'); } };
  $('btnPrint').onclick = () => window.print();
  const fromHash = decodeHash(); if (fromHash) load(fromHash);
  else if (window.LP_HASH_BROKEN) { const p = document.createElement('p'); p.className = 'note'; p.style.cssText = 'background:#fdecea;color:#9b2c2c;border-radius:8px;padding:10px 12px;font-weight:700'; p.textContent = 'メールのリンクが途中で切れているようです（回答データを読み込めませんでした）。メール本文のリンクを最後までコピーして貼り直すか、スプレッドシート「raw」シートの該当行のJSONを下の欄に貼って「貼り付けたJSONを読み込む」を押してください。'; const l = document.getElementById('loader'); l.insertBefore(p, l.children[1]); }
  else { try { const s = localStorage.getItem('lp_answers_v1'); if (s && /debug/.test(location.search)) load({ answers: JSON.parse(s) }); } catch (e) {} }
})();
