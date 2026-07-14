# Gamble Hub Stage entegrasyonu

Bu entegrasyon Gamble Hub OpenAPI 3.1.0 Stage sözleşmesine göre hazırlanmıştır. Frontend doğrudan Gamble Hub alan adlarına bağlanmaz; bütün provider istekleri Vercel Serverless Functions üzerinden geçer.

Doğrulanan provider uçları: form-urlencoded `POST /auth/login`, Bearer tokenlı `GET /users/{user_id}/getUserGames/{currencyISO}` ve ham JSON HMAC imzalı `POST /games/openGame`. Stage Office ve Client API taban adresleri birbirinden ayrıdır.

## Stage credentials ve Vercel değişkenleri

Vercel projesinde **Settings → Environment Variables** bölümüne aşağıdaki değerleri ekleyin. Secret değerleri GitHub'a, `config.js` içine veya herhangi bir frontend dosyasına yazmayın.

- `GH_LOGIN`
- `GH_PASSWORD`
- `GH_USER_ID`
- `GH_SECRET_KEY`
- `GH_CURRENCY` — varsayılan `TRY`
- `GH_LANGUAGE` — varsayılan `tr`
- `GH_STAGE_OFFICE` — varsayılan `https://office-api-dev.gamble-hub.net`
- `GH_STAGE_CLIENT` — varsayılan `https://client-api-dev.gamble-hub.net`
- `GH_TRANSFER` — varsayılan `https://twalletvault.api.games-hub.net`
- `GH_CALLBACK` — wallet callback taban adresi

Değişkenleri ekledikten sonra Vercel deployment'ını yeniden oluşturun ve `/api/gamblehub/status` yanıtında `configured: true` olduğunu doğrulayın.

## GitHub Pages → Vercel akışı

GitHub Pages statik dosyaları çalıştırır ve secret saklayamaz. `config.js`, GitHub Pages üzerinde API taban adresini `https://bozobet-v2.vercel.app` olarak ayarlar. Vercel üzerinde veya localhost'ta aynı-origin `/api` çağrıları kullanılır.

Akış: GitHub Pages frontend → GalaxyBet Vercel API → Gamble Hub Stage API.

## Oyun listesi

`/api/gamblehub/games`, server-side form login ile kısa süreli access token alır ve `GET /users/{user_id}/getUserGames/{currencyISO}` isteğini Bearer token ile yapar. Yalnızca aktif oyunların `id`, `title`, `imageUrl`, `provider` ve `isEnabled` alanları frontend'e döner. Token süresi dolduğunda login otomatik yenilenir; refresh token frontend'e aktarılmaz.

## Oyun açma

Frontend giriş yapmış kullanıcının kullanıcı adını `/api/gamblehub/open-game` endpointine gönderir. Backend normalize edilmiş JSON gövdesini bir kez üretir ve aynı ham gövde üzerinden `GH_SECRET_KEY` ile HMAC-SHA256 hex `X-Signature` oluşturur. Provider cevabından yalnızca oyun URL'si, session kimliği ve demo bilgisi döndürülür. Stage boyunca oyun açma değerleri `currency: "TRY"`, `language: "tr"` ve `demo: "1"` olarak sabittir.

`exitUrl` yalnızca GalaxyBet GitHub Pages, mevcut Vercel deployment'ı ve localhost originleriyle kullanılabilir. Bu kontrol açık redirect riskini engeller.

## Şimdilik devre dışı özellikler

`POST /api/gamblehub/getBalance`, `POST /api/gamblehub/writeBet` ve `POST /api/gamblehub/rollback` endpointleri mock bakiye ile hazırdır. `GH_SECRET_KEY` tanımlandığında callback imzası zorunlu hale gelir. Gerçek wallet bakiyesi, işlem kalıcılığı, idempotency ve mutabakat Stage sözleşmesi ile credentials geldikten sonra bağlanacaktır.

Gerçek para modu bu altyapıda kapalıdır; servis her zaman provider'a `demo: "1"` gönderir. Wallet idempotency ve finansal mutabakat tamamlanmadan bu değer değiştirilmemelidir.
