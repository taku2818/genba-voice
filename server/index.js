import express from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import FormData from "form-data";

// ESモジュールでの __dirname 相当の実装
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();
const port = process.env.PORT || 3001;

// Multerの設定 - 拡張子を正しく設定
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../uploads/"))
  },
  filename: function (req, file, cb) {
    // 拡張子を.webmに指定して保存
    const timestamp = Date.now();
    cb(null, `audio-${timestamp}.webm`)
  }
});

const upload = multer({ storage: storage });

// ミドルウェア
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// OpenAI設定 - v4 スタイル
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Supabase設定
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Supabase接続テスト
console.log(`Supabase接続情報: URL=${supabaseUrl?.substring(0, 15)}... Key=${supabaseKey?.substring(0, 5)}...`);

// アプリ起動時にSupabase接続テスト
supabase.from('reports').select('count').limit(1).then(({ data, error }) => {
  if (error) {
    console.error('Supabase接続テストエラー:', error);
  } else {
    console.log('Supabase接続成功 - テーブルにアクセスできました');
  }
}).catch(err => {
  console.error('Supabase接続エラー:', err);
});

// デバッグモードの設定
const DEBUG_MODE = false; // 本番モードに切り替え

// アップロードディレクトリの作成（存在しない場合）
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Whisper API エンドポイント
app.post("/api/whisper", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "音声ファイルがアップロードされていません" });
    }

    console.log("ファイル情報:", req.file);
    console.log("APIキー確認: ", process.env.OPENAI_API_KEY ? "APIキーが設定されています" : "APIキーが設定されていません");
    
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OpenAI APIキーが設定されていません" });
    }

    try {
      // 何もしない - エラー修正のために整理
      
      // API呼び出しの準備
      console.log("Whisper API呼び出し準備中...");
      console.log("APIキーの最初の5文字:", process.env.OPENAI_API_KEY.substring(0, 5));
      console.log("ファイルパス:", req.file.path);
      
      // ファイル情報の詳細表示
      let fileStats = null;
      try {
        fileStats = fs.statSync(req.file.path);
        console.log(`ファイル存在確認: 存在します`);
        console.log(`ファイルサイズ: ${fileStats.size} bytes`);
      } catch (error) {
        console.error('ファイル情報取得エラー:', error);
        return res.status(400).json({ error: 'ファイル情報の取得に失敗しました' });
      }
      
      // 空のファイルが送信された場合はテストモードで動作
      if (fileStats.size === 0) {
        console.log("空のファイルがアップロードされました - テストモードで動作します");
        
        // 処理後にファイルを削除
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("ファイル削除エラー:", err);
        });
        
        // テストモードのレスポンスを返す
        const mockTranscript = "ブロック名はB5です。配管のサポートが外れており、接続部が破損しています。修理が必要です。";
        console.log("テストモード文字起こし:", mockTranscript);
        return res.json({ transcript: mockTranscript });
      }
      
      try {
        // デバッグモードの場合は、実際のAPI呼び出しをスキップしてモックレスポンスを返す
        if (DEBUG_MODE) {
          console.log("[デバッグモード] API呼び出しをスキップしてモック応答を返します");
          
          // 処理後にファイルを削除
          fs.unlink(req.file.path, (err) => {
            if (err) console.error("ファイル削除エラー:", err);
          });
          
          // デバッグモードのモックレスポンス
          const debugTranscript = "これはデバッグモードの返答です。ブロック名はB5で、配管サポートが損傷しています。";
          return res.json({ transcript: debugTranscript });
        }
        
        // 実際のAPI呼び出し
        console.log("Whisper API呼び出し準備中...");
        
        // リクエスト準備 - FormDataは不要になりました（OpenAI SDKが内部で処理）
        console.log("リクエスト準備完了 - 送信開始");
        
        // OpenAI API v4向けのファイル送信方法
        const transcription = await openai.audio.transcriptions.create({
          file: fs.createReadStream(req.file.path),
          model: 'whisper-1',
          language: 'ja'
        });
        
        console.log("文字起こし成功:", transcription.text);
        
        // 処理後にファイルを削除
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("ファイル削除エラー:", err);
        });
    
        res.json({ transcript: transcription.text });
      } catch (whisperErr) {
        console.error("エラー発生:", whisperErr);
        if (whisperErr.response) {
          console.error("レスポンスデータ:", whisperErr.response.data);
          console.error("ステータスコード:", whisperErr.response.status);
          console.error("ヘッダー:", whisperErr.response.headers);
        } else if (whisperErr.request) {
          console.error("リクエスト情報:", "(リクエストは送信されましたが、レスポンスは受信されませんでした)");
        } else {
          console.error("エラー詳細:", whisperErr.message);
        }
        
        // ファイルを削除
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("ファイル削除エラー:", err);
        });
        
        // デバッグモードならモックレスポンスを返す
        if (DEBUG_MODE) {
          console.log("エラー発生時のフォールバック: デバッグモードでモックレスポンスを返します");
          const fallbackTranscript = "エラー発生時のフォールバック応答です。ブロック名はB5で、エラーが発生しましたがテストモードで継続します。";
          return res.json({ transcript: fallbackTranscript });
        }
        
        // デバッグモードでない場合は通常のエラーレスポンス
        throw whisperErr;
      }
    } catch (apiError) {
      console.error("OpenAI APIエラー詳細:", apiError.response ? apiError.response.data : apiError.message);
      res.status(500).json({ error: "Whisper APIエラー: " + (apiError.response ? JSON.stringify(apiError.response.data) : apiError.message) });
    }
  } catch (err) {
    console.error("Whisperエラー全体:", err);
    res.status(500).json({ error: "Whisper変換失敗" });
  }
});

