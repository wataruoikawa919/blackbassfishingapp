# Bass Pattern Lab

ブラックバス釣り向けの予測ダッシュボードです。地点の天気、気圧、風、雲量、雨、季節、水温、水色、人的プレッシャーを合わせて、バスの想定ポジションと反応しやすいルアーを表示します。

## 使い方

`index.html` をブラウザで開くと動きます。初期地点は琵琶湖です。

- 地点検索: Open-Meteo Geocoding API
- 地点検索補助: OpenStreetMap Nominatim Search API
- 地図表示: Leaflet + OpenStreetMap tiles
- 周辺水域候補: OpenStreetMap Overpass API
- 湖名検索: 主要バスフィールドはプリセット候補で補完
- 天気データ: Open-Meteo Forecast API
- 水温: 入力がない場合は過去24時間の気温と当日の予報から推定
- 予測: バス釣りの経験則に基づくヒューリスティック

## iPhoneでアプリとして使う

このアプリはPWA対応済みです。HTTPSで公開したURLをiPhoneのSafariで開き、共有メニューから「ホーム画面に追加」を選ぶと、ホーム画面から単独アプリのように起動できます。

ローカルの `file://` ではService Workerが動かないため、ホーム画面アプリとして使う場合はGitHub Pages、Netlify、VercelなどでHTTPS配信してください。天気、地図、周辺水域の取得にはインターネット接続が必要です。

## 注意

釣果を保証するものではありません。現地の水質、ベイト、風向き、安全、遊漁ルールを優先してください。
