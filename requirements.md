# Lately（自分の近況・モノ図鑑サイト）

## 1. アプリの概要

自分専用（Ken個人）の近況報告サイト。買ってよかったモノや日々の出来事を、なるべく手間なく記録・公開できることを目的とする。
ログイン画面や複数ユーザー対応は持たない、完全に個人用の公開サイト。

### 参考にしたコンセプト

- 元ツイート: https://x.com/yriica/status/2101276943534768342（「Things」ページに写真を一気に追加、背景透過はChatGPT Imagesが良かった、という投稿）
- 参考記事: https://note.com/yriica/n/n5d83a7b00a5f（「Grok Botに写真をアップするだけで、自動更新される近況報告サイトをつくった」）
- 参考サイト: https://yriica.com

参考事例の要点：
- 写真を送るだけでサイトが更新される「チャットで投稿」体験（管理画面を極力意識させない）
- モノの写真は背景を透過して図鑑っぽく見せる
- 場所の写真は3Dジオラマ風に変換する演出（※本プロジェクトのMVPでは見送り、Phase 3以降で検討）
- セクション構成：Things（もの）/ Places（場所）/ Books（本）/ Sounds（音楽）/ Posts（投稿）/ Works（仕事）

本プロジェクトでは上記のうち **Things（モノ図鑑）** と **日記（Diary）** をMVPのコアとする。

## 2. 開発フェーズ計画

### Phase 1（MVP）：Web投稿フォーム + Things + 日記

- Web上の簡易投稿ページから、モノの写真・日記を登録できる（ログイン不要、自分専用の隠しURLまたは簡易認証で保護）
- Things: 写真をアップロードすると背景透過処理（オープンソースモデルを自前ホスト）を自動実行し、確認後に公開
- 日記: テキスト＋写真、日付順の一覧
- 公開ページ（トップ）でThingsギャラリーと日記を表示

### Phase 2：LINE Bot連携

- 個人のLINE公式アカウント（Messaging API 無料枠）を作成
- LINEで写真を送ると、Botが受信 → 背景透過処理 → 「公開しますか？」と確認 → 承認したら自動でサイトに反映
- 商品URLを一緒に送ると、OGPから商品名・ブランド名・リンクを自動取得してThingsに登録

### Phase 3（将来の拡張、未確定）

- Places（行った場所）セクションの追加。3Dジオラマ風の画像変換演出は費用・精度を見ながら検討
- Books / Sounds / Posts / Works セクションの追加

## 3. 画面構成（Phase 1）

| パス | 内容 |
|------|------|
| `/` | トップページ。Thingsギャラリー＋日記の一覧を表示（公開） |
| `/things/[id]` | モノの詳細（写真・ブランド名・商品名・商品リンク） |
| `/diary/[id]` | 日記の詳細 |
| `/admin`（仮） | 投稿用の簡易フォーム。本人のみアクセス（簡易パスワード認証等で保護、Supabase Authは使わず環境変数ベースの最小構成でも可） |

## 4. データベース設計（案）

- **things** — モノ（`id`, `name`, `brand`, `product_url`, `original_image_url`, `processed_image_url`（背景透過済み）, `created_at`, `sort_order`）
- **diary_entries** — 日記（`id`, `title`, `body`, `entry_date`, `created_at`）
- **diary_photos** — 日記に紐づく写真（`id`, `diary_entry_id`, `image_url`, `sort_order`）

Supabase Storageに元画像・処理済み画像を保存する（バケット例: `things-images`, `diary-images`）。
ログイン機能を持たないため、RLSは「読み取りは全公開、書き込みはService Role経由のみ」というシンプルな方針にする。

## 5. 技術スタック

- **フロントエンド**: Next.js (App Router), Tailwind CSS
- **バックエンド・DB**: Supabase（Database, Storage）※Authは使わない
- **ホスティング**: Vercel（Hobbyプラン、無料枠内）
- **画像の背景透過**: オープンソースモデル（`rembg`等）を無料枠のサーバー（例: Hugging Face Spaces無料枠）でホストし、APIとして呼び出す
- **Bot連携（Phase 2）**: LINE Messaging API（無料枠：Bot→ユーザーへの配信が月200通まで無料。個人利用なら十分）

## 6. 実現可能性メモ

- 技術要素はいずれも無料枠で完結可能（Vercel Hobby / Supabase Free / LINE Messaging API無料枠 / オープンソース背景透過モデル）
- 唯一の懸念はオープンソース背景透過モデルの精度が商用APIに劣る可能性がある点。Phase 1で実際に試して、品質が不十分であれば商用API（少額課金）への切り替えを検討する
- Places（3Dジオラマ）は画像生成の品質・コストの検証が必要なため、Phase 3として明確に切り離した

## 7. 初期リリース（Phase 1）でやらないこと

- ログイン機能・複数ユーザー対応
- LINE Bot連携（Phase 2で対応）
- Places / Books / Sounds / Posts / Works セクション
- 3Dジオラマ風の画像変換
- OGPを使った商品情報自動取得（Phase 2で対応、Phase 1は手動入力）
