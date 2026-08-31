// USER-OWNED TUTORIAL COPY
// このファイル内のチュートリアル文言はユーザー本人が編集します。
// 明示的に依頼されない限りCodexは文言を変更・初期化・再生成しないでください。
// title / body / icon / target / 配列順を変更すると、表示内容と案内順へ反映されます。

window.TUTORIAL_STEPS = [
  {target:"#homeView",icon:"✓",title:"タスク管理ンナーへようこそ",body:"やること、習慣、目標、メモをまとめて整理するためのアプリです。"},
  {target:"#boardView",icon:"📁",title:"まずはタスクを作成しましょう",body:"単発のタスクは「ボード」、繰り返したいことは「ルーティンタスク」から作れます。"},
  {target:"#cardModal",icon:"⚙",title:"タスクは個別に設定できます",body:"開始日や〆日、「この日にやる」予定日を設定できます。色やタグを付けて見分けやすくすることもできます。"},
  {target:"#boardView",icon:"✓",title:"できたら完了",body:"終わったタスクは完了にしましょう。完了したものは履歴に残るので、あとから振り返れます。"},
  {target:"#routineView",icon:"🔁",title:"繰り返すことはルーティンタスクへ",body:"毎日、平日、特定の曜日など、繰り返したいことはルーティンタスクで管理できます。"},
  {target:"#calendarView",icon:"📅",title:"日付を決めるとカレンダーへ",body:"日付を設定したタスクはカレンダーに反映されます。日を選んで右上の＋から追加することもできます。"},
  {target:"#homeView",icon:"🏠",title:"そしてホームにまとまります",body:"「今なにやるんだっけ？」となったら、まずホームを見ればOKです。"},
  {target:"#builderView",icon:"🧱",title:"大きな目標は目標設計へ",body:"達成したい目標を設定し、そこまでの道筋をブロックとして積み上げ、可視化することができます。"},
  {target:"#freeboardView",icon:"📝",title:"整理できてないことは自由帳へ",body:"まだタスクにするほどでもないことは自由帳へ。PCでは好きな位置に付箋を置けます。"},
  {target:"#settingsButton",icon:"⚙",title:"使いにくいところは変更できます。",body:"設定変更画面では、テーマ、文字サイズ、タブの位置・順番・大きさ・横幅、表示する機能、＋ボタンの位置などを変更できます。"},
  {target:"#settingsModal",icon:"☁",title:"PCとスマホで同期できます",body:"クラウドへログインするとPCとスマホで同期できます。オフラインでもデータは端末に保存されます。"}
];

window.DOPA_TUTORIAL_STEPS = [
  {target:"body",icon:"⚡",title:"WELCOME, DOPA-BOY",body:"ようこそ、DOPA-BOY。\nこのモードは通常とは一味違うぜ。"},
  {target:"body",icon:"🎨",title:"SAME SYSTEM, DIFFERENT WORLD",body:"システムも、使い方も同じ。\nただ、大きな演出によるドーパミンの分泌量が段違いだぜ。"},
  {target:"#builderView",icon:"💥",title:"BLOCK BUILD BREAKER",body:"通常モードの「目標設計」は、DOPAでは「ブロックビルドブレイカー」に変わっている。\n使い方は変わらない。\nしかし、演出まで段違いになった目標設計は、もはや同じ機能と呼べるのか？？"},
  {target:"#dopaMotionToggle",icon:"◌",title:"TOO MUCH DOPA?",body:"DOPA演出はハデハデすぎて重い。\nでも、DOPA-BOYのままでいたい。\nそんな将来有望なBOYSのために、動きを止めるオプションも設定可能だ。"},
  {target:"body",icon:"✓",title:"READY, DOPA-BOY",body:"説明は以上。\nお前だけのDOPAを描け。\n\nNO DOPAMINE, NO LIFE.\n全てのドパガキへ捧ぐ。"}
];

window.GOAL_TUTORIAL_STEPS = [
  {target:"#builderView",icon:"🧭",title:"目標設計とは？",body:"達成したい目標を設定し、そこまでに必要なことをブロックとして積み上げていく場所です。"},
  {target:"#blockTitleInput",icon:"🧱",title:"必要なことをブロックにしましょう",body:"目標達成までに必要な行動や段階を、一つずつブロックとして追加していきます。順番はあとから変更できます。"},
  {target:".break-block-button",icon:"✓",title:"ブロックを完了",body:"できたブロックはアイコンを押すことで完了になります。進めた分だけブロックが減り、目標までの進み具合を確認できます。"},
  {target:"#completeGoalButton",icon:"🏆",title:"最後は目標達成",body:"すべてのブロックを進め終わったら目標を達成できます。達成した目標はタブの「達成した目標」に残り、あとから振り返ることができます。"}
];
