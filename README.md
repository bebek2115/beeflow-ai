# BeeFlow AI

Frontendowy kreator stron z serwerowym asystentem AI i zachowanym lokalnym silnikiem awaryjnym.

## Konfiguracja AI

Endpoint `POST /api/ai` korzysta z OpenAI Responses API i Structured Outputs. Klucz nigdy nie jest przesyłany do przeglądarki.

1. Skopiuj `.env.example` do lokalnego pliku `.env` obsługiwanego przez środowisko wdrożeniowe.
2. Ustaw `OPENAI_API_KEY` wyłącznie po stronie serwera.
3. Opcjonalnie ustaw `OPENAI_MODEL`; domyślna wartość to `gpt-5-mini`.

Frontend wysyła do `/api/ai` wiadomość, ostatni stan briefu i krótką historię rozmowy. Odpowiedź zawiera `intent`, `reply`, `extracted_fields`, `corrections`, `missing_fields`, `confidence`, `next_action`, dane potwierdzenia oraz tekstową analizę istniejącej strony.

Tryb redesign pobiera wyłącznie publiczną treść HTTP/HTTPS. Localhost, prywatne adresy IP, domeny rozwiązujące się do prywatnych adresów oraz niestandardowe porty są blokowane. Analiza nie udaje oceny wizualnej renderu strony.

## Testy

```powershell
node --test --test-isolation=none tests\chat-flow.test.cjs tests\chat-core.test.cjs tests\ai-core.test.cjs tests\api-ai.test.cjs
```

Kontrola składni:

```powershell
node --check app.js
node --check ai-client.js
node --check chat-core.js
node --check api\ai.js
node --check api\_lib\ai-core.cjs
```
