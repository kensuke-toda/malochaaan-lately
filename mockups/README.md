# UIモックアップ（G1）

Next.js実装前に見た目を確定させるための、単体HTML（Tailwind CDN使用）。ビルド不要、ブラウザで直接開けます。

## 見方

`mockups/top.html` をダブルクリックしてブラウザで開く。右上の「ログイン切替」で、＋追加ボタンの表示／非表示を確認できます。カレンダーの日付をクリックすると、その日の記録が下に出ます。お店がある日は日付マスに写真が出ます。

## デザイントーン（方針変更3）

参考サイト（yriica）に近い、彩度のあるカーキ／クリーム基調。白背景は使わない。色は Tailwind のカスタム名に頼らず、`#E8DFD0` などを直接指定している（前回、カスタム色が効かず白く見えたため）。

| 用途 | 色 |
|---|---|
| ページ背景 | `#E8DFD0` |
| カード | `#F4EEE4` |
| 本文 | `#2F2A24` |
| サブテキスト | `#6B6258` |
| ボタン／Places | `#B85C38` |
| Things ドット | `#C9A227` |
| Books ドット | `#8B5A6B` |
| Sounds ドット | `#6B7C4F` |
| Posts ドット | `#4F7C73` |
| Works ドット | `#A65D3F` |

見出しは `Fraunces`、本文は `Nunito Sans`。

## ファイル一覧

| ファイル | 対応するWBS | 内容 |
|---|---|---|
| `top.html` | G1-1, G1-7, G1-8, G1-9 | 6セクション＋各追加モーダル。Placesはカレンダー（写真サムネイル） |
| `thing-detail.html` | G1-2 | モノの詳細 |
| `post-detail.html` | G1-3 | 投稿の詳細（旧 Diary） |
| `login.html` | G1-4 | ログイン（サインアップなし） |
| `admin.html` | G1-5 | 6セクションの一覧・編集・削除のみ |
| `place-detail.html` | G1-6 | お店の詳細 |
| `book-detail.html` | G1-10 | 本の詳細 |
| `sound-detail.html` | G1-11 | 音楽の詳細 |
| `work-detail.html` | G1-12 | 仕事の詳細（写真なし） |

旧 `diary-detail.html` は `post-detail.html` に置き換えた。
