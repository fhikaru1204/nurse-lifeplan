// 公開前に設定する（このファイルだけ書き換えればよい）
window.LP_CONFIG = {
  // Google Apps Script のウェブアプリURL（gas/Code.gs をデプロイして得られる /exec のURL）
  endpoint: 'https://script.google.com/macros/s/AKfycbxp92vm0LjIBjO2_s79RZGDotHS5H9ieycm3giQZEqh3R7McyxXrjMG1A2ShJaIhP072Q/exec', // 入口の計測（GAS を log 対応版に貼り直してから true にする・旧 GAS だと空の回答＋通知メールになる）
  track: true,
  // 送信後に戻す公式LINEのURL（例：https://lin.ee/xxxxx）
  lineUrl: 'https://lin.ee/U1ogOJR', // 2026-10-31 公式「友だち追加ボタン」の URL に変更（旧 Y1oTssY と同じ @ops0964s）
  // 再試算コード（2026-10-31 光さん決定・固定・公式LINEのあいさつメッセージで渡す）。結果ページの「コードをお持ちの方はこちら」に入れると回答を残したままやり直せる
  retryCode: '0626'
};
