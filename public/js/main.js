// バージョン確認用デバッグコード - 前の修正が反映されているか確認
// より理解しやすくするために大きなメッセージを表示
const VERSION = '2025-04-19-v4';
console.log(`%c【現場ボイスアプリ】が最新バージョン${VERSION}で動作中です（構文エラー修正版）`, 'font-size: 20px; color: green; background-color: yellow; padding: 5px;');

// 実行時に必ずこのコードが実行されることを確認するための関数
function initializeDebugHelpers() {
  // デバッグ用ログは本番環境では出力しない
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    console.log('%c【開発環境】現場ボイスアプリが動作中', 'font-size: 14px; color: white; background-color: green; padding: 5px;');
  }
  // バージョン表示は削除
}

// ページ読み込み後に実行
window.addEventListener('DOMContentLoaded', function() {
  initializeDebugHelpers();
  
  // APIオブジェクトのグローバル初期化
  if (!window.API) {
    window.API = {
      async upload(endpoint, formData) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
          });
          if (!response.ok) throw new Error(`HTTP error ${response.status}`);
          return await response.json();
        } catch (err) {
          console.error('API Upload Error:', err);
          throw err;
        }
      },
      async post(endpoint, data) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
          });
          if (!response.ok) throw new Error(`HTTP error ${response.status}`);
          return await response.json();
        } catch (err) {
          console.error('API Post Error:', err);
          throw err;
        }
      }
    };
    console.log('APIオブジェクトをグローバルに初期化しました');
  }
});

// 主要なDOM要素を取得
const recordButton = document.getElementById('record-btn');
const recordingStatus = document.getElementById('status');
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const reporterDisplay = document.getElementById('reporter'); // div
const shipDisplay = document.getElementById('ship'); // div
const blockCandidatesElement = document.getElementById('block-candidates');
const submitBtn = document.getElementById('submit-btn');

// バリデーション用のデフォルト値
window.lastDetectedBlock = '';  // 最後に検出されたブロック名

// 初期化関数
function init() {
    console.log('音声検出機能を初期化しています...');
    if (recordButton) {
        recordButton.addEventListener('click', startRecording);
    }
    
    if (imageInput) {
        imageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                handleImageUpload(file);
            }
        });
    }
    
    // 確定ボタンは常に有効にする（app.jsとの連携のため）
    if (submitBtn) {
        console.log('確定ボタンを有効化しています...');
        submitBtn.disabled = false;
    }
}

// 音声録音用の変数初期化
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

// 音声録音開始関数
function startRecording() {
    if (isRecording) {
        console.log('既に録音中です');
        return;
    }
    
    console.log('音声録音を開始します...');
    
    // ステータス表示を更新
    recordingStatus.textContent = '録音中...';
    
    // ブラウザが音声APIをサポートしているか確認
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                // Media Recorderの設定
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.ondataavailable = event => {
                    audioChunks.push(event.data);
                };
                
                mediaRecorder.onstop = () => {
                    // 音声データの処理
                    processAudioData();
                    isRecording = false;
                };
                
                // 録音開始
                audioChunks = [];
                mediaRecorder.start();
                isRecording = true;
                
                // 録音ボタンのテキストを更新
                if (recordButton) recordButton.textContent = '停止';
                recordButton.onclick = stopRecording;
            })
            .catch(error => {
                console.error('音声の取得に失敗しました:', error);
                recordingStatus.textContent = 'マイクの使用許可が必要です';
            });
    } else {
        console.error('お使いのブラウザは音声APIをサポートしていません');
        recordingStatus.textContent = 'お使いのブラウザでは録音できません';
    }
}

// 音声録音停止関数
function stopRecording() {
    console.log('音声録音を停止します...');
    
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        recordingStatus.textContent = '処理中...';
        
        // ボタンを元に戻す
        if (recordButton) recordButton.textContent = '音声報告開始';
        recordButton.onclick = startRecording;
    }
}

