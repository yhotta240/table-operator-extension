# Table Operator

Web ページ上の表を簡単に操作できるようにする Chrome 拡張機能です．列の選択，並び替え，フィルター，CSV/TSV エクスポートなどを手軽に行えます．

## 主な機能

- 列選択：必要な列だけを選んで強調表示できます．
- 並び替え：列ごとに昇順／降順でソートできます．
- フィルター：列ヘッダーの入力で表示を絞り込めます．
- エクスポート：表示中のデータや選択列を CSV / TSV で保存できます．
- サイト別設定：URL パターンごとに各機能を個別に有効化・無効化できます．

## インストール

### Chrome Web Store からインストール

準備中...

### 手動インストール

必要条件

- [Node.js](https://nodejs.org/) (v18.x 以上を推奨)
- [npm](https://www.npmjs.com/) または [yarn](https://yarnpkg.com/)

手順

1. このリポジトリをクローン

   ```bash
   git clone https://github.com/yhotta240/table-operator-extension
   cd table-operator-extension
   ```

2. 依存関係をインストール

   ```bash
   npm install
   ```

3. ビルド

   ```bash
   npm run build
   ```

4. Chrome に読み込む
   - Chrome で `chrome://extensions/` を開く
   - 「デベロッパーモード」をオンにする
   - 「パッケージ化されていない拡張機能を読み込む」をクリック
   - `dist/` ディレクトリを選択


## 使い方

[チュートリアル](docs/tutorial.md) を参照してください

## ライセンス

MIT License

## 作者

- yhotta240 (https://github.com/yhotta240)
