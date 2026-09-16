/* 看護師ライフプラン試算 — 計算エンジン（結果ページと面談用ページで共用）
   window.LP_CALC.calc(answers, opts) → 結果オブジェクト（rows に年ごとの収支）
   opts（面談用の切替。省略時は回答どおり）:
     nightStop   夜勤をやめる年齢を上書き（例: 今すぐなら現在の年齢）
     shortYears  時短の年数を上書き（子1人につき）
     jobChange   true で転職あり（退職金の勤続を転職の年からやり直し。年収は変えない＝キャリアアップ転職もあるため）
     jobYear     転職の年齢（既定 今の年齢＋1）
     invest      { monthly, rate, from }  積立の月額（万）・年利（%）・開始年齢 → 65歳時点の評価額を上乗せ
     rent        { monthly, from }        家賃収入の月額（万）・開始年齢 → 手取りに加算
     marryYear   結婚の年齢を上書き（結婚希望ありの独身のみ）
     childStart  第1子の出産年齢を上書き（これから欲しい子がいる場合。2人目以降は2年おき）
     homeYear    マイホーム購入の年齢を上書き（買いたい人のみ）
     hhCouple    結婚後の世帯生活費の倍率（既定 1.9・住居と教養娯楽を除いたベースでの単身→夫婦の比）
     hhChild     同居の子1人あたりの上乗せ倍率（既定 0.2） */
