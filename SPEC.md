# MyMeshMap 仕様書

## 概要

行ったことがある場所を地図上のメッシュ（第2次地域区分, JIS X 0410, 約10km四方）単位で記録するWebアプリ。

- **URL**: https://mymeshmap.pages.dev
- **対象**: 日本国内の訪問記録（離島・北方領土を含む）
- **アカウント登録不要**: UUID v4をブラウザで生成してユーザーIDとする

---

## 機能一覧

### 地図表示
- MapLibre GL JS v5.3.0 + 国土地理院タイルで日本地図を表示
- 訪問済みメッシュをオレンジ色（`rgba(255, 140, 0, 0.4)`）で塗り潰し表示
- 地図モード: standard（標準）/ grayscale（グレースケール）/ white（白地図）
- メッシュ境界線の表示/非表示切り替え

### メッシュ操作
- 地図タップで対象メッシュの訪問済み/未訪問をトグル
- メインモーダルに現在クリックしたメッシュのコードと訪問状態を表示
- 訪問済みメッシュ数をメインモーダルに表示

### 移動記録（GPS）
- `navigator.geolocation.watchPosition` で現在地を継続取得
- 現在地メッシュを青くハイライト + 青いパルスアニメーションのマーカー表示
- 未訪問メッシュへ移動すると自動で訪問済みに追加
- 日本領域外は無視（`isInJapan()` で判定）
- ボタン状態: OFF → 測位待ち（オレンジ）→ 測位成功（グリーン）

### データ同期
- 訪問トグル後 500ms debounce で `/api/sync` へ POST
- ページフォーカス復帰時に 30秒スロットルで自動同期
- ユーザー設定モーダルの「今すぐ同期」ボタンで手動同期

### SNSシェア
- 日本全域を収めた 600×600px の地図画像を生成
- 右下に `MyMeshMap` + `© 国土地理院` バッジを焼き込み
- モバイル（iOS/Android/Capacitor）: `navigator.share()` で共有
- PC: `<a download>` でダウンロード

### ユーザー設定モーダル
- ユーザーID表示・QRコード表示・URLコピー
- 地図モード切り替え（standard / grayscale / white）
- メッシュ境界線 表示/非表示
- 「今すぐ同期」ボタン
- ID再発行（`/api/reissue` で旧データを新IDに移行）
- スマホ（≤480px）ではフルスクリーン表示

### メインモーダルの折りたたみ
- ヘッダーのダブルクリック or ダブルタップ（300ms以内）でトグル
- 折りたたみ時は `#modal-header` のみ表示（`border-radius: 8px` で角丸）

### PWA / Service Worker
- `manifest.json` + `sw.js` でPWAとしてインストール可能
- CDNリソース（MapLibre, QRCode.js）のキャッシュでオフライン対応

### Capacitor対応（iOS）
- `IS_CAPACITOR = typeof window.Capacitor !== 'undefined'` で判定
- `API_BASE`: Capacitor環境では絶対URL、Web環境では相対パス
- バックグラウンド位置追跡は今後対応予定

---

## API仕様

ベースURL: `https://mymeshmap.pages.dev/api`  
全エンドポイントに `Access-Control-Allow-Origin: *` を付与。

### GET /api/sync

訪問済みメッシュコード一覧を取得する。

**リクエスト**

| パラメータ | 場所 | 必須 | 説明 |
|---|---|---|---|
| `user_id` | クエリ | ○ | UUID v4 形式のユーザーID |

**レスポンス 200**

```json
{ "meshes": ["533945", "533946", ...] }
```

**レスポンス 400**

```json
{ "error": "user_id required" }
```

---

### POST /api/sync

訪問済みメッシュをまとめて保存する（全件洗い替え）。

**リクエストボディ**

```json
{ "user_id": "<uuid>", "meshes": ["533945", "533946", ...] }
```

**レスポンス 200**

```json
{ "ok": true, "count": 42 }
```

**レスポンス 400**

```json
{ "error": "user_id and meshes required" }
```

---

