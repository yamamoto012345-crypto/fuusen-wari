# ふうせんわり

ふうせんをタッチして割るだけの、2〜5歳向けスマホ対応PWA（Progressive Web App）。
風船を割って点数をかせぐ。**風船が1つでも画面の上端に着いたらおしまい**。
最初の30秒は一定の速さで、その後約2分かけて風船の出る間隔と上昇が少しずつ速くなり、頭打ちになる。
最高スコアは右上に表示し、この端末のブラウザの `localStorage`（キー `fuusen-wari-best`）に保存する。
履歴・キャッシュを消すと最高スコアも消える。端末をまたいだ共有はしない。

## 構成ファイル

| ファイル | 役割 |
| --- | --- |
| `index.html` | 画面（スタート表示・スコア） |
| `style.css` | 見た目（背景・風船・星のアニメーション） |
| `app.js` | ゲーム本体（風船の生成・割る処理・効果音はWebAudioで生成） |
| `manifest.json` | PWAのアプリ情報（アイコン・テーマカラー・起動設定） |
| `sw.js` | オフライン対応のService Worker |
| `icons/icon.svg` | アプリアイコン |

## ローカルでの動作確認

ビルド不要。`index.html` をダブルクリックでも遊べる（Service Workerは`file://`では動かないので、
オフライン対応を試すときはHTTP経由で開く）。

```bash
python -m http.server 8000
```

ブラウザで `http://localhost:8000/index.html` を開く。

## スマホで遊ぶ（GitHub Pagesで公開する手順）

1. GitHubにリポジトリを作り、このフォルダの中身を `main` ブランチのルートにpushする
2. リポジトリの **Settings → Pages → Source: Deploy from a branch → Branch: main / (root)** を保存
3. 数十秒〜数分で `https://<GitHubユーザー名>.github.io/<リポジトリ名>/` が表示される
4. そのURLをLINEで送れば、タップするだけで遊べる

### ホーム画面に追加する

- **iPhone (Safari)**: 公開URLを開く → 共有ボタン → 「ホーム画面に追加」
- **Android (Chrome)**: 公開URLを開く → 右上メニュー → 「ホーム画面に追加」

## 既知の制限

- iPhoneはマナーモード（消音スイッチ）だと音が鳴らない。
- アイコンはSVGのみ。iPhoneのホーム画面アイコンはPNGでないと表示が既定のものになることがある。
- 実機（スマホ）での動作は未確認。
