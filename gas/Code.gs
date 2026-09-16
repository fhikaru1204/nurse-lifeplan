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
      '判定', '入るお金', '出ていくお金', '65歳に残る見込', '老後必要額', '差額', 'UA'
    ];
    if (sh.getLastRow() === 0) sh.appendRow(cols);
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
      c.verdict, c.totalIn, c.totalOut, c.at65, c.retireNeed, c.gap, body.ua
    ];
    sh.appendRow(row);
    // 生JSONも別シートに保存（面談時の詳細確認用）
    let raw = ss.getSheetByName('raw'); if (!raw) raw = ss.insertSheet('raw');
    raw.appendRow([new Date(), j(a.name), e.postData.contents]);

    MailApp.sendEmail({
      to: NOTIFY_TO,
      subject: '【LP試算】' + j(a.name) + ' さん（' + c.age + '歳・判定 ' + c.verdict + '）',
      body: [
        '新しい回答が届きました。',
        '氏名：' + j(a.name) + '（' + c.age + '歳）',
        '勤務先：' + j(a.employer) + ' / ' + j(a.employ) + ' / ' + j(a.shift) + ' / 年収 ' + j(a.income),
        '判定：' + c.verdict + '  大きなお金 ' + c.bigTotal + '万 / 65歳に残る ' + c.at65 + '万 / 老後必要 ' + c.retireNeed + '万',
        '不安：' + j(a.worries),
        '連絡：' + j(a.contact) + ' / ' + j(a.slot),
        '聞きたいこと：' + j(a.askTopics) + (a.askOther ? '（' + j(a.askOther) + '）' : ''),
        '',
        '面談用ページ（このリンクを開くと詳細が出ます）：',
        ADMIN_URL + '#d=' + Utilities.base64EncodeWebSafe(Utilities.newBlob(e.postData.contents).getBytes()),
        '',
        'スプレッドシート：https://docs.google.com/spreadsheets/d/' + SHEET_ID
      ].join('\n')
    });
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() { return ContentService.createTextOutput('ok'); }
