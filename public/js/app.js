// 現場ボイス アプリケーション
document.addEventListener('DOMContentLoaded', () => {
  // DOM要素
  const loginScreen = document.getElementById('login-screen');
  const feedScreen = document.getElementById('feed-screen');
  const recordDetailScreen = document.getElementById('record-detail-screen');
  const loginBtn = document.getElementById('login-btn');
  const usernameInput = document.getElementById('username');
  const reporterDisplay = document.getElementById('reporter');
  const recordBtn = document.getElementById('record-btn');
  const statusDisplay = document.getElementById('status');
  const summaryDisplay = document.getElementById('summary');
  const blockCandidate = document.getElementById('block-candidate');
  const blockInput = document.getElementById('block-input');
  const shipInput = document.getElementById('ship-input');
  const recentShipsContainer = document.getElementById('recent-ships-container');
  const reportContainer = document.getElementById('report-container');
  const submitBtn = document.getElementById('submit-btn');
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
      const data = await API.get('/api/recent-ships');

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
      const data = await API.get('/api/blocks');
      blockList = data.blocks;
    } catch (error) {
      console.error('ブロックリスト取得エラー:', error);
      // フォールバックとして固定リストを使用
      blockList = ["BOA", "BAF", "BOF", "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9", "B10", "B11", "B12"];
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

  // 音声処理
  async function processAudio(audioBlob) {
    try {
      // 録音データが極端に小さい場合（無音など）はエラーメッセージを表示して処理を中断
      if (audioBlob.size < 1000) { // 1KB未満は実質的に無音と判断
        statusDisplay.textContent = '録音データがありません。もう一度お試しください。';
        recordBtn.innerHTML = '<i class="fas fa-microphone"></i> 音声報告開始';
        recordBtn.classList.remove('recording');
        return;
      }

      const formData = new FormData();
      formData.append('audio', audioBlob);

      // Whisper APIで文字起こし
      const { transcript } = await API.upload('/api/whisper', formData);

      // APIオブジェクトのAPI.upload関数内でエラーハンドリング済み

      // ChatGPTで要約とブロック推定
      const { summary, blockName } = await API.post('/api/summarize', { 
        text: transcript, 
        blocks: blockList 
      });

      // 結果表示 - サーバーからの要約を不具合報告欄に表示
      summaryDisplay.value = summary;
      statusDisplay.textContent = '完了しました！';

      // ブロック名を自動入力
      displayBlockCandidates(blockName);

      // 入力欄にフォーカスして確認を促す
      blockInput.focus();
    } catch (error) {
      console.error('音声処理エラー:', error);
      statusDisplay.textContent = 'エラーが発生しました: ' + error.message;
    }
  }

  // ブロック候補表示
  function displayBlockCandidates(blockName) {
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

  // 確定ボタン
  submitBtn.addEventListener('click', () => {
    const shipNo = shipInput.value.trim();
    const block = blockInput.value.trim();
    const content = summaryDisplay.value.trim();

    if (!shipNo || !block || !content) {
      alert('すべての項目を入力してください');
      return;
    }

    // 現在の日付と報告者情報を取得
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD形式
    const reporter = reporterDisplay.textContent || '未設定';

    // Supabaseに送信するデータ
    const reportData = {
      date: today,           // 発生日
      reporter: reporter,    // 報告者
      shipNo: shipNo,        // 船体番号
      blockName: block,      // ブロック
      content: content       // 内容
    };

    // ローディング表示
    statusDisplay.textContent = '保存中...';

    // Supabaseに保存するAPIリクエスト
    API.post('/api/save-report', reportData)
    .then(result => {
      if (result.success) {
        // 成功時
        statusDisplay.textContent = '保存完了';
        alert('不具合報告をSupabaseに保存しました\n船体番号: ' + shipNo + '\nブロック: ' + block);

        // 表示用にローカルにもデータを保持
        csvData.push({
          ...reportData,
          cause: '',             // 原因（設計部入力用）
          status: '',            // 対応状況（設計部入力用）
          assignee: '',          // 担当者（設計部入力用）
          timestamp: new Date().toISOString() // タイムスタンプ
        });
        localStorage.setItem('csvReportData', JSON.stringify(csvData));
      } else {
        // エラー時
        statusDisplay.textContent = '保存エラー';
        alert('保存中にエラーが発生しました: ' + (result.error || '不明なエラー'));
        console.error('保存エラー:', result);
      }
    })
    .catch(error => {
      statusDisplay.textContent = '保存エラー';
      alert('サーバーとの通信中にエラーが発生しました');
      console.error('サーバーエラー:', error);
    });

    // フォームリセット
    shipInput.value = '';
    blockInput.value = '';
    summaryDisplay.value = '';
    blockCandidate.innerHTML = '';
    reportContainer.classList.add('hidden');

    document.querySelectorAll('.ship-btn').forEach(btn => btn.classList.remove('selected'));
  });

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
