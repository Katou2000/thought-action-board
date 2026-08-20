タスク管理ンナー v1.0
====================

ローカル保存版の完成リリースです。
v8.9.3を土台に、機能追加は行わず、ファイル構成・PWAキャッシュ・説明ファイルを整理しています。

■ 重要
- 保存キーは従来どおり `taskKanrinnerV1`。既存データをそのまま引き継ぎます。
- データはブラウザの localStorage に保存されます。
- PCとスマホは自動同期しません。端末間移動は「共有用バックアップ」または「バックアップ保存」を使用してください。
- 画像はbase64で保存されるため、画像を大量に入れるとブラウザ保存容量へ先に到達しやすくなります。
- 更新前に一度バックアップJSONを保存しておくのを推奨します。

■ 主な機能
- 複数ボード / セクション / タスクカード
- 開始日・期限・タグ・検索・フィルター・並び替え
- 繰り返しタスク
- 今日やること / カレンダー / ホーム
- ルーティンタスク + 月間実績カレンダー
- 完了履歴 / ゴミ箱 / 復元
- よく使う（ピン留め）
- ボード / 目標テンプレート
- 自由帳（PC自由配置 / スマホ5列表示）
- メモ
- 目標設計（DOPAではブロックビルドブレイカー）
- 達成した目標
- Simple / Black / DOPA-BOYテーマ
- 文字サイズ 小・中・大
- タブの表示/非表示・並べ替え・左/右/上/下配置
- クイック＋ボタンの表示/非表示・自動/四隅配置
- JSONバックアップ / 読み込み
- PWA対応

■ v1.0で整理したもの
- CSSは `style.css` 1本を正式なスタイルファイルとして使用
- Service Workerキャッシュを `task-kanrinner-v1-0` に更新
- 古い文言テンプレを整理し、v1.0用の1ファイルに統一
- READMEを現行仕様へ更新
- 内部の旧名 `ensureV7` を `ensureCurrentData` へ整理（保存形式は変更なし）

■ GitHub Pagesへ更新するとき
1. このZIPを展開
2. リポジトリ内の同名ファイルをv1.0側で置き換える
3. VS Code / Live Serverで一度確認
4. Gitで反映

    git add .
    git commit -m "release v1.0"
    git push

5. GitHub Pages反映後、古い表示が残る場合は Ctrl + Shift + R

■ データバックアップ
設定 → 保存 → 「バックアップ保存」
読み戻す場合は「読み込み」からJSONを選択します。

クラウド同期を追加する場合は、このv1.0をローカル完成版として残し、別バージョンで進めるのがおすすめです。

■ v1.0で維持している重要仕様
- localStorageキー: taskKanrinnerV1
- BLOCK BREAK: 1ブロック
- GOAL CLEAR: 42ブロック
- 自由帳: PC自由配置 / スマホ5列
- スマホのナビ: 左ドロワー
- PCのナビ初期位置: 左

[1.0.1 smartphone polish]
- Sidebar can scroll above Safari's bottom browser bar.
- Mobile menu button moves outside the open drawer.
- DOPA action feedback is slower on mobile for readability.
- Builder mobile rendering is lighter while keeping BLOCK=1 / GOAL=42.

[1.0.2 visual polish]
- The floating plus button is intentionally a little smaller so it matches nearby UI text better.
- Black theme now uses cleaner dark surfaces with much less glow.

[1.0.3 mobile navigation polish]
- The mobile tab/menu button is fixed like the floating + button.
- Opening the drawer no longer moves the control.

[1.0.4 mobile fixed control]
- The hamburger/close button now lives in a dedicated fixed overlay, independent from tab content scrolling.

[1.0.5 mobile menu button]
- Closed: fixed hamburger at screen top-left.
- Open: fixed close button just outside the drawer on the right.
