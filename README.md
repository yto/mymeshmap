# MyMeshMap

行ったことがある場所を地図上のメッシュ（約10km四方）単位で記録する訪問ログツールです。

タップ/クリックするだけで記録でき、スマホとPCで同じデータを共有できます。アカウント登録は不要です。

## 使い方

### はじめて使う

1. [mymeshmap.pages.dev](https://mymeshmap.pages.dev) をブラウザで開く
2. 自動的にあなた専用のIDが発行されます（登録不要）
3. 地図をズームレベル7以上に拡大するとメッシュグリッドが表示されます
4. 訪れたことのある場所のメッシュをタップ/クリックすると赤く塗りつぶされます
5. データは自動的にクラウドへ保存されます

### スマホのホーム画面に追加（PWA）

iPhoneの場合はSafariで開き「ホーム画面に追加」、Androidの場合はChromeで「アプリをインストール」を選ぶと、ネイティブアプリのように使えます。

### 複数デバイスで同じデータを使う

ユーザー設定（👤ボタン）を開き、QRコードをもう一方のデバイスで読み取ってください。

> ⚠ QRコードとURLはパスワードと同等です。第三者に見せないでください。

### IDが漏れてしまった場合

ユーザー設定の「IDを再発行」を使うと、データをそのまま新しいIDに移行できます。旧IDは即時無効化されます。

## 機能

- **メッシュ記録** — 第2次地域区画（JIS X 0410、約10km四方）単位で訪問済みの場所を記録
- **地図モード切替** — カラー / グレースケール / 白地図（海岸線のみ）
- **グリッド線ON/OFF** — ズーム7以上でグリッドを表示。OFF時は隣接メッシュが隙間なく塗りつぶされる
- **SNSシェア** — 日本全域（与那国島〜南鳥島・沖ノ鳥島〜択捉島）を収めた正方形画像を生成。スマホはネイティブシェアシート、PCはダウンロード。「© 国土地理院」クレジット入り
- **クラウド同期** — Cloudflare D1 に保存し、複数デバイスで同期
- **デバイス間引き継ぎ** — QRコードまたはIDを使って別デバイスへ移行
- **ID再発行** — IDが漏れた場合に新しいIDへデータごと移行（旧IDは無効化）
- **設定の永続化** — 地図モードとグリッド線のON/OFFもクラウドに保存
- **手動同期** — ユーザー設定画面から任意のタイミングでクラウド同期を実行
- **PWA対応** — ホーム画面への追加・オフライン時のフォールバックに対応

---

## 開発ログ

このプロジェクトは [Claude Code](https://claude.ai/code) との対話で開発しました。設計・実装・改善の対話ログ（途中まで）を [session-log.md](session-log.md) に収録しています。

---

## 技術構成

| 項目 | 内容 |
|------|------|
| フロントエンド | HTML + Vanilla JS（シングルファイル） |
| 地図ライブラリ | [MapLibre GL JS](https://maplibre.org/) v5 |
| 地図タイル | [国土地理院](https://maps.gsi.go.jp/development/ichiran.html)（標準地図 / 白地図） |
| ホスティング | Cloudflare Pages |
| API | Cloudflare Pages Functions |
| データベース | Cloudflare D1（SQLite） |
| PWA | Service Worker + Web App Manifest |
| メッシュ規格 | JIS X 0410 第2次地域区分（6桁コード） |

## ディレクトリ構成

```
mymeshmap/
├── index.html              # メインアプリ（フロントエンド）
├── manifest.json           # PWA マニフェスト
├── sw.js                   # Service Worker（オフライン対応・CDNキャッシュ）
├── favicon.svg             # ファビコン（ブラウザタブ用）
├── icon.svg                # PWAアイコン（ホーム画面用、512×512）
├── functions/
│   └── api/
│       ├── sync.js         # 訪問済みメッシュの取得・保存
│       ├── settings.js     # ユーザー設定の取得・保存
│       └── reissue.js      # ID再発行（データ移行）
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions（main push → 自動デプロイ）
├── schema.sql              # D1 テーブル定義
├── wrangler.toml           # Cloudflare 設定
└── conversation_log.md     # Claude Code との開発対話ログ
```

## セットアップ

### 前提

- [Node.js](https://nodejs.org/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm install -g wrangler`)
- Cloudflare アカウント

### D1 データベースの作成

```sh
wrangler d1 create mymeshmap-db
```

取得した `database_id` を `wrangler.toml` に設定します。

```sh
wrangler d1 execute mymeshmap-db --remote --file=schema.sql
```

### ローカル開発

```sh
wrangler pages dev .
```

`http://localhost:8788` で起動します。

### デプロイ

`main` ブランチへ push すると GitHub Actions が自動的に Cloudflare Pages へデプロイします。

手動でデプロイする場合:

```sh
wrangler pages deploy .
```