// 要約とブロック推定 API エンドポイント
app.post("/api/summarize", async (req, res) => {
  const { text, blocks } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: "テキストが提供されていません" });
  }

  // APIキーが設定されていない場合はモックモードで動作
  if (!process.env.OPENAI_API_KEY) {
    console.log("警告: OpenAI APIキーが設定されていません - テストモードで動作します");
    
    // テキスト内にブロック名が含まれるか確認
    const blockGuess = text.includes("B5") ? "B5" : 
                     text.includes("BOA") ? "BOA" : 
                     text.includes("BOF") ? "BOF" : 
                     blocks.length > 0 ? blocks[0] : "";
    
    // モックの要約を生成
    const mockSummary = "配管のサポートが外れており、接続部分が流出しています。修理が必要です。";
    
    const result = {
      summary: mockSummary,
      blockGuess: blockGuess
    };
    
    console.log("テストモード結果:", result);
    return res.json(result);
  }

  // 実際のChatGPT APIを使用
  console.log("要約とブロック推定 API呼び出し");
  console.log("入力テキスト:", text);
  
  // ChatGPT API呼び出し（v4スタイル）
  try {
    const chatResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `あなたは造船所の技術サポートアシスタントです。
            報告された不具合をもとに、簡潔に要約し、ブロック名を抽出してください。
            ブロック名は以下のリストから最も適切なものを1つだけ選んでください。
            ${blocks.join(', ')}
            
            必ずJSON形式で以下のフォーマットに従って回答してください：
            {
              "blockName": "抜き出したブロック名をここに記入",
              "summary": "不具合内容の要約をここに記入"
            }`
        },
        { role: "user", content: `${text}` }
      ],
      temperature: 0.7,
      max_tokens: 300,
      response_format: { type: "json_object" }
    });

    const responseText = chatResponse.choices[0].message.content;
    console.log("ChatGPT応答成功:", responseText);
    
    // 応答がJSON形式かテキスト形式かを確認
    let result;
    try {
      result = JSON.parse(responseText);
      console.log("JSON形式の応答:", result);
    } catch (parseErr) {
      // JSONでない場合はテキストとして処理
      console.log("テキスト形式の応答を処理");
      result = { summary: responseText, blockGuess: "" };
    }
    
    res.json(result);
  } catch (error) {
    console.error("ChatGPT APIエラー:", error);
    // デバッグモードの場合はモックレスポンスを返す
    if (DEBUG_MODE) {
      const mockResponse = {
        blockName: "B5",
        summary: "配管サポートが損傷しています。修理が必要です。"
      };
      console.log("デバッグモードのレスポンスを返します:", mockResponse);
      return res.json(mockResponse);
    }
    res.status(500).json({ error: "要約・ブロック推定失敗: " + error.message });
  }
});

