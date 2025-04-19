/**
 * 強制的にブロック入力欄に値を設定するためのヘルパースクリプト
 * これはブロックの値設定に関する問題を解決するための特別な対応です
 */

// ページ全体にカスタムイベントを追加
document.addEventListener('DOMContentLoaded', () => {
    console.log('force-input.js が読み込まれました');
    
    // 強制的に値を設定するグローバル関数を定義
    window.forceSetBlockInput = function(value) {
        console.log('forceSetBlockInput が呼び出されました:', value);
        
        // 要素を取得（複数の方法で試行）
        const blockInputField = document.querySelector('#block-input');
        if (!blockInputField) {
            console.error('ブロック入力欄が見つかりません');
            return false;
        }
        
        // 元の値を保存
        const originalValue = blockInputField.value;
        console.log('元の値:', originalValue);
        
        // 新たなMutationObserverを作成して値の変更を監視
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && 
                    mutation.attributeName === 'value' && 
                    blockInputField.value !== value) {
                    
                    console.log('値が変更されました、再設定します:', blockInputField.value, '->', value);
                    blockInputField.value = value;
                }
            });
        });
        
        // 監視を開始
        observer.observe(blockInputField, { 
            attributes: true,
            attributeFilter: ['value']
        });
        
        // 強制的に値を設定（複数の方法）
        try {
            // 1. 直接値を設定
            blockInputField.value = value;
            
            // 2. 属性としても設定
            blockInputField.setAttribute('value', value);
            
            // 3. イベントを発火
            blockInputField.dispatchEvent(new Event('input', { bubbles: true }));
            blockInputField.dispatchEvent(new Event('change', { bubbles: true }));
            
            // 4. フォーカスを設定
            blockInputField.focus();
            
            // 5. 一定時間後に再度確認
            setTimeout(() => {
                if (blockInputField.value !== value) {
                    console.log('タイムアウト後に再設定:', blockInputField.value, '->', value);
                    blockInputField.value = value;
                    blockInputField.dispatchEvent(new Event('input', { bubbles: true }));
                }
                
                // 監視を停止
                setTimeout(() => {
                    observer.disconnect();
                    console.log('監視を停止しました');
                }, 100);
                
            }, 100);
            
            console.log('値設定完了:', value);
            return blockInputField.value === value;
        } catch (e) {
            console.error('値設定時のエラー:', e);
            observer.disconnect();
            return false;
        }
    };
    
    // カスタムイベントを追加
    document.addEventListener('force-set-block-value', (e) => {
        if (e.detail && e.detail.value) {
            window.forceSetBlockInput(e.detail.value);
        }
    });
    
    console.log('force-input.js の初期化が完了しました');
});