// 音声データ処理関数
function processAudioData() {
    console.log('音声データを処理します...');
    
    const statusDisplay = document.getElementById('status');
    const statusMessage = document.getElementById('status-message');
    const reportContainer = document.getElementById('report-container');
    
    if (statusDisplay) statusDisplay.textContent = '音声を処理中...';
    
    // 音声ブロブの作成
    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
    
    // 音声データをサーバーに送信
    createReportWithAudio(audioBlob);
}

// 音声データをサーバーに送信する関数
function createReportWithAudio(audioBlob) {
    // API設定が利用可能か確認
    if (!window.API) {
        console.error('API設定が見つかりません - APIオブジェクトがありません');
        alert('API設定が見つかりません。サーバー接続を確認してください。');
        return;
    }

    // APIキーが見つからない場合は進めるが警告を表示
    if (!window.API.OPENAI_API_KEY) {
        console.warn('OpenAI APIキーが設定されていませんが、サーバーに設定があるかもしれないので続行します');
    }
    
    console.log('音声データをサーバーに送信します...');
    const statusDisplay = document.getElementById('status');
    const statusMessage = document.getElementById('status-message');
    const reportContainer = document.getElementById('report-container');
    
    // FormDataの準備
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    
    // 報告者名を追加（ログインユーザー名を取得）
    const username = document.getElementById('username').value || 'Anonymous';
    formData.append('reporter', username);
    
    // タイムスタンプ
    const timestamp = new Date().toISOString();
    formData.append('timestamp', timestamp);
    
    // shipナンバーを追加
    const shipInput = document.getElementById('ship-input');
    if (shipInput) {
        const shipNumber = shipInput.value;
        formData.append('ship', shipNumber);
    }
    
    // APIエンドポイント
    const endpoint = '/api/transcribe';
    
    // 通信開始
    statusMessage.textContent = '音声変換中...';
    
    try {
        fetch(endpoint, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('音声API応答エラー: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            console.log('音声認識結果:', data);
            
            let transcriptData = data.text || '';
            let summary = '';
            let summaryData = {};
            
            // 要約データが含まれているか確認
            if (data.summary) {
                try {
                    // 文字列からJSONオブジェクトに変換（サーバー側で既にJSONの場合はこの処理は不要）
                    if (typeof data.summary === 'string') {
                        summaryData = JSON.parse(data.summary);
                    } else {
                        summaryData = data.summary;
                    }
                    
                    // 要約テキストのみを抽出
                    summary = summaryData.summary || '';
                    
                    // ブロック名をグローバル変数に保存
                    if (summaryData.block) {
                        window.lastDetectedBlock = summaryData.block;
                        console.log(`検出されたブロック名: ${summaryData.block}`);
                    }
                    
                    try {
                        // 類似ブロック名を表示してユーザーが選択できるようにする
                        if (blockCandidatesElement) {
                            // 既存ブロック名と類似度の高いブロック名を最大3個表示
                            // 大文字小文字やハイフン、アンダースコア、前後空白を無視する
                            if (summaryData.block) {
                                const normalizedBlockName = summaryData.block.toLowerCase().replace(/[_\-\s]/g, '');
                                
                                // 照合式比較関数
                                const calculateSimilarity = (a, b) => {
                                    const aStr = a.toLowerCase().replace(/[_\-\s]/g, '');
                                    const bStr = b.toLowerCase().replace(/[_\-\s]/g, '');
                                    return aStr.includes(bStr) || bStr.includes(aStr);
                                };
                                
                                // 類似ブロック決定
                                const similarBlocks = window.blockList
                                    .filter(b => calculateSimilarity(b, normalizedBlockName) && b !== summaryData.block)
                                    .slice(0, 3);
                                
                                console.log('ブロック名候補を表示: ',
                                    summaryData.block, ' と類似ブロック ', similarBlocks.join(', '));
                            } else {
                                console.warn('検出されたブロック名がありません');
                            }
                        } else {
                            console.error('ブロック候補表示時のエラー: DOM要素が見つかりません');
                        }
                        
                        // 7. 要約テキストを正しく表示する - ここが間違っていました
                        // 正しく設定：ブロック名はブロック欄に、要約は不具合内容欄に
                        document.getElementById('summary').value = summaryData.summary;
                        console.log('【重要】正しく設定 - ブロック名：', summaryData.block, ' / 要約：', summaryData.summary);
                        
                        // 8. 最後のチェックと再設定
                        setTimeout(() => {
                            // 全ての入力欄を再設定（確実に正しい値をセット）
                            // 1. ブロック名は必ずブロック入力欄に設定
                            document.getElementById('block-input').value = window.lastDetectedBlock;
                            
                            // 2. 要約は不具合内容欄に設定
                            if (summaryData.summary) {
                                document.getElementById('summary').value = summaryData.summary;
                            }
                            
                            // 3. 確実に送信ボタンを有効化
                            if (submitBtn) submitBtn.disabled = false;
                            
                            console.log('【再設定完了】ブロック名=' + window.lastDetectedBlock + ' / 要約=' + summaryData.summary);
                            
                            // 4. DirectInputユーティリティが利用可能な場合は使用
                            if (window.DirectInput && summaryData.block) {
                                window.DirectInput.setBlockValue(summaryData.block);
                                console.log('【DirectInput】ブロック名設定試行:', summaryData.block);
                            }
                        }, 500);
                    } catch (e) {
                        console.error('【重大エラー】ブロック名設定失敗:', e);
                        alert(`検出されたブロック名: ${summaryData.block || '不明'} を手動で入力してください。`);
                    }
                } catch (e) {
                    console.error('要約データの解析に失敗しました:', e);
                    summary = transcriptData;
                }
            } else {
                console.log('要約データがありません - 原文をそのまま使用します');
                summary = transcriptData;
            }
            
            // 画面表示の更新
            reportContainer.classList.remove('hidden');
            statusDisplay.textContent = '処理完了';
            statusMessage.textContent = '';
            
            // 要約表示 - ブロック名と不具合内容を分離
            const summaryDisplay = document.getElementById('summary');
            let summaryText = summaryData.summary || transcriptData;
            
            // ブロック名を除外した要約を表示
            if (summaryData.block) {
                // 「ブロック名はXXです」のパターンを除外
                summaryText = summaryText.replace(new RegExp(`ブロック名は${summaryData.block}です.*?[。.]`, 'i'), '');
                // 単純にブロック名自体を除外
                summaryText = summaryText.replace(new RegExp(`${summaryData.block}`, 'ig'), '');
                // 空白と余分な記号を整理
                summaryText = summaryText.trim().replace(/^[\s,.:;。、]+/, '');
                // DirectInputを使っても設定
                if (window.DirectInput) {
                    window.DirectInput.setSummaryText(summaryText);
                }
            }
            
            // フォールバックとして通常の方法でも設定
            summaryDisplay.value = summaryText;
        })
        .catch(error => {
            console.error('音声処理中にエラーが発生しました:', error);
            statusDisplay.textContent = 'エラー';
            statusMessage.textContent = error.message;
        });
    } catch (error) {
        console.error('音声処理リクエスト作成中にエラーが発生しました:', error);
        statusDisplay.textContent = 'エラー';
        statusMessage.textContent = error.message;
    }
}

