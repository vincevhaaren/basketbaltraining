# HoopLab — Basketbaltraining

Een mobiele, donker vormgegeven trainingsbibliotheek. De frontend wordt gehost op GitHub Pages; Supabase regelt veilige code-login, gedeelde trainingsdata en bestandsopslag.

## Wat zit erin?
- Persoonlijke toegangscode voor elke speler en voor de beheerder
- Alleen accounts met `is_admin = true` kunnen trainingen publiceren of verwijderen
- Gedeelde trainingslijst met zoeken, categorie, niveau, duur en beschrijving
- Optionele upload van video, afbeelding of PDF (max. 20 MB per bestand)
- Responsive ontwerp voor mobiel en desktop
- Sessiecodes verlopen na 7 dagen

## 1. Maak de Supabase-backend

1. Maak een project aan op [Supabase](https://supabase.com/).
2. Open **SQL Editor** en voer `supabase/schema.sql` volledig uit.
3. Open **Project Settings → API** en kopieer de Project URL en de anon/publishable key.
4. Vul die in `config.js` in. De key die in de frontend staat moet de anon/publishable key zijn, **nooit** de `service_role`-key.

## 2. Deploy de Edge Function

Installeer de Supabase CLI en log in. Voer in de projectmap uit:

```bash
supabase login
supabase link --project-ref JOUW_PROJECT_REF
supabase functions deploy basketbal-api --no-verify-jwt
```

De function gebruikt de Supabase secrets `SUPABASE_URL` en `SUPABASE_SERVICE_ROLE_KEY`; die zijn beschikbaar in Supabase Edge Functions. Deel de service-role key nooit in GitHub, in `config.js` of met spelers.

> De function is bewust een eigen code-login in plaats van Supabase Auth. Hij vergelijkt uitsluitend SHA-256-hashes van codes en bewaart sessietokens als hashes. Beperk beheerdercodes tot vertrouwde personen en gebruik lange, unieke codes.

## 3. Stel de drie toegangscodes in

Na het uitvoeren van `supabase/schema.sql`, open je de Supabase **SQL Editor** en voer je de inhoud van `supabase/seed-codes.sql` uit. Dit stelt de door jou gekozen codes in:

- `3195` — beheerder
- `1234` — speler
- `4321` — speler

De database bewaart alleen hashes van de codes, niet de oorspronkelijke codes. Let op: viercijferige codes zijn makkelijk te raden en deze eerste versie heeft nog geen rate limiting. Gebruik deze codes daarom alleen voor een test of een niet-gevoelige clubomgeving; kies voor openbaar gebruik langere codes en voeg rate limiting toe.

Bewaar de gekozen codes veilig. Om een code uit te schakelen:

```sql
update public.access_codes set active = false where label = 'Speler 1';
```

## 4. Publiceer op GitHub Pages

1. Maak een nieuwe GitHub repository.
2. Upload `index.html`, `style.css`, `app.js` en `config.js` naar de repository-root.
3. Ga naar **Settings → Pages** en kies **Deploy from a branch**, branch `main`, folder `/ (root)`.
4. Wacht tot GitHub Pages de site publiceert. De site werkt pas echt nadat Supabase is ingesteld en de Edge Function gedeployed is.

## Bestanden

```text
index.html
style.css
app.js
config.js
supabase/
  schema.sql
  functions/
    basketbal-api/
      index.ts
```

## Belangrijke beveiligingsnotities

- De anon/publishable key is bedoeld om in de frontend te staan; de service-role key nooit.
- De tabellen zijn afgeschermd met RLS en directe browserrechten zijn ingetrokken. Alle bewerkingen lopen via de Edge Function.
- Deze eerste versie heeft geen rate limiting of wachtwoordherstel. Gebruik unieke codes, deel admincodes niet en controleer regelmatig de Supabase logs.
- Bestandsuploads worden beperkt tot toegestane MIME-types en 20 MB. De function verstuurt uploads als base64; bij grotere aantallen of grote video's is directe upload naar Storage met tijdelijke upload-URL's beter.
- Voor echte openbare productie is het verstandig CORS te beperken tot jouw GitHub Pages-domein en een eigen domein.
