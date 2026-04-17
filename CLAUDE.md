# CLAUDE.md

## プロジェクト概要

行ったことがある場所を地図上のメッシュ（第2次地域区分, JIS X 0410, 約10km四方）単位で記録するWebアプリ。フロントエンドはシングルファイル、バックエンドはCloudflare Pages Functions + D1。

## アーキテクチャ

- **フロントエンド**: `index.html` 1ファイルにHTML/CSS/JSをすべて記述（バンドル不要）
- **地図**: MapLibre GL JS v5.3.0（CDN）+ 国土地理院タイル
- **バックエンド**: Cloudflare Pages Functions（`functions/api/`）
- **DB**: Cloudflare D1（SQLite）、バインディング名 `DB`
- **認証**: UUID v4ベースのユーザーID（登録不要、ブラウザ生成）

## ローカル開発・デプロイ

```sh
# ローカル起動（http://localhost:8788）
wrangler pages dev .

# デプロイ
wrangler pages deploy .

# DBスキーマ適用（初回 or スキーマ変更時）
wrangler d1 execute mymeshmap-db --remote --file=schema.sql
```

## ファイル構成

| ファイル | 役割 |
|---|---|
| `index.html` | メインアプリ（フロントエンド全体） |
| `functions/api/sync.js` | 訪問済みメッシュの GET/POST |
| `functions/api/settings.js` | ユーザー設定の GET/POST |
| `functions/api/reissue.js` | ID再発行（データ移行 + 旧ID削除） |
| `schema.sql` | D1テーブル定義（visits, settings） |
| `sw.js` | Service Worker（CDNキャッシュ、オフライン対応） |
| `manifest.json` | PWAマニフェスト |
| `wrangler.toml` | Cloudflare設定（D1バインディングなど） |

## index.html の主要構造

- **定数**: `LS_KEY`（localStorage キー）、`API_BASE`、`ATTRIBUTION`
- **状態**: `visitedSet`（訪問済みコードのSet）、`userId`、`mapMode`、`showLines`
- **初期化フロー**:
  1. ページロード直後にlocalStorageからID・設定を読み込む（フラッシュ防止）
  2. `map.on('load')` でクラウドからデータ・設定を取得して適用
- **同期**:
  - 訪問トグル時: 500ms debounce後に `/api/sync` へ POST
  - ページフォーカス復帰時: 30秒スロットルで自動同期
  - 手動: ユーザー設定モーダルの「今すぐ同期」ボタン

## メッシュ座標計算（JIS X 0410 第2次地域区分）

```
コード（6桁）例: "533945"
  p = 53, u = 39, r = 4, c = 5

SW隅の座標:
  lat_sw = p / 1.5 + r / 12
  lng_sw = (u + 100) + c * 0.125

セルサイズ: 緯度方向 1/12°, 経度方向 1/8°
```

## DBスキーマ

- `visits(user_id, mesh_code, created_at)` — 複合PK
- `settings(user_id, key, value, updated_at)` — 複合PK
  - `key` の値: `map_mode`（"standard"/"grayscale"/"white"）、`show_lines`（true/false）

## SNSシェア機能（shareMap）

- `map` の初期化オプションに `preserveDrawingBuffer: true` が必要（ないと `toBlob()` が真っ黒になる）。
- シェアボタン押下時のフロー:
  1. `map.setMinZoom(1)` で一時的にズーム制限を解除
  2. `#map` コンテナを CSS で `600×600px` の正方形に変更
  3. `requestAnimationFrame` 後に `map.resize()` （レイアウト反映を待つ）
  4. `fitBounds([[122.933, 20.417], [153.983, 45.550]], { padding: 24, animate: false })` で日本全域を収める
  5. `map.once('idle')` でタイル読み込み完了を待つ
  6. `map.getCanvas().toBlob()` でキャプチャ（canvas がすでに正方形なのでクロップ不要）
  7. Canvas 2D で `MyMeshMap` + `© 国土地理院` バッジを右下に焼き込む
  8. モバイル（iOS/Android）は `navigator.share()`、PC は `<a download>` でダウンロード
  9. `finally` でコンテナ CSS・minZoom・地図モード・カメラ位置を復元
- macOS の `navigator.share()` はシェアシートが開くがダウンロードオプションがないため、UA 判定でモバイルのみ使用する。

## JAPAN_REGIONS（日本領域判定）

`isInJapan()` 関数でメッシュ中心点が日本領域かどうかを判定している。以下の離島・北方領土が含まれていることを確認すること:

- 沖ノ鳥島: `[20.2, 20.8, 135.8, 136.4]`
- 南鳥島: `[24.1, 24.5, 153.7, 154.2]`
- 択捉島: `[43.5, 45.6, 146.0, 149.2]`
- 北海道（納沙布岬・国後含む）: 東端を `146.2°E` まで拡張済み

## 注意事項

- `index.html` は1ファイル完結。外部JSファイルに分割しない。
- DBに書き込むのはユーザーが最初にメッシュをタップ/設定を変更したときのみ（初回ロード時は書き込まない）。
- MapLibre attribution は `attributionControl.customAttribution` で `MapLibre | 国土地理院 | GitHub` の3つを明示する（v5ではこの指定がデフォルトのMapLibreブランディングを上書きするため）。
- Service Worker のキャッシュキー (`CACHE`) を変えるとき、合わせて `sw.js` のバージョン文字列を更新する。
- **D1 のバインドパラメータ上限は100**。複数行 INSERT は `env.DB.batch()` で1行ずつ発行する（`VALUES (?,?),(?,?),...` でまとめると上限超えでクラッシュする）。
- モーダルヘッダーのドラッグ実装では `touchstart` に `preventDefault()` を使っているが、ヘッダー内のボタンは除外すること（`e.target.closest('button')` で判定）。除外しないとボタンの `click` が発火しない。
- スマホでUUIDが電話番号リンクになるのを防ぐため `<meta name="format-detection" content="telephone=no">` を設定済み。
- ユーザー設定モーダルはスマホ（≤480px）でフルスクリーン表示（CSS メディアクエリで制御）。
