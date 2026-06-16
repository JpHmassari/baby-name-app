# Baby Names App - Versione 2 pronta

## Cosa include questa versione
- codice coppia
- collegamento partner
- match automatici
- generazione AI di 20 nomi solo femminili

## Cosa devi fare

### 1. GitHub
Nel repo GitHub sostituisci questi file con quelli di questo pacchetto:
- package.json
- vite.config.js
- index.html
- .env.example
- src/main.jsx
- src/App.jsx
- src/styles.css
- src/lib/supabase.js
- src/lib/helpers.js
- api/generate-names.js

### 2. Supabase
Nel progetto Supabase apri SQL Editor e incolla il file `supabase-v2.sql`.
Poi clicca Run.

### 3. Vercel - Environment Variables
In Vercel devi avere queste 3 variabili:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- ANTHROPIC_API_KEY

### 4. Redeploy
Dopo aver aggiornato i file e le variabili, vai su Vercel > Deployments > ultimo deploy > Redeploy.

### 5. Uso
- Persona 1: crea profilo e copia il codice coppia
- Persona 2: clicca "Collega partner" e inserisce il codice
- Entrambi possono generare nomi e votare
- Quando un nome piace a entrambi, appare il match automatico
