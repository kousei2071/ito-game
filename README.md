# ito (React + Node.js)

ブラウザで遊べる、協力推理ゲーム「ito」風オンラインゲームの開発計画です。  
このREADMEだけで、MVP仕様・実装順・運用方針まで確認できます。

---

## 1. 目的

- React + Node.js でリアルタイムに遊べる itoゲームを作る
- まずは **最短で遊べるMVP** を完成させる
- その後、対戦・拡張モード・運用機能を段階的に追加する

---

## 2. ゲーム概要（MVP）

- ジャンル: 協力型推理ゲーム
- 想定人数: 4〜8人 / 1ルーム
- ラウンド数: 10ラウンド固定
- 数字レンジ: 1〜100
- お題: 固定100題
- 基本ルール:
  1. 各プレイヤーに秘密の数字を配布
  2. 共通お題に対して、数字に応じた一言ヒントを送信
  3. 全員の発言を見て、プレイヤーを小さい順に並べ替え
  4. 並び順が正しければ成功、誤りがあれば失敗
  5. 10ラウンド終了時に総合スコアを表示

---

## 3. 技術スタック

### フロントエンド（React）

- React
- Vite
- TypeScript
- Socket.IO Client
- 状態管理: まずは React state / context で最小構成
- DnD: `@dnd-kit` など（並び替えUI用）

### バックエンド（Node.js）

- Node.js
- Express
- Socket.IO
- TypeScript
- データ保持:
  - MVP: メモリ管理
  - 将来: Redis / PostgreSQL

### インフラ（後段）

- フロント: Vercel / Netlify
- API+Socket: Render / Railway / Fly.io

---

## 4. 推奨ディレクトリ構成（モノレポ）

```txt
ito/
  README.md
  package.json
  apps/
    client/        # React
    server/        # Node.js + Socket.IO
  packages/
    shared/        # 型定義・イベント名・共通ロジック
```

---

## 5. 画面一覧（MVP）

1. ルーム作成 / 参加画面
2. ロビー画面（参加者一覧、準備完了）
3. ラウンド画面
   - お題表示
   - ヒント入力
   - 並び替えUI
4. 結果画面（正誤、正解順、ラウンド得点）
5. 最終結果画面（10ラウンド合計）

---

## 6. サーバー側機能（MVP）

- ルーム管理
  - 作成、参加、退出
  - ホスト権限（ゲーム開始）
  - 再接続（同一プレイヤー復帰）
- ゲーム進行ステート管理
  - `lobby -> clue -> arrange -> result -> nextRound -> finished`
- ラウンド制御
  - 数字配布
  - お題配布
  - ヒント収集
  - 並び替え確定
- 判定ロジック
  - 並び順の正解チェック
  - ラウンド得点 / 累積得点の計算
- リアルタイム同期
  - Socketイベントで全員に即時反映

---

## 7. 共有型（shared package）

以下は `packages/shared` に置く:

- `Player`
- `Room`
- `GameState`
- `RoundState`
- `SocketEvent`（client->server / server->client）
- バリデーション用schema（必要なら zod）

---

## 8. 実装ロードマップ

### Phase 0: MVP要件確定

- [x] 人数・ラウンド数・お題数を確定
- [x] ゲームフロー確定
- [x] MVPスコープを固定（追加機能は後回し）

### Phase 1: モノレポ初期化

- [ ] `apps/client` を作成（Vite + React + TS）
- [ ] `apps/server` を作成（Node + Express + Socket.IO + TS）
- [ ] `packages/shared` を作成（共通型）
- [ ] ワークスペース設定（npm workspaces / pnpm など）

### Phase 2: Socket通信基盤

- [ ] 接続・切断処理
- [ ] イベント定義の共通化
- [ ] 疎通確認（join/leaveの往復）

### Phase 3: ルーム管理

- [ ] ルーム作成・参加・退出
- [ ] プレイヤー一覧同期
- [ ] ホスト操作（開始ボタン）
- [ ] 再接続対応

### Phase 4: ラウンド進行管理

- [ ] フェーズ遷移実装
- [ ] 数字配布
- [ ] お題配布
- [ ] ヒント締切/並び替え締切

