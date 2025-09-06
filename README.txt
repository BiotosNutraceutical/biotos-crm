Biotos CRM – v3 (PWA)
=======================
Build: 2025-09-06

Novità v3
- UI ottimizzata smartphone (bottom nav, safe-area iPhone, target 44px).
- Grafica semplificata e coerente con il brand Biotos (palette verde).
- Tap-to-call/mail in liste contatti.
- Esporta i follow-up in calendario (ICS).
- Sezione Dati: backup JSON, import JSON, export/import CSV (Medici/Farmacie/Visite).
- Cache offline aggiornata (service worker CACHE = biotos-crm-v3).

Deploy con GitHub Pages
1) Carica tutti i file nella root del repo (o nella cartella del sito).
2) Settings → Pages → Deploy from a branch → main / (root).
3) Apri l’URL con Safari su iPhone → Condividi → Aggiungi a Home.

Note
- I dati restano in locale (localStorage). Esegui backup periodici.
- GDPR: inserire solo dati professionali.