// ブロック入力欄を探して値を設定する関数
function findBlockInput() {
    const selectors = ['#block-input', 'input[name="block"]', 'input[placeholder="ブロック名"]'];
    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) return element;
    }
    return null;
}

// レポート送信関数
function submitReport(data, callback) {
    try {
        console.log('レポートを送信します', data);
        
        // 必要なフィールドが存在するか確認
        if (!data.summary) {
            callback({ success: false, message: '不具合内容が入力されていません' });
            return;
        }
        
        if (!data.block) {
            callback({ success: false, message: 'ブロック名が入力されていません' });
            return;
        }
        
        // レポート作成日時
        const now = new Date();
        const timestamp = now.toISOString();
        data.timestamp = timestamp;
        
        // ローカルストレージにレポートを保存（本来はサーバーに送信）
        let reports = JSON.parse(localStorage.getItem('reports') || '[]');
        reports.push(data);
        localStorage.setItem('reports', JSON.stringify(reports));
        
        // ファイル名生成（報告書のファイル名標準化）
        const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
        const shipName = data.ship || 'unknown';
        const blockName = data.block || 'unknown';
        const reporterName = data.reporter || 'anonymous';
        
        // ファイル名フォーマット: report_YYYYMMDD_shipXXX_blockYYY_reporter.jpg
        const fileName = `report_${dateStr}_ship${shipName}_block${blockName}_${reporterName}`;
        console.log('生成されたファイル名:', fileName);
        
        // 送信成功をコールバック
        callback({
            success: true,
            message: 'レポートを送信しました',
            recentReports: reports // 最新のレポートを返す
        });
    } catch (err) {
        console.error('レポート送信時のエラー:', err);
        callback({ success: false, message: 'エラーが発生しました: ' + err.message });
    }
}

