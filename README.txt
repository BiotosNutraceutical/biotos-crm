Biotos CRM – Field App (PWA)
================================

Contenuto
- index.html : app
- manifest.webmanifest : PWA manifest (icone, nome, start_url)
- sw.js : service worker per cache offline
- icons/icon-192.png, icons/icon-512.png : icone app

Deploy rapido
1) **Netlify Drop** (https://app.netlify.com/drop): trascina TUTTI i file della cartella → ottieni un URL https.
2) **GitHub Pages**:
   - Crea un repo, carica tutti i file nella root.
   - Settings → Pages → "Deploy from a branch" → branch `main` e cartella `/`.
   - Apri l'URL pubblicato.

iPhone
- Apri l'URL in Safari → Condividi → "Aggiungi a Home".
- Dopo il primo caricamento, l'app funziona anche offline.
- Esegui periodicamente "Esporta backup JSON" dalla sezione Import/Export.

GitHub Pages sotto /nome-repo
- Il manifest usa `start_url: "./"` e `scope: "./"` quindi funziona anche sotto sottocartelle.
