Biotos CRM – v4 (PWA)
=======================
Build: 2025-09-06

Cosa cambia rispetto alla v3
- **Rimosso** il riquadro “Suggerimento” per iPhone.
- **Header** compatto e fluido: niente blur/gradiente, padding top con **safe‑area** (Dynamic Island/Notch).
- Migliore **fluidità**: meno effetti grafici e `-webkit-overflow-scrolling: touch` nelle liste.
- Bottom nav più compatto con safe‑area aggiornata.
- Bump cache SW → `biotos-crm-v4` per aggiornarsi subito.

Deploy con GitHub Pages
1) Carica tutti i file nella root del repo (o nella cartella del sito).
2) Settings → Pages → Deploy from a branch → main / (root).
3) Apri l’URL con Safari → Condividi → Aggiungi a Home.

Note
- I dati restano in locale (localStorage). Esegui backup periodici.
- GDPR: inserire solo dati professionali.
