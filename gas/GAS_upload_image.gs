const FOLDER_ID = 'ここにGoogle Driveの保存先フォルダIDを入力';

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function doOptions(e) {
  return createResponse({ status: "ok" });
}

function doGet(e) {
  return createResponse({ status: 'ok', message: '画像アップロードAPIが正常に動作しています', timestamp: new Date().toISOString() });
}

function doPost(e) {
  try {
    if (!e.parameter || !e.parameter.filename) {
      return createResponse({ success: false, error: 'filename パラメータが必要です' });
    }
    if (!e.postData || !e.postData.contents) {
      return createResponse({ success: false, error: '画像データがありません' });
    }

    const filename = e.parameter.filename;
    const contentType = e.parameter.contentType || 'image/jpeg';
    const base64Data = e.postData.contents;
    const imageBlob = Utilities.newBlob(Utilities.base64Decode(base64Data), contentType, filename);

    const folder = DriveApp.getFolderById(FOLDER_ID);
    const file = folder.createFile(imageBlob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const imageUrl = `https://drive.google.com/uc?id=${file.getId()}&export=view`;

    return createResponse({ success: true, imageUrl: imageUrl, filename: filename, fileId: file.getId() });
  } catch (error) {
    return createResponse({ success: false, error: error.toString() });
  }
}