### Phase 5: フロント主要画面

- [ ] ルーム作成/参加
- [ ] ロビー
- [ ] ラウンド（ヒント入力 + DnD並び替え）
- [ ] 結果 / 最終結果

### Phase 6: 判定・スコア

- [ ] 並び順判定
- [ ] ラウンド得点
- [ ] 累積得点
- [ ] 10ラウンド終了判定

### Phase 7: 通しプレイ検証

- [ ] 4人〜8人で正常動作確認
- [ ] 切断・再接続ケース確認
- [ ] 入力バリデーション確認

### Phase 8: デプロイ準備

- [ ] 環境変数整理
- [ ] 本番URL設定（CORS/Socket）
- [ ] 最低限の運用手順書作成

---

## 9. Socketイベント設計（例）

### Client -> Server

- `room:create`
- `room:join`
- `room:leave`
- `room:ready`
- `game:start`
- `round:submitClue`
- `round:arrange`
- `round:confirmArrange`

### Server -> Client

- `room:updated`
- `game:stateChanged`
- `round:started`
- `round:cluesCollected`
- `round:result`
- `game:finished`
- `error:message`

---

## 10. スコア設計（MVP案）

シンプル重視:

- 正しい並び: +1
- 誤り: 0
- 10ラウンドの合計を最終スコア

将来拡張:

- ずれ数で部分点
- 連続正解ボーナス
- 難易度係数

---

## 11. 拡張候補（MVP後）

- チーム対戦モード
- 発言者匿名モード（高難易度）
- 制限時間ありスピードモード
- カスタムお題機能
- 観戦モード
- 実績 / ランキング
- 荒らし対策（キック・通報・NGワード）

---

## 12. 開発ルール（軽量）

- まずMVPを壊さず完成させる
- 仕様追加はMVP完了後に行う
- 共有型を先に定義して、client/serverの齟齬を防ぐ
- PRごとに「何を検証したか」を記録する

---

## 13. 最初の着手順（すぐ始める用）

1. モノレポ初期化
2. sharedに型とイベント名を定義
3. serverでルーム作成/参加Socket実装
4. clientでルーム作成/参加画面実装
5. ロビー同期まで通す
6. 1ラウンドのみ仮実装して通し確認
7. 10ラウンド化 + 結果画面

---

## 14. TODO（現在）

- [x] MVP要件を確定する
- [x] モノレポ構成を初期化
- [x] Socket通信基盤を実装
- [x] ルーム管理を実装
- [x] ラウンド進行状態を実装
- [x] フロント主要画面を作成
- [x] 判定ロジックとスコア実装
- [ ] 通しプレイを検証
- [ ] デプロイと運用準備

---

## 15. Vercelデプロイ手順（推奨構成）

このゲームは Socket.IO を使うため、**フロントとサーバーを分けてデプロイ**します。

- フロント（React/Vite）: Vercel
- サーバー（Node.js + Socket.IO）: Render / Railway / Fly.io

### 15-1. サーバーを先に公開

1. `apps/server` を Render などにデプロイ
2. 公開URLを取得（例: `https://ito-server.onrender.com`）
3. `GET /health` が `{"status":"ok"}` を返すことを確認

### 15-2. Vercelにクライアントをデプロイ

1. VercelでこのリポジトリをImport
2. Project Settings で以下を指定
  - Root Directory: `apps/client`
  - Build Command: `npm run build`
  - Output Directory: `dist`
3. Environment Variables に追加
  - `VITE_SERVER_URL` = サーバー公開URL（例: `https://ito-server.onrender.com`）
  - Production / Preview / Development すべてに同じ値を設定
4. Deploy を実行

### 15-3. 動作確認

- Vercel公開URLにアクセス
- ルーム作成→ゲーム開始までできることを確認
- 別タブで参加してリアルタイム同期を確認

### 注意

- Vercel単体では長時間接続の Socket.IO サーバー運用に不向きなため、サーバーは別ホスティング推奨
- `VITE_SERVER_URL` 未設定だと本番で接続先が期待とズレるため、必ず設定する