// 画像アップロード処理関数
function handleImageUpload(file, options = {}) {
    try {
        // 画像読み込み時に、プレビューも表示
        console.log('画像読み込み中...', file.name, file.size, file.type);
        
        const reader = new FileReader();
        
        // 読み込み完了時の処理
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                // 大きな画像の場合はリサイズ
                const maxSize = 800; // 最大サイズ
                let width = img.width;
                let height = img.height;
                
                if (width > maxSize || height > maxSize) {
                    if (width > height) {
                        height = height * (maxSize / width);
                        width = maxSize;
                    } else {
                        width = width * (maxSize / height);
                        height = maxSize;
                    }
                }
                
                // キャンバスでリサイズ
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // プレビュー表示
                if (imagePreview) {
                    imagePreview.innerHTML = '';
                    const previewImg = document.createElement('img');
                    previewImg.src = canvas.toDataURL('image/jpeg');
                    previewImg.style.maxWidth = '100%';
                    imagePreview.appendChild(previewImg);
                }
                
                // 画像データをBase64形式で保存
                const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];
                window.currentImageData = base64Image;
                
                console.log('画像処理完了');
                if (options.callback) options.callback(base64Image);
            };
            img.src = event.target.result;
        };
        
        reader.readAsDataURL(file);
    } catch (err) {
        console.error('画像アップロード処理エラー:', err);
        alert('画像の処理中にエラーが発生しました: ' + err.message);
    }
}

// ブロック名を検証する関数（定義済みリストから選択可能にする）
function validateBlockName(inputValue) {
    // 定義済みブロックリストがない場合は何もしない
    if (!window.blockList || !Array.isArray(window.blockList)) {
        console.warn('ブロックリストが定義されていません');
        return true;
    }
    
    // 完全一致するか？
    if (window.blockList.includes(inputValue)) {
        console.log('ブロック名は有効です:', inputValue);
        return true;
    }
    
    // 部分一致（前方一致）するか？
    const matches = window.blockList.filter(block => 
        block.toLowerCase().startsWith(inputValue.toLowerCase())
    );
    
    if (matches.length > 0) {
        console.log('部分一致するブロック名候補:', matches);
        // TODO: 候補をUIに表示
        return true;
    }
    
    // 一致しない場合
    console.warn('入力されたブロック名はリストにありません:', inputValue);
    return false;
}

// ページロード完了時の初期化
window.addEventListener('load', function() {
    console.log('ページが完全に読み込まれました - 初期化を開始します');
    init();
});
