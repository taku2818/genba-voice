// 現場ボイス アプリケーション
console.log('【基本デバッグ】app.js 読み込み開始');
document.addEventListener('DOMContentLoaded', () => {
  console.log('【基本デバッグ】DOMContentLoaded イベント発火');
  // DOM要素
  const loginScreen = document.getElementById('login-screen');
  const feedScreen = document.getElementById('feed-screen');
  const recordDetailScreen = document.getElementById('record-detail-screen');
  const loginBtn = document.getElementById('login-btn');
  const usernameInput = document.getElementById('username');
  const reporterDisplay = document.getElementById('reporter');
  const recordBtn = document.getElementById('record-btn');
  const statusDisplay = document.getElementById('status');
  const submitStatus = document.getElementById('submit-status');
  const summaryDisplay = document.getElementById('summary');
  const blockCandidate = document.getElementById('block-candidate');
  const blockInput = document.getElementById('block-input');
  const shipInput = document.getElementById('ship-input');
  const recentShipsContainer = document.getElementById('recent-ships-container');
  const reportContainer = document.getElementById('report-container');
  const submitBtn = document.getElementById('submit-btn');
  console.log('【基本デバッグ】submitBtn要素:', submitBtn);
  const cancelBtn = document.getElementById('cancel-btn');
  const backBtn = document.getElementById('back-btn');
  const downloadBtn = document.getElementById('download-btn');

  // CSVデータを保持する配列
  let csvData = [];

  // 状態管理
  let mediaRecorder;
  let audioChunks = [];
  let username = '';
  let selectedShip = '';
  let blockList = [];

  // 画面切り替え関数
  function showScreen(screen) {
    loginScreen.classList.add('hidden');
    feedScreen.classList.add('hidden');
    recordDetailScreen.classList.add('hidden');

    screen.classList.remove('hidden');
  }

  // ログイン処理
  loginBtn.addEventListener('click', () => {
    username = usernameInput.value.trim();
    if (username) {
      reporterDisplay.textContent = username;
      
      // ログイン成功時に船体番号を読み込む
      loadRecentShips();
      loadBlockList();
      
      // フィード画面を表示
      showScreen(feedScreen);
    } else {
      alert('名前を入力してください');
    }
  });
  
  // 初期表示はログイン画面
  showScreen(loginScreen);

  // 最近の船体番号を読み込む
  async function loadRecentShips() {
    try {
      console.log('船体番号読み込み開始 - APIオブジェクト確認:', typeof window.API);
      // 必ずwindow経由で参照
      const data = await window.API.get('/api/recent-ships');

      recentShipsContainer.innerHTML = '';
      data.ships.forEach(ship => {
        const shipBtn = document.createElement('div');
        shipBtn.classList.add('ship-btn');
        shipBtn.textContent = ship;
        shipBtn.addEventListener('click', () => {
          document.querySelectorAll('.ship-btn').forEach(btn => btn.classList.remove('selected'));
          shipBtn.classList.add('selected');
          shipInput.value = ship;
          selectedShip = ship;
        });
        recentShipsContainer.appendChild(shipBtn);
      });
    } catch (error) {
      console.error('船体番号取得エラー:', error);
    }
  }

  // ブロックリストを読み込む
  async function loadBlockList() {
    try {
      console.log('ブロックリスト読み込み開始');
      // 削除されたAPIエンドポイントの呼び出しを削除
      // const data = await window.API.get('/api/blocks');
      // blockList = data.blocks;

      // 完全なブロックリストを使用
      if (window.COMPLETE_BLOCK_LIST && window.COMPLETE_BLOCK_LIST.length > 0) {
        console.log('メインスクリプトから完全なブロックリストを使用します');
        blockList = window.COMPLETE_BLOCK_LIST;
      } else {
        // 復元のため、より充実したブロックリストを使用
        blockList = [
          "BAA", "BOA", "BAF", "BOF", "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9", "B10", "B11", "B12",
          "SA1", "SA1A", "SA1F", "SA2", "SA2C", "SA3", "SA3C",
          "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10", "S11", "S12", "S13",
          "AP1", "AP2", "AH2", "AH3", "L1", "L2", "D1", "D2"
        ];
      }
      console.log('読み込みが完了したブロックリスト:', blockList.length, '個のブロック名');
    } catch (error) {
      console.error('ブロックリスト取得エラー:', error);
    }
  }

  // 録音ボタンのイベントリスナー
  recordBtn.addEventListener('click', async () => {
    selectedShip = shipInput.value.trim();
    if (!selectedShip) {
      alert('船体番号を入力または選択してください');
      return;
    }

    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      // ガイダンスは音声ではなくテキストで事前に表示するように変更
      await startRecording();
    } else {
      stopRecording();
    }
  });

  // 録音開始
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 録音形式のoption設定 - Whisper APIに適した形式を指定
      const options = { mimeType: 'audio/webm' };
      mediaRecorder = new MediaRecorder(stream, options);
      audioChunks = [];

      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        console.log('録音完了 - 音声ファイルサイズ:', audioBlob.size, 'bytes');
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      recordBtn.innerHTML = '<i class="fas fa-stop"></i> 録音停止';
      recordBtn.classList.add('recording');
      statusDisplay.textContent = '録音中...';

      // 録音ガイダンス表示
      reportContainer.classList.remove('hidden');
    } catch (error) {
      console.error('録音開始エラー:', error);
      statusDisplay.textContent = 'マイクアクセスが拒否されました - テストモードで続行します';

      // テストモードで続行
      reportContainer.classList.remove('hidden');

      // 3秒後にテストデータで結果表示
      setTimeout(() => {
        // テスト用の空のブロブを作成
        const dummyBlob = new Blob([], { type: 'audio/webm' });
        processAudio(dummyBlob);

        // UIを元に戻す
        recordBtn.innerHTML = '<i class="fas fa-microphone"></i> 音声報告開始';
        recordBtn.classList.remove('recording');
      }, 3000);
    }
  }

  // 録音停止
  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      recordBtn.innerHTML = '<i class="fas fa-microphone"></i> 音声報告開始';
      recordBtn.classList.remove('recording');
      statusDisplay.textContent = '処理中...';

      // 音声合成が使われている場合は強制的にキャンセル
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      // マイクストリームを停止
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  }

  // 音声処理 - シンプル化バージョン
  async function processAudio(audioBlob) {
    try {
      // 録音データが極端に小さい場合（無音など）はエラーメッセージを表示
      if (audioBlob.size < 1000) { // 1KB未満は実質的に無音と判断
        statusDisplay.textContent = '録音データがありません。もう一度お試しください。';
        recordBtn.innerHTML = '<i class="fas fa-microphone"></i> 音声報告開始';
        recordBtn.classList.remove('recording');
        return;
      }

      // 1. 文字起こし処理
      const formData = new FormData();
      formData.append('audio', audioBlob);
      const { transcript } = await API.upload('/api/whisper', formData);
      console.log('文字起こし結果:', transcript);

      // 2. 要約とブロック名抽出
      const result = await API.post('/api/summarize', { 
        text: transcript, 
        blocks: blockList 
      });
      
      // 3. 結果を取得
      const blockName = result.blockName || '';
      const summary = result.summary || '';
      
      // 4. UIに表示
      blockInput.value = blockName;
      summaryDisplay.value = summary;
      
      // 5. ブロック候補表示
      displayBlockCandidates(blockName);
      
      // 6. 入力欄のイベントを発生させる
      // 他のスクリプトが値の変更を検知できるようにする
      const elements = [blockInput, summaryDisplay];
      elements.forEach(el => {
        if (el) {
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      
      // 7. DirectInputユーティリティが存在する場合は使用
      if (window.DirectInput) {
        try {
          window.DirectInput.setBlockValue(blockName);
          window.DirectInput.setSummaryText(summary);
        } catch (error) {
          console.error('DirectInputエラー:', error);
        }
      }
      
      // 8. レポートデータを保存
      window.reportData = { blockName, issueContent: summary };
      
      // 9. UI状態を更新
      statusDisplay.textContent = '音声処理完了';
      recordBtn.innerHTML = '<i class="fas fa-microphone"></i> 音声報告開始';
      recordBtn.classList.remove('recording');
      
      return { transcript, summary, blockName };
      
    } catch (error) {
      console.error('音声処理エラー:', error);
      statusDisplay.textContent = '音声処理中にエラーが発生しました';
      recordBtn.innerHTML = '<i class="fas fa-microphone"></i> 音声報告開始';
      recordBtn.classList.remove('recording');
      return null;
    }
  }

  // ブロック候補表示 - グローバルスコープに公開するように修正
  window.displayBlockCandidates = function(blockName) {
    blockCandidate.innerHTML = '';
    // AIが推定したブロック名を入力欄に自動入力
    blockInput.value = blockName || '';

    if (blockName) {
      const blockTag = document.createElement('div');
      blockTag.classList.add('block-tag', 'selected');
      blockTag.textContent = blockName;
      blockTag.addEventListener('click', () => {
        blockInput.value = blockName;
      });
      blockCandidate.appendChild(blockTag);
    }

    // 類似ブロック候補を表示（本来はサーバー側で類似度計算）
    // 簡易版として、先頭文字が一致するものを表示
    if (blockName && blockName.length > 0) {
      const prefix = blockName.charAt(0);
      const similarBlocks = blockList
        .filter(block => block !== blockName && block.startsWith(prefix))
        .slice(0, 3); // 最大3候補表示

      similarBlocks.forEach(block => {
        const blockTag = document.createElement('div');
        blockTag.classList.add('block-tag');
        blockTag.textContent = block;
        blockTag.addEventListener('click', () => {
          document.querySelectorAll('.block-tag').forEach(tag => tag.classList.remove('selected'));
          blockTag.classList.add('selected');
          blockInput.value = block;
        });
        blockCandidate.appendChild(blockTag);
      });
    }
  }

  // 画像添付時にプレビュー表示
  const imageInputElem = document.getElementById('imageInput');
  const imagePreviewElem = document.getElementById('imagePreview');
  if (imageInputElem && imagePreviewElem) {
    imageInputElem.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          imagePreviewElem.src = e.target.result;
          imagePreviewElem.style.display = 'block';
          
          // 選択されたファイルを保存
          window.selectedImageFile = file;
          console.log('画像が選択されました:', file.name, file.type, file.size);
        };
        reader.readAsDataURL(file);
      } else {
        imagePreviewElem.style.display = 'none';
        imagePreviewElem.src = '#';
        window.selectedImageFile = null;
      }
    });
  }

  // 画像・音声・API連携付きの報告送信処理
  console.log('【基本デバッグ】submitBtnイベントリスナー設定');
  submitBtn.addEventListener('click', async () => {
    console.log('【デバッグ】確定ボタンがクリックされました');
    
    // 確定ボタンを即座に無効化して重複クリック防止
    submitBtn.disabled = true;
    submitBtn.textContent = '送信中...';
    try {
      const shipNo = shipInput.value.trim();
      const block = blockInput.value.trim();
      const content = summaryDisplay.value.trim();
      const reporter = reporterDisplay.textContent || '未設定';
      const imageInput = document.getElementById('imageInput');
      const imageFile = imageInput && imageInput.files[0];
      const audioBlob = window.latestAudioBlob || null; // 録音停止時にwindow.latestAudioBlobへ保存する仕様にする
      
      console.log('【デバッグ】入力データ確認:', { shipNo, block, content, reporter, imageFile: imageFile ? imageFile.name : null });

      if (!shipNo || !block || !content) {
        console.log('【デバッグ】必須入力チェック失敗:', { shipNo, block, content });
        alert('すべての項目を入力してください');
        return;
      }
      console.log('【デバッグ】入力チェック成功');
      // 画像と音声は任意に変更
      // if (!imageFile) {
      //  alert('画像を添付してください');
      //  return;
      // }
      // if (!audioBlob) {
      //  alert('音声を録音してください');
      //  return;
      // }

      console.log('【デバッグ】送信処理開始');
      let imageUrl = null;
      
      // 画像がある場合のみアップロード処理を実行
      if (imageFile) {
        statusDisplay.textContent = '画像アップロード中...';
        submitStatus.textContent = '画像アップロード中...';
        // 画像ファイル名リネーム
        const date = new Date().toISOString().slice(0,10).replace(/-/g, "");
        const filename = `report_${date}_ship${shipNo}_block${block}_${reporter}.jpg`;
        const renamedFile = new File([imageFile], filename, { type: imageFile.type });

        // 画像アップロードAPI呼び出し
        const imgForm = new FormData();
        imgForm.append('image', renamedFile);
        imgForm.append('reporter', reporter);
        imgForm.append('shipNO', shipNo);
        imgForm.append('block', block);
        const imgRes = await fetch("/api/upload-image-gas", {
          method: "POST",
          body: imgForm
        });
        const imgResult = await imgRes.json();
        
        // レスポンス全体を表示して内容を確認
        console.log('サーバーからのレスポンス全体:', imgResult);
        
        // successがあれば、画像URLを取得する
        if (imgResult && imgResult.success) {
          // プロパティ名がimageUrlかもしれないしfileUrlかもしれない
          imageUrl = imgResult.imageUrl || imgResult.fileUrl;
          
          if (imageUrl) {
            // グローバル変数にも保存
            window.lastUploadedImageUrl = imageUrl;
            console.log('画像アップロード成功:', imageUrl);
          } else {
            // レスポンスに含まれるすべてのプロパティを確認
            console.log('レスポンスのプロパティ一覧:', Object.keys(imgResult));
            // 無理やり最初のプロパティで試す
            const possibleUrlField = Object.keys(imgResult).find(key => 
              key.includes('url') || key.includes('Url') || key.includes('URL') || 
              key.includes('link') || key.includes('Link') || key.includes('file') || key.includes('File'));
            
            if (possibleUrlField) {
              imageUrl = imgResult[possibleUrlField];
              window.lastUploadedImageUrl = imageUrl;
              console.log('代替プロパティからURL取得:', possibleUrlField, imageUrl);
            } else {
              console.warn('URLらしいプロパティが見つかりませんでした');
              imageUrl = null;
            }
          }
        } else {
          console.warn('画像アップロード失敗:', imgResult);
          imageUrl = null;
        }
      } else {
        console.log('画像なしで続行します');
        // 画像がない場合はダミーエンドポイントを呼ばずにスキップ
        imageUrl = null;
      }

      // 音声データ処理（あれば文字起こし、なければスキップ）
      if (audioBlob) {
        // 音声データは保存せず、文字起こし結果のみデータとして利用
        console.log('音声データあり（文字起こし経由でテキスト化済み）');
      } else {
        console.log('音声データなし、テキスト入力のみで続行');
      }

      statusDisplay.textContent = 'Google Sheetsへ送信中...';
      submitStatus.textContent = 'Google Sheetsへ送信中...';
      // 画像URLをログ出力して確認
      console.log('画像URL確認:', imageUrl);
      console.log('グローバル変数の画像URL:', window.lastUploadedImageUrl);

      // ローカル変数かグローバル変数から画像URLを取得
      const finalImageUrl = imageUrl || window.lastUploadedImageUrl || "";
      console.log('最終的な画像URL:', finalImageUrl);
      
      // Google Sheetsへ送信
      const reportData = {
        date: new Date().toISOString(),
        reporter,
        shipNO: shipNo,
        blockName: block,
        content,
        // 画像がない場合はnullでもOK
        image_url: finalImageUrl,
        // 音声データは保存しない（必要ない）
      };
      console.log('【デバッグ】Google Sheets送信データ:', reportData);
      
      try {
        console.log('【デバッグ】/api/save-to-sheets API呼び出し開始');
        const sheetsRes = await fetch("/api/save-to-sheets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reportData)
        });
        console.log('【デバッグ】APIレスポンス受信:', sheetsRes.status, sheetsRes.statusText);
        const sheetsResult = await sheetsRes.json();
        console.log('【デバッグ】APIレスポンスJSON:', sheetsResult);
        statusDisplay.textContent = "報告が送信されました！";
      submitStatus.textContent = "報告が送信されました！";
        alert("報告が送信されました！");
      } catch (apiError) {
        console.error('【デバッグ】APIエラー:', apiError);
        throw apiError;
      }
      // フォームリセット
      shipInput.value = '';
      blockInput.value = '';
      summaryDisplay.value = '';
      blockCandidate.innerHTML = '';
      if(imageInput) imageInput.value = '';
      if(document.getElementById('imagePreview')) document.getElementById('imagePreview').style.display = 'none';
      reportContainer.classList.add('hidden');
      document.querySelectorAll('.ship-btn').forEach(btn => btn.classList.remove('selected'));
      
      // 処理完了後に確定ボタンを再び有効化
      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = '確定';
        // 2秒後にステータスメッセージをクリア
        setTimeout(() => {
          submitStatus.textContent = '';
        }, 2000);
      }, 1000); // 1秒後に有効化
    } catch (e) {
      console.error('【デバッグ】送信処理エラー:', e);
      statusDisplay.textContent = '送信エラー';
      submitStatus.textContent = '送信エラー';
      alert('送信中にエラーが発生しました: ' + e.message);
      console.error(e);
      
      // エラー時にも確定ボタンを再び有効化
      submitBtn.disabled = false;
      submitBtn.textContent = '確定';
    }
  });

  // 音声録音の停止時にwindow.latestAudioBlobへ保存する仕組み例
  window.saveRecordedAudio = function(blob) {
    window.latestAudioBlob = blob;
  };


  // キャンセルボタン
  cancelBtn.addEventListener('click', () => {
    if (confirm('入力内容をキャンセルしますか？')) {
      shipInput.value = '';
      blockInput.value = '';
      summaryDisplay.value = '';
      blockCandidate.innerHTML = '';
      reportContainer.classList.add('hidden');
      
      document.querySelectorAll('.ship-btn').forEach(btn => btn.classList.remove('selected'));
    }
  });

  // 戻るボタン
  backBtn.addEventListener('click', () => {
    showScreen(feedScreen);
  });

  // EnterキーでのログインをサポRT
  usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      loginBtn.click();
    }
  });

  // 初期画面表示
  showScreen(loginScreen);
});
