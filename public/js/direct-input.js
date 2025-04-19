/**
 * 直接入力制御用のユーティリティスクリプト
 * このスクリプトは、ブロック入力欄へのアクセスを提供し、値を確実に設定するために使用します
 */

// ページの読み込みが完了したら実行
document.addEventListener('DOMContentLoaded', function() {
    console.log('direct-input.js: DOM読み込み完了');
    
    // 初期化関数
    function initialize() {
        // すべての入力要素とラベルを詳細に検査
        console.log('--- 入力フィールド検査開始 ---');
        
        // すべてのフォーム要素をログ
        const forms = document.querySelectorAll('form');
        console.log(`フォーム要素数: ${forms.length}`);
        
        // すべての入力要素をログ
        const inputs = document.querySelectorAll('input, textarea');
        console.log(`入力要素数: ${inputs.length}`);
        inputs.forEach((el, i) => {
            console.log(`入力要素 ${i+1}: 種類=${el.tagName}, id=${el.id}, type=${el.type}, name=${el.name}, placeholder=${el.placeholder}`);
            // 要素の親と近くのラベルを検査
            const parentText = el.parentElement ? el.parentElement.textContent.trim().substring(0, 50) : 'なし';
            console.log(`  親要素テキスト: ${parentText}`);
            
            // この要素の近くにあるラベルを探す
            const nearbyLabels = Array.from(document.querySelectorAll('label'))
                .filter(label => {
                    // ラベルのfor属性がこの要素のIDと一致する
                    if (label.htmlFor === el.id) return true;
                    // または要素の近くにある場合
                    const labelRect = label.getBoundingClientRect();
                    const elRect = el.getBoundingClientRect();
                    return Math.abs(labelRect.top - elRect.top) < 50;
                });
            
            if (nearbyLabels.length > 0) {
                console.log(`  関連ラベル: ${nearbyLabels.map(l => l.textContent.trim()).join(', ')}`);
            }
        });
        
        // ブロック入力欄を特定する試み
        let blockInputCandidates = [];
        
        // 方法1: IDで検索
        const blockInputById = document.getElementById('block-input');
        if (blockInputById) {
            console.log('✅ ID「block-input」で要素を発見');
            blockInputCandidates.push({element: blockInputById, method: 'ID直接指定'});
        }
        
        // 方法2: プレースホルダで検索
        const blockInputByPlaceholder = document.querySelector('input[placeholder="ブロック名"]');
        if (blockInputByPlaceholder) {
            console.log('✅ プレースホルダ「ブロック名」で要素を発見');
            if (!blockInputCandidates.some(c => c.element === blockInputByPlaceholder)) {
                blockInputCandidates.push({element: blockInputByPlaceholder, method: 'プレースホルダ'});
            }
        }
        
        // 方法3: ラベルテキストで検索
        const blockLabel = Array.from(document.querySelectorAll('label'))
            .find(label => label.textContent.includes('ブロック'));
        if (blockLabel) {
            console.log(`✅ ラベル「${blockLabel.textContent.trim()}」を発見`);
            const labelTarget = blockLabel.htmlFor ? document.getElementById(blockLabel.htmlFor) : null;
            if (labelTarget) {
                console.log(`  ラベルが指す要素ID: ${labelTarget.id}`);
                if (!blockInputCandidates.some(c => c.element === labelTarget)) {
                    blockInputCandidates.push({element: labelTarget, method: 'ラベル参照'});
                }
            }
        }
        
        // 見つかった候補をすべて表示
        console.log(`ブロック入力欄候補数: ${blockInputCandidates.length}`);
        blockInputCandidates.forEach((candidate, i) => {
            const el = candidate.element;
            console.log(`候補 ${i+1}: 方法=${candidate.method}, id=${el.id}, type=${el.type}, name=${el.name}`);
        });
        
        console.log('--- 入力フィールド検査終了 ---');
    }
    
    // グローバル関数として公開
    window.DirectInput = {
        // ブロック名を入力欄に直接設定する
        setBlockValue: function(value) {
            if (!value) return false;
            
            console.log(`direct-input.js: ブロック名を設定します: "${value}"`);
            
            try {
                // ブロック入力欄の候補をさまざまな方法で探す
                const candidates = [];
                
                // 方法1: IDで探す
                const byId = document.getElementById('block-input');
                if (byId) candidates.push(byId);
                
                // 方法2: プレースホルダで探す
                const byPlaceholder = document.querySelector('input[placeholder="ブロック名"]');
                if (byPlaceholder && !candidates.includes(byPlaceholder)) candidates.push(byPlaceholder);
                
                // 方法3: セレクタの組み合わせで探す
                ['input#block', 'input.block', '[name="block"]'].forEach(selector => {
                    const el = document.querySelector(selector);
                    if (el && !candidates.includes(el)) candidates.push(el);
                });
                
                // 方法4: ラベルから探す
                document.querySelectorAll('label').forEach(label => {
                    if (label.textContent.includes('ブロック')) {
                        // ラベルがfor属性を持っている場合
                        if (label.htmlFor) {
                            const el = document.getElementById(label.htmlFor);
                            if (el && !candidates.includes(el)) candidates.push(el);
                        }
                        // ラベルの子要素として入力欄がある場合
                        else {
                            const el = label.querySelector('input');
                            if (el && !candidates.includes(el)) candidates.push(el);
                        }
                    }
                });
                
                // 方法5: 「ブロック」というテキストに近い入力欄
                document.querySelectorAll('input').forEach(input => {
                    const parent = input.parentElement;
                    if (parent && parent.textContent.includes('ブロック') && !candidates.includes(input)) {
                        candidates.push(input);
                    }
                });
                
                console.log(`ブロック入力欄候補を${candidates.length}個見つけました`);
                
                // 候補リストを取得
                let blockInput = candidates[0];
                
                if (!blockInput) {
                    // それでも見つからなかった場合は、すべての入力欄をログ
                    console.error('候補がありません - すべての入力欄を表示:');
                    document.querySelectorAll('input').forEach((el, i) => {
                        console.log(`入力要素 ${i+1}: id=${el.id}, name=${el.name}, type=${el.type}`);
                    });
                }
                
                if (blockInput) {
                    // 1. 値を設定
                    blockInput.value = value;
                    
                    // 2. 属性としても設定
                    blockInput.setAttribute('value', value);
                    
                    // 3. フォーカスを当てる
                    blockInput.focus();
                    
                    // 4. イベントを発火
                    blockInput.dispatchEvent(new Event('input', { bubbles: true }));
                    blockInput.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    console.log(`direct-input.js: ブロック名設定完了: "${blockInput.value}"`);
                    return true;
                } else {
                    console.error('direct-input.js: ブロック入力欄が見つかりませんでした');
                    return false;
                }
            } catch (e) {
                console.error('direct-input.js: 設定エラー:', e);
                return false;
            }
        },
        
        // 要約テキストを設定する
        setSummaryText: function(value) {
            if (!value) return false;
            
            try {
                const summary = document.getElementById('summary');
                if (summary) {
                    summary.value = value;
                    summary.dispatchEvent(new Event('input', { bubbles: true }));
                    return true;
                }
                return false;
            } catch (e) {
                console.error('direct-input.js: 要約設定エラー:', e);
                return false;
            }
        },
        
        // ブロック名と要約テキストを同時に設定
        setBoth: function(blockValue, summaryText) {
            const blockResult = this.setBlockValue(blockValue);
            const summaryResult = this.setSummaryText(summaryText);
            
            return { blockResult, summaryResult };
        }
    };
    
    // 要素コンテナが変更されたときに再チェック
    const observer = new MutationObserver(function() {
        // コンテナ変更時にも要素を再確認
        initialize();
    });
    
    // ドキュメントの変更を監視
    observer.observe(document.body, { 
        childList: true,
        subtree: true
    });
    
    // 初期化実行
    initialize();
    
    console.log('direct-input.js: 初期化完了');
});
