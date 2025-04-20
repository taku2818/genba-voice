// 現場ボイス アプリケーション（シンプル版：2023年4月20日）
console.log('【デバッグ】app.js 読み込み開始');

// 全体的な状態変数
let mediaRecorder;
let audioChunks = [];
let username = '';
let selectedShip = '';
let blockList = [];

document.addEventListener('DOMContentLoaded', () => {
  console.log('【デバッグ】DOMContentLoaded イベント発火');
  
  // DOM要素
  const loginScreen = document.getElementById('login-screen');
  const feedScreen = document.getElementById('feed-screen');
  const recordDetailScreen = document.getElementById('record-detail-screen');
  const loginBtn = document.getElementById('login-btn');
  const usernameInput = document.getElementById('username');
  const reporterDisplay = document.getElementById('reporter');
  const recordBtn = document.getElementById('record-btn');
  const statusDisplay = document.getElementById('status');
  const submitBtn = document.getElementById('submit-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const backBtn = document.getElementById('back-btn');
  const recentShipsContainer = document.getElementById('recent-ships-container');
  const blockInput = document.getElementById('block-input');
  const shipInput = document.getElementById('ship-input');
  const summaryDisplay = document.getElementById('summary');
  const blockCandidate = document.getElementById('block-candidate');
  
  // 画面切り替え関数
  function showScreen(screen) {
    loginScreen.classList.add('hidden');
    feedScreen.classList.add('hidden');
    recordDetailScreen.classList.add('hidden');
    screen.classList.remove('hidden');
  }
  
  // ログイン機能
  if (loginBtn && usernameInput) {
    console.log('【デバッグ】ログインボタンにイベントリスナーを設定');
    loginBtn.onclick = function() {
      console.log('【デバッグ】ログインボタンがクリックされました');
      const name = usernameInput.value.trim();
      if (name) {
        console.log('【デバッグ】ユーザー名:', name);
        username = name;
        reporterDisplay.textContent = name;
        showScreen(feedScreen);
        loadRecentShips(); // 船体番号を読み込む
      } else {
        alert('名前を入力してください');
      }
    };
    
    // Enterキーでのログイン対応
    usernameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        loginBtn.click();
      }
    });
  }
  
  // 船体番号読み込み関数
  function loadRecentShips() {
    console.log('船体番号読み込み開始');
    
    // サンプル船体番号を表示
    const sampleShips = ['345', '346', '347'];
    
    // 船体番号ボタンを追加
    recentShipsContainer.innerHTML = '';
    sampleShips.forEach(ship => {
      const shipBtn = document.createElement('button');
      shipBtn.classList.add('ship-btn');
      shipBtn.textContent = ship;
      
      // 船体番号ボタンクリック時の処理
      shipBtn.addEventListener('click', () => {
        document.querySelectorAll('.ship-btn').forEach(btn => btn.classList.remove('selected'));
        shipBtn.classList.add('selected');
        selectedShip = ship;
        shipInput.value = ship;
      });
      
      recentShipsContainer.appendChild(shipBtn);
    });
    
    // ブロックリストを読み込む
    loadBlockList();
  }
  
  // ブロックリスト読み込み
  function loadBlockList() {
    console.log('ブロックリスト読み込み開始');
    
    // サンプルブロックリスト
    blockList = [
      'S1', 'S1A', 'S1F', 'S2', 'D1', 'D2', 'D3', 'D4', 'DA1', 'DA2',
      'DB1', 'DB2', 'E1', 'E2', 'E3', 'E4', 'EA1', 'EA2', 'EA3', 'EB1',
      'EB2', 'EB3', 'A1', 'A2', 'A3', 'A3S', 'A4', 'A5', 'AA1', 'AA2',
      'AB1', 'AB2', 'C1', 'C2', 'C3', 'C4', 'CA1', 'CA2', 'CB1', 'CB2',
      'DC1', 'DC2', 'DC3', 'DC4'
    ];
    
    console.log('ブロックリスト読み込み完了:', blockList.length, '個のブロック名');
  }

  // 録音ボタンの処理
  if (recordBtn) {
    recordBtn.addEventListener('click', async () => {
      try {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          // 録音停止
          mediaRecorder.stop();
          recordBtn.textContent = '🎤 録音開始';
          statusDisplay.textContent = '録音を停止しました';
        } else {
          // 録音開始
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRecorder = new MediaRecorder(stream);
          audioChunks = [];
          
          mediaRecorder.addEventListener('dataavailable', e => {
            audioChunks.push(e.data);
          });
          
          mediaRecorder.addEventListener('stop', async () => {
            statusDisplay.textContent = '音声を処理中...';
            
            const audioBlob = new Blob(audioChunks);
            window.latestAudioBlob = audioBlob; // グローバルに保存
            
            // 音声データの処理（省略）
            statusDisplay.textContent = '音声処理完了';
            showScreen(recordDetailScreen);
          });
          
          mediaRecorder.start();
          recordBtn.textContent = '⏹ 録音停止';
          statusDisplay.textContent = '録音中...';
        }
      } catch (err) {
        console.error('録音エラー:', err);
        statusDisplay.textContent = `エラー: ${err.message}`;
      }
    });
  }
  
  // フォーム送信処理
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      submitBtn.disabled = true; // 重複送信防止
      
      try {
        // フォーム送信処理（省略）
        alert('送信が完了しました');
        // ページをリロード
        window.location.reload();
      } catch (err) {
        console.error('送信エラー:', err);
        alert('送信に失敗しました: ' + err.message);
        submitBtn.disabled = false;
      }
    });
  }
  
  // キャンセルボタンの処理
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      showScreen(feedScreen);
    });
  }
  
  // 戻るボタンの処理
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      showScreen(loginScreen);
    });
  }
});