// 最近の船体番号を取得するAPIエンドポイント（実際の実装ではデータベースから取得）
app.get("/api/recent-ships", async (req, res) => {
  try {
    // Supabaseから最近の船体番号を取得する試み
    let recentShips = [];
    
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('ship_no')
        .order('date', { ascending: false })
        .limit(3);
      
      if (!error && data && data.length > 0) {
        // 重複を除去して最近の船体番号を取得
        recentShips = [...new Set(data.map(item => item.ship_no))];
        console.log('データベースから船体番号を取得:', recentShips);
      }
    } catch (dbError) {
      console.error('データベースエラー:', dbError);
    }
    
    // データがない場合はデフォルト値を追加
    if (recentShips.length === 0) {
      recentShips = ["345", "346", "347"];
    }
    
    res.json({ ships: recentShips });
  } catch (error) {
    console.error('船体番号取得エラー:', error);
    res.status(500).json({ error: '船体番号の取得に失敗しました', ships: ["345", "346", "347"] });
  }
});

// 報告データをSupabaseに保存するAPIエンドポイント
app.post("/api/save-report", async (req, res) => {
  try {
    const { date, reporter, shipNo, blockName, content } = req.body;
    
    // 必須パラメーターの検証
    if (!date || !reporter || !shipNo || !blockName || !content) {
      return res.status(400).json({ error: "必須項目が不足しています" });
    }
    
    // Supabaseにreportsテーブルにデータを挿入
    console.log('保存データ:', { date, reporter, shipNo, blockName, content });
    
    try {
      const { data, error } = await supabase
        .from('reports')
        .insert([
          { 
            date, 
            reporter, 
            ship_no: shipNo, 
            block: blockName, 
            content, 
            cause: '', 
            status: '', 
            assignee: '' 
          }
        ])
        .select();
      
      if (error) {
        console.error("Supabase保存エラー:", error);
        const errorDetails = JSON.stringify(error, null, 2);
        console.error('詳細エラー情報:', errorDetails);
        return res.status(500).json({ 
          error: "データ保存に失敗しました: " + error.message,
          details: errorDetails,
          code: error.code || 'unknown'
        });
      }
      
      // 成功時のログ
      console.log('データ保存成功:', data);
    } catch (insertError) {
      console.error('予期しないエラー:', insertError);
      return res.status(500).json({ 
        error: "予期しないエラーが発生しました", 
        message: insertError.message,
        stack: process.env.NODE_ENV === 'development' ? insertError.stack : undefined
      });
    }
    
    return res.json({ success: true, message: "報告が保存されました" });
    
  } catch (err) {
    console.error("データ保存エラー:", err);
    return res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

// ブロックリストを取得するAPIエンドポイント
app.get("/api/blocks", (req, res) => {
  // 実際の造船所ブロックを定義
  const blocks = [
    "BOA", "BAF", "BOF", "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9", "B10", "B11", "B12",
    "SA1", "SA1A", "SA1F", "SA2", "SA2C", "SA3", "SA3C",
    "AP1", "AP2",
    "AHA", "AHF", "AH", "AH2", "AH3", "AH4", "AH5", "AH6",
    "AH2A", "AH3A", "AH4A", "AH5A", "AH6A",
    "AH2F", "AH3F", "AH4F", "AH5F", "AH6F",
    "L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9", "L10", "L11", "L12", "L13",
    "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10", "S11", "S12", "S13",
    "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10", "D11", "D12", "D13",
    "DC1", "DC2", "DC3", "DC4", "DC5", "DC6", "DC7", "DC8", "DC9", "DC10", "DC11", "DC12", "DC13",
    "FP1", "FP2", "FP3", "FP4",
    "BF", "FH", "BC", "BUL1", "BUL2"
  ];
  res.json({ blocks });
});

// HTML5 履歴APIのフォールバック
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// サーバー起動
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
