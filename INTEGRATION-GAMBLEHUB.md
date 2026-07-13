# Gamble Hub Stage entegrasyonu

Bu entegrasyon Gamble Hub OpenAPI 3.1.0 Stage sözleşmesine göre hazırlanmıştır. Frontend doğrudan Gamble Hub alan adlarına bağlanmaz; bütün provider istekleri Vercel Serverless Functions üzerinden geçer.

Doğrulanan provider uçları: form-urlencoded `POST /auth/login`, Bearer tokenlı `GET /users/{user_id}/getUserGames/{currencyISO}` ve ham JSON HMAC imzalı `POST /games/openGame`. Stage Office ve Client API taban adresleri birbirinden ayrıdır.

## Stage credentials ve Vercel değişkenleri

Vercel projesinde **Settings → Environment Variables** bölümüne aşağıdaki değerleri ekleyin. Secret değerleri GitHub'a, `config.js` içine veya herhangi bir frontend dosyasına yazmayın.

- `GAMBLEHUB_API_LOGIN`
- `GAMBLEHUB_API_PASSWORD`
- `GAMBLEHUB_USER_ID`
- `GAMBLEHUB_SECRET_API_KEY`
- `GAMBLEHUB_CURRENCY` — varsayılan `USD`
- `GAMBLEHUB_STAGE_OFFICE_URL` — varsayılan `https://office-api-dev.gamble-hub.net`
- `GAMBLEHUB_STAGE_CLIENT_URL` — varsayılan `https://client-api-dev.gamble-hub.net`
- `GAMBLEHUB_ALLOW_REAL_MODE` — Stage kabulü tamamlanana kadar `false`

Değişkenleri ekledikten sonra Vercel deployment'ını yeniden oluşturun ve `/api/gamblehub/status` yanıtında `configured: true` olduğunu doğrulayın.

## GitHub Pages → Vercel akışı

GitHub Pages statik dosyaları çalıştırır ve secret saklayamaz. `config.js`, GitHub Pages üzerinde API taban adresini `https://bozobet-v2.vercel.app` olarak ayarlar. Vercel üzerinde veya localhost'ta aynı-origin `/api` çağrıları kullanılır.

Akış: GitHub Pages frontend → BozoBet Vercel API → Gamble Hub Stage API.

## Oyun listesi

`/api/gamblehub/games`, server-side form login ile kısa süreli access token alır ve `GET /users/{user_id}/getUserGames/{currencyISO}` isteğini Bearer token ile yapar. Yalnızca aktif oyunların `id`, `title`, `imageUrl`, `provider` ve `isEnabled` alanları frontend'e döner. Token süresi dolduğunda login otomatik yenilenir; refresh token frontend'e aktarılmaz.

## Oyun açma

Frontend giriş yapmış kullanıcının kullanıcı adını `/api/gamblehub/open-game` endpointine gönderir. Backend normalize edilmiş JSON gövdesini bir kez üretir ve aynı ham gövde üzerinden `GAMBLEHUB_SECRET_API_KEY` ile HMAC-SHA256 hex `X-Signature` oluşturur. Provider cevabından yalnızca oyun URL'si, session kimliği ve demo bilgisi döndürülür.

`exitUrl` yalnızca BozoBet GitHub Pages, mevcut Vercel deployment'ı ve localhost originleriyle kullanılabilir. Bu kontrol açık redirect riskini engeller.

## Şimdilik devre dışı özellikler

Transfer Wallet ve Seamless Wallet henüz uygulanmamıştır. `getBalance`, `writeBet`, `rollback`, `userCreate`, `userCash` ve `userInfo` endpointleri Garry'den wallet modeli, callback bilgileri, IP allowlist ve credentials geldikten sonra eklenecektir.

Gerçek para modu varsayılan olarak kapalıdır. Frontend `demo: "0"` gönderse bile `GAMBLEHUB_ALLOW_REAL_MODE=true` olmadığı sürece backend provider'a `demo: "1"` gönderir. Wallet callbackleri, idempotency ve finansal mutabakat tamamlanmadan bu ayar açılmamalıdır.
