/**
 * 看護師ライフプラン試算 受け口（Google Apps Script）
 * 手順：
 *  1. Googleスプレッドシートを新規作成（名前は任意・例「LP回答」）
 *  2. 拡張機能 → Apps Script → このコードを貼る → SHEET_ID と NOTIFY_TO を書き換える
 *  3. デプロイ → 新しいデプロイ → 種類「ウェブアプリ」→ 実行ユーザー「自分」・アクセス「全員」→ デプロイ
 *  4. 出てきた /exec のURLを lifeplan/config.js の endpoint に貼る
 */
const SHEET_ID = 'ここにスプレッドシートIDを貼る';
const SHEET_NAME = '回答';
const NOTIFY_TO = 'h-fujita@alt-llc.jp';
const ADMIN_URL = 'https://plan.alt-llc.jp/admin.html'; // 面談用ページ（公開後のURLに合わせる）

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    // 入口の計測（app.js の track）：log シートに 1 行追記して終了（回答ではない）
    if (body.event) {
      const ss0 = SpreadsheetApp.openById(SHEET_ID);
      let lg = ss0.getSheetByName('log'); if (!lg) { lg = ss0.insertSheet('log'); lg.appendRow(['受信日時', 'sid', 'event', 'page', 'pageId', 'referrer', 'UA']); }
      lg.appendRow([new Date(), String(body.sid || ''), String(body.event), body.page == null ? '' : Number(body.page), String(body.id || ''), String(body.ref || ''), String(body.ua || '')]);
      return ContentService.createTextOutput(JSON.stringify({ ok: true, logged: true })).setMimeType(ContentService.MimeType.JSON);
    }
    // 任意の連絡先（結果ページから別送・2026-10-31）：同じ sid の回答行（最新）に電話・メールを書き、通知メールを出す。行が見つからなければ末尾に氏名＋連絡先だけの行を足す
    if (body.kind === 'contact') {
      const ss1 = SpreadsheetApp.openById(SHEET_ID);
      const sh1 = ss1.getSheetByName(SHEET_NAME);
      const COL_SID = 83, COL_PHONE = 85, COL_MAIL = 86; // 1始まり：sid=83・再試算=84・電話=85・メール=86（cols の並びと合わせる）
      let hit = 0;
      if (sh1 && sh1.getLastRow() >= 2 && body.sid) {
        const sids = sh1.getRange(2, COL_SID, sh1.getLastRow() - 1, 1).getValues();
        for (let i = sids.length - 1; i >= 0; i--) { if (String(sids[i][0]) === String(body.sid)) { hit = i + 2; break; } }
      }
      if (hit) { sh1.getRange(hit, COL_PHONE, 1, 2).setValues([[String(body.phone || ''), String(body.email || '')]]); }
      else if (sh1) { const r2 = []; for (let k = 0; k < COL_MAIL; k++) r2[k] = ''; r2[0] = new Date(); r2[1] = String(body.name || ''); r2[COL_SID - 1] = String(body.sid || ''); r2[COL_PHONE - 1] = String(body.phone || ''); r2[COL_MAIL - 1] = String(body.email || ''); sh1.appendRow(r2); }
      MailApp.sendEmail({ to: NOTIFY_TO, subject: '【LP試算・連絡先】' + String(body.name || '') + ' さん（藤田から連絡する約束）', body: ['結果ページの任意欄から連絡先が届きました。', '氏名：' + String(body.name || ''), '電話：' + String(body.phone || ''), 'メール：' + String(body.email || ''), (hit ? '回答シートの ' + hit + ' 行目に書きました' : '同じ sid の回答行が見つからず、末尾に連絡先だけの行を足しました'), '', 'スプレッドシート：https://docs.google.com/spreadsheets/d/' + SHEET_ID].join(String.fromCharCode(10)) });
      return ContentService.createTextOutput(JSON.stringify({ ok: true, contact: true, row: hit })).setMimeType(ContentService.MimeType.JSON);
    }
    const a = body.answers || {};
    const c = body.calc || {};
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sh = ss.getSheetByName(SHEET_NAME);
    if (!sh) sh = ss.insertSheet(SHEET_NAME);
    const cols = [
      '受信日時', '氏名', '生年月日', '年齢', '住所', '勤務先', '勤務先住所', '雇用形態', '勤続', '経験年数', '年収', '役職', '勤務形態', '夜勤回数', '住まい', '家賃/ローン月額', '家賃補助', '世帯',
      '婚姻', '結婚希望', '結婚時期', '式イメージ', 'パートナー年収', '家計の分担',
      '子ども現在', '子ども年齢', '子ども希望', '希望人数', '時期', '進路', '大学', '育て方',
      'マイホーム', '種類', '時期', '予算', '頭金',
      '国内旅行回数', '国内予算', '海外旅行回数', '海外予算', '車', '車いつ', '車ローン月', '車ローン残', '買替', '車予算', '車の払い方', '趣味月額',
      '夜勤何歳まで', '何歳まで働く', '転職', '産休育休', '働き方', '介護',
      '借入有無', '借入種類', '借入残高', '月返済', '預貯金', 'その他資産', '資産形成', 'その他内容', '毎月貯金', '保険', '保険料', '不安', '自由記述',
      '老後スタイル', '老後一言', '老後生活費', '連絡方法', '時間帯', '聞きたいこと', '聞きたいこと詳細',
      '判定', '入るお金', '出ていくお金', '65歳に残る見込', '老後必要額', '差額', 'UA', 'sid',
      '再試算', '電話', 'メール' // 2026-10-31 追加（末尾）：再試算＝LINE のコードでやり直した回数（0＝初回）・電話/メール＝結果ページの任意欄
    ];
    if (sh.getLastRow() === 0) sh.appendRow(cols);
    else if (String(sh.getRange(1, cols.length).getValue()) !== cols[cols.length - 1]) sh.getRange(1, cols.length - 2, 1, 3).setValues([cols.slice(-3)]); // 既存シートに新しい3列の見出しを足す
    const j = v => Array.isArray(v) ? v.join('、') : (v == null ? '' : v);
    const row = [
      new Date(), j(a.name), j(a.dob), c.age, j(a.address), j(a.employer), j(a.employerAddr), j(a.employ), j(a.years), j(a.totalYears), j(a.income), j(a.role), j(a.shift), j(a.nights), j(a.housing), j(a.housingCost), j(a.subsidy), j(a.household),
      j(a.marital), j(a.marryWish), j(a.marryWhen), j(a.weddingPlan), j(a.partnerIncome), j(a.shareMode),
      j(a.childNow), [a.childAge1, a.childAge2, a.childAge3].filter(function (x) { return x !== undefined && x !== ''; }).join('、'), j(a.childWish), j(a.childNum), j(a.childWhen), j(a.eduPath), j(a.uniLiving), j(a.lessons),
      j(a.homeWish), j(a.homeType), j(a.homeWhen), j(a.homeBudget), j(a.homeDown),
      j(a.tripDomesticCount), j(a.tripDomestic), j(a.tripAbroadCount), j(a.tripAbroad), j(a.carHave), j(a.carWantWhen), j(a.carLoanMonthly), j(a.carLoanLeft), j(a.carCycle), j(a.carBudget), j(a.carPay), j(a.hobbyMonthly),
      j(a.nightUntil), j(a.workUntil), j(a.jobChange), j(a.leavePlan), j(a.workStyle), j(a.care),
      j(a.debtHas), j(a.debtType), j(a.debtTotal), j(a.debtMonthly), j(a.savings), j(a.investAssets), j(a.assets), j(a.assetsOther), j(a.savingMonthly), j(a.insurance), j(a.insuranceMonthly), j(a.worries), j(a.worryText),
      j(a.retireStyle), j(a.retireText), j(a.retireLiving), j(a.contact), j(a.slot), j(a.askTopics), j(a.askOther),
      c.verdict, c.totalIn, c.totalOut, c.at65, c.retireNeed, c.gap, body.ua, String(body.sid || ''),
      Number(body.retry || 0), j(a.phone), j(a.email)
    ];
    // 1人1回の補強：同じ氏名＋生年月日の過去の送信を数える（拒否はせず、通知メールに出す）
    const norm = v => String(v == null ? '' : v).split(' ').join('').split('　').join('');
    const dobStr = v => (v instanceof Date) ? Utilities.formatDate(v, 'Asia/Tokyo', 'yyyy-MM-dd') : String(v == null ? '' : v).slice(0, 10);
    let prior = 0, firstAt = '';
    const last = sh.getLastRow();
    if (last >= 2 && a.name && a.dob) {
      const vals = sh.getRange(2, 1, last - 1, 3).getValues(); // 受信日時・氏名・生年月日
      vals.forEach(function (v) { if (norm(v[1]) === norm(a.name) && dobStr(v[2]) === dobStr(a.dob)) { prior++; if (!firstAt) firstAt = (v[0] instanceof Date) ? Utilities.formatDate(v[0], 'Asia/Tokyo', 'yyyy-MM-dd HH:mm') : String(v[0]); } });
    }
    sh.appendRow(row);
    // 生JSONも別シートに保存（面談時の詳細確認用）
    let raw = ss.getSheetByName('raw'); if (!raw) raw = ss.insertSheet('raw');
    raw.appendRow([new Date(), j(a.name), e.postData.contents, (prior + 1) + '回目']);

    const adminLink = ADMIN_URL + '#d=' + Utilities.base64EncodeWebSafe(Utilities.newBlob(e.postData.contents).getBytes());
    const lines = [
      (Number(body.retry || 0) > 0 ? '🔁 LINE のコードで再試算した回答です（' + body.retry + ' 回目のやり直し）' : (prior > 0 ? '⚠ 同じ氏名・生年月日の送信が過去に ' + prior + ' 件あります（今回が ' + (prior + 1) + ' 回目・初回 ' + firstAt + '）' : '新しい回答が届きました。')),
      '氏名：' + j(a.name) + '（' + c.age + '歳）',
      '勤務先：' + j(a.employer) + ' / ' + j(a.employ) + ' / ' + j(a.shift) + ' / 年収 ' + ({i300:'300万未満',i350:'300〜349万',i400:'350〜399万',i450:'400〜449万',i500:'450〜499万',i550:'500〜549万',i600:'550〜599万',i700:'600〜699万',i800:'700〜799万',i1000:'800〜999万',i1000p:'1,000万以上'}[a.income] || j(a.income)),
      '判定：' + c.verdict + '  大きなお金 ' + (c.bigPersonal != null ? c.bigPersonal : c.bigTotal) + '万 / 65歳に残る ' + c.at65 + '万 / 老後必要 ' + c.retireNeed + '万',
      '不安：' + j(a.worries),
      '連絡：' + j(a.contact) + ' / ' + j(a.slot),
      '聞きたいこと：' + j(a.askTopics) + (a.askOther ? '（' + j(a.askOther) + '）' : ''),
      '',
      '面談用ページ（このリンクを開くと詳細が出ます）：',
      adminLink,
      '',
      'スプレッドシート：https://docs.google.com/spreadsheets/d/' + SHEET_ID
    ];
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    // HTML本文：長いリンクを <a> にして途中で切れないようにする（プレーンテキストだとメールソフトで分断されることがある）
    const html = '<div style="font-family:sans-serif;font-size:14px;line-height:1.7">' +
      lines.filter(l => l !== adminLink && l.indexOf('面談用ページ') !== 0 && l.indexOf('スプレッドシート') !== 0).map(l => esc(l)).join('<br>') + '<br><br>' +
      '<a href="' + esc(adminLink) + '" style="display:inline-block;background:#2269a0;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">面談用ページを開く</a><br><br>' +
      '<a href="https://docs.google.com/spreadsheets/d/' + SHEET_ID + '">スプレッドシートを開く</a>' +
      '</div>';
    MailApp.sendEmail({
      to: NOTIFY_TO,
      subject: (Number(body.retry || 0) > 0 ? '【LP試算・再試算】' : prior > 0 ? '【LP試算・' + (prior + 1) + '回目】' : '【LP試算】') + j(a.name) + ' さん（' + c.age + '歳・判定 ' + c.verdict + '）',
      body: lines.join('\n'),
      htmlBody: html
    });
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() { return ContentService.createTextOutput('ok'); }
