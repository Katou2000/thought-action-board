タスク管理ンナー v5 安定化パッチ

今回は index.html / manifest.json / アイコンを変更しません。
ユーザーが自分で調整したタイトル・サブタイトル等を上書きしないためです。

上書きするのは次の3ファイルだけ:
- script.js
- style.css
- service-worker.js

主な修正:
- これまで v2/v3/v4 と追加コードを継ぎ足していた script.js を一度整理し、1本の実装へ統合
- 今日ページのカレンダーを復旧
- 目標ビルダーを復旧
- 達成した目標を復旧
- 自由帳 Undo / Redo を整理
- DOPA-BOYのカレンダー日付を大きめの表示に変更
- DOPA-BOYの期限表示も余白を増やして読みやすく修正
- 自由帳の×ボタンを本文と分離したまま維持
- 既存 localStorage キー taskKanrinnerV1 を維持し、現在のデータを引き継ぐ

Service Worker:
task-kanrinner-v5

手順:
1. 現在の thought-action-board フォルダへ3ファイルを上書き
2. Live Serverで確認
3. 問題なければステージ → Commit → Push
4. 本番だけ古い場合は一度強制再読み込み