(function () {
  'use strict';
  const D = window.LP_DATA;

  function ageFrom(dob) { if (!dob) return null; const b = new Date(dob); if (isNaN(b)) return null; const t = new Date(); let a = t.getFullYear() - b.getFullYear(); const m = t.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--; return a; }
  function kidsNew(a) { return a.childWish === 'yes' ? ({ '1人': 1, '2人': 2, '3人以上': 3 }[a.childNum] || 1) : 0; }
  function kidsNow(a) { return a.childNow && a.childNow !== 'いない' ? ({ '1人': 1, '2人': 2, '3人以上': 3 }[a.childNow] || 0) : 0; }
  function isCouple(a) { return a.marital === '既婚' || a.household === '独身・同棲' || (a.marital !== '既婚' && a.marryWish === 'yes'); }

  // 住所の文字列からエリアを判定し、参考表（二人以上・勤労者の大人一人あたり）の値を返す。主要都市 → 都道府県→地方（家計調査の地方区分）。判定できなければ null
  const AREA_CITY = [['東京都区部', /東京都.*区/], ['さいたま市', /さいたま市/], ['千葉市', /千葉市/], ['横浜市', /横浜市/], ['川崎市', /川崎市/], ['相模原市', /相模原市/], ['札幌市', /札幌市/], ['仙台市', /仙台市/], ['名古屋市', /名古屋市/], ['京都市', /京都市/], ['大阪市', /大阪市/], ['神戸市', /神戸市/], ['広島市', /広島市/], ['福岡市', /福岡市/], ['那覇市', /那覇市/]];
  const AREA_PREF = [['北海道地方', /北海道/], ['東北地方', /青森|岩手|宮城|秋田|山形|福島/], ['関東地方', /茨城|栃木|群馬|埼玉|千葉|東京|神奈川|山梨|長野/], ['北陸地方', /新潟|富山|石川|福井/], ['東海地方', /岐阜|静岡|愛知|三重/], ['近畿地方', /滋賀|京都|大阪|兵庫|奈良|和歌山/], ['中国地方', /鳥取|島根|岡山|広島|山口/], ['四国地方', /徳島|香川|愛媛|高知/], ['九州地方', /福岡|佐賀|長崎|熊本|大分|宮崎|鹿児島/], ['沖縄地方', /沖縄/]];
  function areaFromAddress(addr) {
    const s = String(addr || '').replace(/s+/g, '');
    if (!s) return null;
    const hit = AREA_CITY.find(x => x[1].test(s)) || AREA_PREF.find(x => x[1].test(s));
    if (!hit) return null;
    const row = (D.livingByArea && D.livingByArea.multi || []).find(x => x.a === hit[0]);
    return row ? { name: hit[0], v: row.ad } : null;
  }

  function statAt(y) { const c = D.incomeCurve; if (y <= c[0].age) return c[0].income; for (let i = 1; i < c.length; i++) { if (y <= c[i].age) { const p = c[i - 1], q = c[i]; return p.income + (q.income - p.income) * (y - p.age) / (q.age - p.age); } } return c[c.length - 1].income; }

  function calc(a, opts) {
    opts = opts || {};
    const age = ageFrom(a.dob) || 30;
    const yearsTo65 = Math.max(0, 65 - age);
    const kNew = kidsNew(a), kNow = kidsNow(a), kids = kNew + kNow;
    const couple = isCouple(a);
    const shareVal = couple ? ({ all: 1, more: 0.7, half: 0.5, less: 0.3 }[a.shareMode] || 1) : 1;
    const shareLabel = couple ? ({ all: 'ほぼ自分が全部', more: '自分が多め（7割）', half: '半々', less: '相手が多め（3割）' }[a.shareMode] || 'ほぼ自分が全部') : '一人で払う';
    const marryYearBase = (a.marital === '既婚' || a.household === '独身・同棲') ? age : (a.marryWish === 'yes' ? age + ({ '1〜2年以内': 2, '3〜5年以内': 4, '5年より先': 7 }[a.marryWhen] || 4) : 999);
    const marryYear = (opts.marryYear != null && marryYearBase !== 999 && a.marital !== '既婚' && a.household !== '独身・同棲') ? Number(opts.marryYear) : marryYearBase;
    const shortYearsBase = (a.leavePlan === '予定あり（1〜2年以内）' || a.leavePlan === '将来的に') ? 3 : 0;
    const shortYears = opts.shortYears != null ? opts.shortYears : shortYearsBase;
    const childStart0 = kNew ? (opts.childStart != null ? Number(opts.childStart) : age + ({ '1〜2年以内': 2, '3〜5年以内': 4, '5年より先': 7 }[a.childWhen] || 5)) : 999;
    const shortAt = y => { for (let k = 0; k < kNew; k++) { const st = childStart0 + k * 2; if (y >= st && y < st + shortYears) return true; } return false; };
    // 家計の分担：結婚後は回答の割合。産休育休で収入が落ちる年は、落ちた手取り比に自動調整（半々なら 0.625/(0.625+1)＝39%）
    const shareAuto = opts.shareAuto !== false;
    const shareAt = y => { if (!(couple && y >= marryYear)) return 1; if (shareAuto && shareVal < 1 && shortAt(y)) { const f = 1 - D.shortHoursCut; return shareVal * f / (shareVal * f + (1 - shareVal)); } return shareVal; };

    const homePrice = a.homeWish === 'yes' ? (D.housingBudgetMid[a.homeBudget || 'undecided'] || 3800) : 0;
    const homeYear = a.homeWish === 'yes' ? (opts.homeYear != null ? Number(opts.homeYear) : age + ({ '1〜2年以内': 2, '3〜5年以内': 4, '5年より先': 8 }[a.homeWhen] || 6)) : 999;
    const childStart = kNew ? (opts.childStart != null ? Number(opts.childStart) : age + ({ '1〜2年以内': 2, '3〜5年以内': 4, '5年より先': 7 }[a.childWhen] || 5)) : 999;
    // 車：購入・買い替えの年に一時支出。持っている人は今のローン返済も引く
    const carCycleY = D.carCycle[a.carCycle || 'none'] || 0;
    const carPrice = (a.carHave === 'yes' || a.carHave === 'plan') ? (D.carBudgetMid[a.carBudget || 'c300'] || 220) : 0;
    const carFirst = a.carHave === 'plan' ? age + ({ '1〜2年以内': 2, '3〜5年以内': 4, '5年より先': 7 }[a.carWantWhen] || 3) : (a.carHave === 'yes' && carCycleY ? age + carCycleY : 999);
    const carBuyYears = [];
    if (carPrice && carFirst !== 999) { for (let y = carFirst; y < 65; y += (carCycleY || 999)) { carBuyYears.push(y); if (!carCycleY) break; } }
    const carPayYears = { '現金で一括': 1, 'ローン（5年）': 5, 'ローン（7年）': 7 }[a.carPay] || 1; // 買い方：一括 or ローン年数で均等払い（金利なし）
    const carLoanYear = a.carHave === 'yes' ? Number(a.carLoanMonthly || 0) * 12 : 0;
    const carLoanUntil = a.carHave === 'yes' ? age + ({ '1年以内': 1, '2〜3年': 3, '4〜5年': 5, '6年以上': 7 }[a.carLoanLeft] || 0) : age;
    const tripYearHH = (D.tripCount[a.tripDomesticCount || 'n0'] || 0) * (D.tripDomesticMid[a.tripDomestic || 'none'] || 0) +
      (D.tripCount[a.tripAbroadCount || 'n0'] || 0) * (D.tripAbroadMid[a.tripAbroad || 'none'] || 0);
    const hobbyYear = (D.hobbyMonthlyMid[a.hobbyMonthly] || 0) * 12;

    // 一時支出
    const marryHH = (a.marital !== '既婚' && a.marryWish === 'yes') ? (D.weddingSelfMid[a.weddingPlan || 'undecided'] || 0) + 199 : 0;
    const marry = marryHH * (couple ? shareVal : 1);
    const birthHH = kNew * D.birthPerChild;
    let birth = birthHH * (couple ? shareVal : 1); let birthPaid = 0; // 実際の分担（産休育休の年は自動調整後）で年ごとに集計し直す
    const downPay = a.homeWish === 'yes' ? Math.min(homePrice, D.downPayMid[a.homeDown] != null ? D.downPayMid[a.homeDown] : Math.round(homePrice * 0.1)) : 0; // 頭金（設問。未回答なら10%）
    const homeUpHH = downPay; // 一時支出＝頭金のみ（諸費用はローンに組み込む・2026-09-13）
    const homeUp = Math.round(homeUpHH * shareAt(homeYear));
    const oneTime = marry + birth + homeUp;

    // 教育費：子の年齢ごとに段階別の年額（学校費＋塾・習い事の平均＋チェックした上乗せ−児童手当）
    const pathKey = D.eduPaths[a.eduPath] ? a.eduPath : 'undecided';
    const path = D.eduPaths[pathKey];
    const lessonSet = (a.lessons || []).filter(k => D.lessonSchedule[k] && k !== 'none');
    const useAverage = lessonSet.length === 0; // 何も選んでいない（or「特に決めていない」）なら平均の塾・習い事費
    const eduCostAt = ca => {  // ca = 子の年齢（0〜21）
      if (ca < 0 || ca > 21) return 0;
      const S = D.eduStages; let c = 0;
      if (ca <= 2) c += S.nursery.pub.school;
      else if (ca <= 5) { const v = S.kinder[path.kinder]; c += v.school + (useAverage ? v.extra : 0); }
      else if (ca <= 11) { const v = S.elem[path.elem]; c += v.school + (useAverage ? v.extra : 0); }
      else if (ca <= 14) { const v = S.junior[path.junior]; c += v.school + (useAverage ? v.extra : 0); }
      else if (ca <= 17) { const v = S.high[path.high]; c += v.school + (useAverage ? v.extra : 0); }
      else { c += S.univ[path.univ] + (a.uniLiving === 'alone' ? S.univ.aloneAdd : 0); }
      lessonSet.forEach(k => { const l = D.lessonSchedule[k];
        if (l.yearly && ca >= l.ages[0] && ca <= l.ages[1]) c += l.yearly;
        if (l.stages && ca >= l.ages[0] && ca <= l.ages[1]) c += ca <= 11 ? l.stages.elem : ca <= 14 ? l.stages.junior : l.stages.high;
        if (l.once) { const at = (k === 'exam' && path.junior === 'pri') ? l.atIfPriJunior : l.at; if (ca === at) c += l.once; } });
      if (ca <= 2) c -= D.childAllowanceYearly.under3; else if (ca <= 17) c -= D.childAllowanceYearly.upto17;
      return Math.max(0, c);
    };
    let eduPer = 0; for (let ca = 0; ca <= 21; ca++) eduPer += eduCostAt(ca);   // 子1人・0〜21歳の総額（世帯）
    const eduTotalHH = eduPer * kids;


    // 住まい
    const loanYearHH = Math.max(0, homePrice * (1 + D.housingFeeRate) - downPay) * 0.00283 * 12; // 借入＝（予算＋諸費用8%）−頭金、金利1%・35年
    const rentNetYear = (a.housing === '賃貸' || a.housing === '社宅・寮') ? Math.max(0, Number(a.housingCost || 0) - (D.subsidyMid[a.subsidy || 'none'] || 0)) * 12 : 0;

    // 収入
    const nightStopBase = { '35歳まで': 35, '40歳まで': 40, '45歳まで': 45, '50歳まで': 50, '55歳まで': 55 }[a.nightUntil] || (a.nightUntil === 'もう夜勤はしていない' ? age : 60);
    const nightStop = opts.nightStop != null ? opts.nightStop : nightStopBase;
    const incomeNow = D.incomeMid[a.income] || 475;
    const NET = 0.77;
    const alreadyDayOnly = a.shift === '日勤のみ' || a.nightUntil === 'もう夜勤はしていない';
    // 年収の土台：フルタイムで働き続けた場合の伸び率（D.wageGrowth・年齢帯ごとの年率）を今の年収に複利で掛ける。統計の年齢カーブ（横断面・産休や時短の混在で凹む）は個人には使わない。60歳以降は再雇用カーブ（59歳比）で下げる。転職ありなら−5%
    const growthAt = t => { const g = D.wageGrowth.find(w => t <= w.until); return g ? g.rate : 0; };
    const baseCache = {};
    const baseAt = y => {
      if (baseCache[y] != null) return baseCache[y];
      let v = incomeNow;
      if (age >= 60) v *= statAt(y) / statAt(age);
      else { for (let t = age + 1; t <= Math.min(y, 59); t++) v *= 1 + growthAt(t); if (y >= 60) v *= statAt(y) / statAt(59); }
      baseCache[y] = v; return v;
    };
    const incomeAt = y => {
      let inc = baseAt(y);
      if (!alreadyDayOnly && y >= nightStop) inc *= (1 - D.dayOnlyCut);
      if (shortAt(y)) inc *= (1 - D.shortHoursCut);
      return inc;
    };
    // 結婚後の一人あたり生活費（統計・住居と教養娯楽を除く・万円/年）。住所（なければ勤務先の住所）からエリアを判定して参考表の値を初期値に。判定できなければ全国。面談パネルで上書き可
    const livingArea = areaFromAddress(a.address) || areaFromAddress(a.employerAddr);
    const livStatYear = (opts.livingStat != null ? Number(opts.livingStat) : (livingArea ? livingArea.v : D.livingStatSingle)) * 12;
    const netNow = (D.incomeMid[a.income] || 475) * NET;
    const savingNow = (D.savingMonthlyMid[a.savingMonthly || 's0'] || 0) * 12;
    const tripYearNow = tripYearHH * shareAt(age);
    const living = Math.max(netNow * 0.4, netNow - savingNow - tripYearNow - hobbyYear);
    const livingRate = living / netNow;

    // 年ごとの収支
    const rows = [];
    // 余ったお金のうち貯まる割合（既定0＝余りは使ってしまう・貯まるのは回答の貯金ペースだけ）。面談パネルで0/0.5/1
    const keepRate = opts.surplusKeep != null ? Number(opts.surplusKeep) : 0;
    let leaked = 0;
    let tripHHPaid = 0;
    let netIn = 0, livingPaid = 0, tripPaid = 0, hobbyPaid = 0, loanPaid = 0, eduPaid = 0, carPaid = 0, savedByYear = 0, incomeLost = 0, rentIn = 0, investPaid = 0;
    const now = Number(a.savings || 0) + Number(a.investAssets || 0);
    const debt = a.debtHas === 'yes' ? Number(a.debtTotal || 0) : 0; // 「借入なし」なら以前入力した残高が残っていても無視
    // 退職金
    const yearsNow = { '1年未満': 0.5, '1〜2年': 1.5, '3〜5年': 4, '6〜9年': 7.5, '10〜14年': 12, '15〜19年': 17, '20年以上': 22 }[a.years] || 0;
    const stopAge = { '55歳まで': 55, '60歳まで': 60, '65歳まで': 65, '70歳まで': 70, '働ける限り': 65 }[a.workUntil] || 60;
    const fullTime = /常勤/.test(a.employ || '');
    const jobChange = opts.jobChange != null ? !!opts.jobChange : a.jobChange === '予定あり（1年以内）';
    const jobYear = jobChange ? (opts.jobYear != null ? Number(opts.jobYear) : age + 1) : 999;   // 転職の年齢（既定：来年）
    // 勤続：転職ありなら転職の年から60歳までだけ数える（転職前の分は退職金に入れない）。年収は転職で変えない
    const tenure = fullTime && stopAge >= 60 ? (jobChange ? Math.max(0, 60 - jobYear) : yearsNow + Math.max(0, 60 - age)) : 0;
    const monthlyPay60 = baseAt(58) / 12 * 0.84;
    const sevMonths = tenure >= 30 ? 24 : tenure >= 20 ? 14 : tenure >= 10 ? 8 : tenure >= 5 ? 2.5 : 0;
    const severance = Math.round(monthlyPay60 * sevMonths);
    // 退職金の税金：退職所得控除（勤続20年以下 40万×年[最低80万]・20年超 800万＋70万×(年−20)）→ 超えた分の1/2に所得税（速算表×復興税1.021）＋住民税10%。看護師の勤続なら大半は控除内で税0
    const sevYears = Math.max(1, Math.ceil(tenure));
    const sevDeduct = sevYears <= 20 ? Math.max(80, 40 * sevYears) : 800 + 70 * (sevYears - 20);
    const sevTaxable = Math.max(0, severance - sevDeduct) / 2;
    const incomeTaxOn = t => { const b = [[195, 0.05, 0], [330, 0.10, 9.75], [695, 0.20, 42.75], [900, 0.23, 63.6], [1800, 0.33, 153.6], [4000, 0.40, 279.6], [Infinity, 0.45, 479.6]]; const r = b.find(x => t <= x[0]); return (t * r[1] - r[2]) * 1.021; };
    const severanceTax = sevTaxable > 0 ? Math.round(incomeTaxOn(sevTaxable) + sevTaxable * 0.10) : 0;
    const severanceNet = severance - severanceTax;

    let balance = now - debt;
    let investValue = 0;
    // 30〜64歳は給料の年、65歳の行は「退職金を受け取る年」（年収欄＝退職金の額面・手取り欄＝税引後。生活費などの支出はその年分をそのまま引く。貯金ペースは積まず、余りは全額残高へ）
    for (let y = age; y <= 65; y++) {
      const sh = shareAt(y);
      const retireYear = y === 65;
      const inc = retireYear ? severance : incomeAt(y); let net = retireYear ? severanceNet : inc * NET;
      let rent = 0; if (opts.rent && opts.rent.monthly && y >= (opts.rent.from || age)) { rent = opts.rent.monthly * 12; rentIn += rent; }
      if (!retireYear) { netIn += net; incomeLost += Math.max(0, baseAt(y) - inc) * NET; }
      // 生活費：半分は固定（家賃・光熱・保険など）、半分は手取りに連動
      // 生活費：一人の生活費を基準に、世帯なら×1.9、同居の子1人につき＋0.2（食費・日用品・医療など教育費に入らない分）。その世帯生活費を家計の分担で分ける。年収には連動させない。購入後は今の家賃分（分担後）を引く
      const partnerHere = couple && y >= marryYear;
      let kidsHome = 0;
      for (let k = 0; k < kNew; k++) { const ca = y - (childStart + k * 2); if (ca >= 0 && ca <= 21) kidsHome++; }
      for (let k = 1; k <= kNow; k++) { const ca = Number(a['childAge' + k] || 0) + (y - age); if (ca >= 0 && ca <= 21) kidsHome++; }
      const hhFactor = (partnerHere ? (opts.hhCouple != null ? Number(opts.hhCouple) : D.hhCouple) : 1.0) + (opts.hhChild != null ? Number(opts.hhChild) : 0.2) * kidsHome;
      // 結婚まで＝今の使い残し（購入後は家賃分を落とす）／結婚後＝統計の一人あたり生活費×世帯倍率＋今の家賃（購入まで）を分担で割る
      let liv;
      if (partnerHere) { liv = (livStatYear * hhFactor + (y < homeYear ? rentNetYear : 0)) * sh; }
      else { liv = living * hhFactor * sh; if (y >= homeYear) liv = Math.max(0, liv - rentNetYear * sh); }
      livingPaid += liv;
      // 旅行：1回の予算は本人1人分なので、人数で膨らませてから分担（結婚後は2人分＋同居の子1人につき0.5人分・子は独立で戻る）
      const tripFactor = (partnerHere ? 2 : 1) + 0.5 * kidsHome;
      const tripHH = tripYearHH * tripFactor; tripHHPaid += tripHH;
      const trip = tripHH * sh; tripPaid += trip;
      // 自分のために使うお金（趣味・推し活・美容など）：年収と同じ割合で増減。分担しない
      const hobby = hobbyYear * ((retireYear ? incomeAt(64) * NET : net) / netNow); hobbyPaid += hobby;
      const loan = y >= homeYear ? loanYearHH * sh : 0; loanPaid += loan;
      let kidsInSchool = 0, eduHH = 0;
      for (let k = 0; k < kNew; k++) { const ca = y - (childStart + k * 2); if (ca >= 0 && ca <= 21) { kidsInSchool++; eduHH += eduCostAt(ca); } }
      for (let k = 1; k <= kNow; k++) { const ca = Number(a['childAge' + k] || 0) + (y - age); if (ca >= 0 && ca <= 21) { kidsInSchool++; eduHH += eduCostAt(ca); } }
      const edu = eduHH * sh; eduPaid += edu;
      let car = 0;
      if (carLoanYear && y < carLoanUntil && y < carFirst) car += carLoanYear;
      carBuyYears.forEach(by => { if (y >= by && y < by + carPayYears) car += carPrice / carPayYears * sh; });
      carPaid += car;
      // 一時支出（発生年）
      let once = 0; const ev = [];
      if (marry && y === marryYear) { once += marry; ev.push('結婚'); }
      for (let k = 0; k < kNew; k++) { if (y === childStart + k * 2) { once += D.birthPerChild * sh; birthPaid += D.birthPerChild * sh; ev.push('出産'); } }
      if (homeUp && y === homeYear) { once += homeUp; ev.push('マイホーム'); }
      if (!alreadyDayOnly && y === nightStop && nightStop < 65) ev.push('夜勤をやめる');
      if (carBuyYears.indexOf(y) >= 0) ev.push(a.carHave === 'plan' && y === carFirst ? '車を買う' : '車の買い替え');
      // 積立（面談用レバー）
      let inv = 0;
      if (opts.invest && opts.invest.monthly && y >= (opts.invest.from || age)) { inv = opts.invest.monthly * 12; investPaid += inv; investValue = (investValue + inv) * (1 + (opts.invest.rate || 0) / 100); }
      // 貯金：回答の貯金ペース（月額×12）を固定で積み、年間収支は「その貯金を続けた上での余り／不足」
      const save = retireYear ? 0 : savingNow;
      if (retireYear) ev.push(severanceTax ? '退職金（税引後）' : '退職金');
      if (jobChange && y === jobYear && y < 65) ev.push('転職');
      const flow = net + rent - liv - trip - hobby - loan - edu - car - once - inv - save;
      const leak = (!retireYear && flow > 0) ? flow * (1 - keepRate) : 0; leaked += leak;   // 余った年の「使途未定」（残高に足さない分）
      savedByYear += save + flow - leak;
      balance += save + flow - leak;
      rows.push({ age: y, income: inc, net: net, rent: rent, living: liv, trip: trip, hobby: hobby, loan: loan, edu: edu, car: car, once: once, surplus: flow + save, saving: Math.min(save, Math.max(0, flow + save)), leak: leak, invest: inv, investValue: investValue, flow: flow, cash: balance, balance: balance + investValue, kids: kidsInSchool, events: ev });
    }

    if (kNew) birth = birthPaid;

    const totalIn = netIn + rentIn + now + severanceNet;
    const bigPersonal = marry + birth + homeUp + loanPaid + eduPaid + carPaid;
    const totalOut = livingPaid + tripPaid + hobbyPaid + bigPersonal + debt + leaked;
    const at65raw = balance + investPaid;   // 65歳の行（退職金の手取り−その年の支出）まで積んだ現金＋積立に回した元本（積立の増減は investValue で反映）
    const at65 = Math.max(0, at65raw - investPaid + investValue);

    // 老後
    const avgIncomeForPension = Math.min(780, incomeNow * (alreadyDayOnly ? 1 : 0.93));
    const pensionFull = Math.round((avgIncomeForPension * 0.005481 * 40 / 12 + 7.06) * 10) / 10;   // 今の制度どおりの目安
    const pensionLevel = opts.pensionLevel != null ? Number(opts.pensionLevel) : D.pensionLevel;      // 将来の給付水準（既定0.8）
    const pension = Math.round(pensionFull * pensionLevel * 10) / 10;
    const livingRetire = D.retireLivingMid[a.retireLiving || 'r20'] || 20;
    // 老後：希望の月額は世帯の額として、結婚後の分担割合をかけた本人負担分から本人の年金を引く。介護は本人分
    const retireShare = couple ? shareVal : 1;
    const retireNeed = Math.max(0, Math.round(Math.max(0, livingRetire * retireShare - pension) * 12 * 25 + D.careCost));
    const gap = at65 - retireNeed;
    const verdict = gap >= 300 ? 'ok' : gap >= -300 ? 'tight' : 'short';
    const bigHH = marryHH + birthHH + eduTotalHH + homeUpHH + carBuyYears.length * carPrice + Math.round(tripHHPaid) + Math.round(hobbyYear * yearsTo65);

    return { savingYear: savingNow, jobChange, jobYear, severanceTax, severanceNet, sevMonths, monthlyPay60: Math.round(monthlyPay60 * 10) / 10, sevDeduct, yearsNow, stopAge, fullTime, leaked, keepRate, pensionFull, pensionLevel, livingArea: livingArea ? livingArea.name : null, livingStat: Math.round(livStatYear / 12 * 10) / 10, shareAuto, age, yearsTo65, kids, kNew, couple, shareVal, shareLabel, marryYear, marry, birth, homeUp, oneTime, eduTotalHH, eduPaid, carPaid, tripPaid, hobbyPaid, loanPaid, livingPaid, livingRate, livingNow: living, rentNetYear, incomeNow, netIn, rentIn, incomeLost, now, savedByYear, severance, tenure, debt, totalIn, totalOut, bigPersonal, bigHH, at65raw, at65, investPaid, investValue, pension, living: livingRetire, retireShare, retireNeed, gap, verdict, nightStop, homeYear, childStart, carBuyYears, downPay, loanYearHH, rows };
  }

  window.LP_CALC = { calc, ageFrom, kidsNew, kidsNow, isCouple, statAt, areaFromAddress };
})();
