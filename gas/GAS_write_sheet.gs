const SPREADSHEET_ID = 'ここにスプレッドシートIDを入力';
const NOTIFICATION_EMAIL = 'ここに通知先メールアドレスを入力';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    const required = ['reporter', 'ship_no', 'block', 'content'];
    for (const key of required) {
      if (!data[key]) {
        return createJSONResponse({ success: false, error: `必須フィールド「${key}」がありません` }, 400);
      }
    }

    const now = new Date();
    const formattedDate = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();

    let imageFormulas = ['', ''];
    if (data.image_url) {
      const urls = data.image_url.split(',').map(s => s.trim()).filter(Boolean);
      for (let i = 0; i < Math.min(urls.length, 2); i++) {
        imageFormulas[i] = `=HYPERLINK("${urls[i]}", "画像${i+1}を表示")`;
      }
    }

    const newRow = [
      formattedDate,
      data.reporter,
      data.ship_no,
      data.block,
      data.content,
      imageFormulas[0],
      imageFormulas[1],
      '',
      '',
      ''
    ];

    sheet.appendRow(newRow);

    sendNotificationEmail(data, formattedDate, imageFormulas);

    return createJSONResponse({ success: true, message: '✅ レポートが保存され、メール通知が送信されました。', timestamp: formattedDate });

  } catch (err) {
    return createJSONResponse({ success: false, error: err.toString() }, 500);
  }
}

function sendNotificationEmail(data, formattedDate, imageFormulas) {
  const subject = '【現場ボイス】新しい報告が届きました';
  const body =
    '◆◆◆◆◆ 現場からの報告が届きました ◆◆◆◆◆\n' +
    `■ 日時: ${formattedDate}\n` +
    `■ 報告者: ${data.reporter}\n` +
    `■ 船体番号: ${data.ship_no}\n` +
    `■ ブロック名: ${data.block}\n` +
    `■ 内容: ${data.content}\n` +
    (imageFormulas[0] ? `■ 画像1: ${data.image_url.split(',')[0]}\n` : '') +
    (imageFormulas[1] ? `■ 画像2: ${data.image_url.split(',')[1]}\n` : '') +
    '\n---\n詳細はGoogle Sheetsにて確認・更新してください。\n';

  MailApp.sendEmail({
    to: NOTIFICATION_EMAIL,
    subject: subject,
    body: body,
    name: '現場ボイス'
  });
}

function createJSONResponse(obj, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}