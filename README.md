# MyMeshMap Japan

行ったことがある場所をメッシュ単位で記録する訪問ログツールです。

地図上のメッシュをタップ/クリックするだけで、訪問済みの場所を赤く塗りつぶして記録できます。データはクラウドに保存され、スマホとPCで同じ地図を共有できます。

## 機能

- **メッシュ記録** — 第2次地域区画（JIS X 0410、約10km四方）単位で訪問済みの場所を記録
- **地図モード切替** — カラー / グレースケール / 白地図（海岸線のみ）
- **メッシュ線ON/OFF** — ズーム7以上でメッシュグリッドを表示。OFF時は隣接メッシュが隙間なく塗りつぶされる
- **クラウド同期** — Cloudflare D1 に保存し、複数デバイスで同期
- **デバイス間引き継ぎ** — QRコードまたはIDを使って別デバイスへ移行
- **ID再発行** — IDが漏れた場合に新しいIDへデータごと移行（旧IDは無効化）
- **設定の永続化** — 地図モードとメッシュ線のON/OFFもクラウドに保存

## 技術構成

| 項目 | 内容 |
|------|------|
| フロントエンド | HTML + Vanilla JS（シングルファイル） |
| 地図ライブラリ | [MapLibre GL JS](https://maplibre.org/) v5 |
| 地図タイル | [国土地理院](https://maps.gsi.go.jp/development/ichiran.html)（標準地図 / 白地図） |
| ホスティング | Cloudflare Pages |
| API | Cloudflare Pages Functions |
| データベース | Cloudflare D1（SQLite） |
| メッシュ規格 | JIS X 0410 第2次地域区分（6桁コード） |

## ディレクトリ構成

```
mymeshmap/
├── index.html              # メインアプリ（フロントエンド）
├── functions/
│   └── api/
│       ├── sync.js         # 訪問済みメッシュの取得・保存
│       ├── settings.js     # ユーザー設定の取得・保存
│       └── reissue.js      # ID再発行（データ移行）
├── schema.sql              # D1 テーブル定義
└── wrangler.toml           # Cloudflare 設定
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

```sh
wrangler pages deploy .
```

## 使い方

1. ブラウザで開くと自動的にユーザーIDが発行されます
2. ズームレベル7以上に拡大するとメッシュグリッドが表示されます
3. 訪れたことのある場所のメッシュをクリック/タップすると赤く塗りつぶされます
4. データは自動的にクラウドへ保存されます

### デバイス間の引き継ぎ

ユーザー設定（👤ボタン）を開き、QRコードをスマホで読み取るか、IDを別デバイスに貼り付けてください。

> ⚠ QRコードとURLはパスワードと同等です。第三者に見せないでください。

### IDが漏れた場合

ユーザー設定の「IDを再発行」からデータをそのまま新しいIDに移行できます。旧IDは即時無効化されます。