### GET /api/settings

ユーザー設定を全件取得する。

**リクエスト**

| パラメータ | 場所 | 必須 | 説明 |
|---|---|---|---|
| `user_id` | クエリ | ○ | UUID v4 形式のユーザーID |

**レスポンス 200**

```json
{
  "settings": {
    "map_mode": "standard",
    "show_lines": true
  }
}
```

---

### POST /api/settings

ユーザー設定を1件保存する（UPSERT）。

**リクエストボディ**

```json
{ "user_id": "<uuid>", "key": "map_mode", "value": "grayscale" }
```

`value` は `JSON.stringify()` して保存し、取得時に `JSON.parse()` して返す。

**レスポンス 200**

```json
{ "ok": true }
```

**設定キー一覧**

| key | 型 | 値 |
|---|---|---|
| `map_mode` | string | `"standard"` / `"grayscale"` / `"white"` |
| `show_lines` | boolean | `true` / `false` |

---

### POST /api/reissue

ユーザーIDを再発行し、旧IDのデータを新IDへ移行して旧IDを削除する。

**リクエストボディ**

```json
{ "old_user_id": "<uuid>", "new_user_id": "<uuid>" }
```

**レスポンス 200**

```json
{ "ok": true }
```

**レスポンス 400**

```json
{ "error": "old_user_id and new_user_id required" }
{ "error": "IDs must differ" }
```

---

## データモデル

### visits テーブル

| カラム | 型 | 説明 |
|---|---|---|
| `user_id` | TEXT | UUID v4 |
| `mesh_code` | TEXT | JIS X 0410 第2次地域区分コード（6桁） |
| `created_at` | TEXT | ISO 8601 形式（UTC, SQLite `datetime('now')`） |

複合PK: `(user_id, mesh_code)`

### settings テーブル

| カラム | 型 | 説明 |
|---|---|---|
| `user_id` | TEXT | UUID v4 |
| `key` | TEXT | 設定キー（`map_mode`, `show_lines`） |
| `value` | TEXT | `JSON.stringify()` した値 |
| `updated_at` | TEXT | ISO 8601 形式（UTC） |

複合PK: `(user_id, key)`

---

## メッシュコード計算（JIS X 0410 第2次地域区分）

6桁コード例: `"533945"`

```
p = 53  (上2桁: 緯度インデックス)
u = 39  (次2桁: 経度インデックス)
r =  4  (5桁目: 緯度細分)
c =  5  (6桁目: 経度細分)

SW隅の座標:
  lat_sw = p / 1.5 + r / 12
  lng_sw = (u + 100) + c * 0.125

セルサイズ:
  緯度方向  1/12° ≈ 9.25 km
  経度方向  1/8°  ≈ 9.1 km（北緯35°付近）
```

---

## 日本領域判定（JAPAN_REGIONS）

`isInJapan()` はメッシュ中心点の座標が以下のいずれかの矩形に含まれるかで判定する。

| 地域 | 緯度範囲 | 経度範囲 |
|---|---|---|
| 本州・四国・九州（主要部） | 30.0–46.5 | 129.0–146.2 |
| 沖縄・南西諸島 | 24.0–31.0 | 122.0–131.5 |
| 沖ノ鳥島 | 20.2–20.8 | 135.8–136.4 |
| 南鳥島 | 24.1–24.5 | 153.7–154.2 |
| 択捉島 | 43.5–45.6 | 146.0–149.2 |

北海道東端（納沙布岬・国後島を含む）は経度 `146.2°E` まで拡張済み。

---

## 非機能要件

- **認証なし**: ユーザーIDはブラウザ生成のUUID、パスワード不要
- **プライバシー**: サーバー側でユーザーを識別する情報はUUIDのみ
- **オフライン**: Service Workerによりページ自体はオフラインで動作
- **CORS**: 全APIに `Access-Control-Allow-Origin: *`（Capacitorアプリからのアクセスに必要）
- **D1制約**: バインドパラメータ上限100のため、bulk insertは `batch()` で1行ずつ実行
