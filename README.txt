Biotos CRM – v5 (PWA)
=======================
Build: 2025-09-06

Cosa migliora rispetto alla v4
- **Persistenza robusta**: dati salvati in **IndexedDB** (con fallback a LocalStorage). Non perdi nulla aprendo/chiudendo l’app o aggiornando.
- **Navigazione adattiva**: top‑nav su desktop, bottom‑nav su smartphone. Padding e safe‑area per evitare sovrapposizioni.
- **Tabelle con paginazione** (25/pg) per liste lunghe e scroll fluido su iOS (touch momentum).
- **Leggibilità**: contrasto maggiore, input più chiari, font 17pt su iPhone.
- **Bug‑fix**: header non sovrappone contenuti, sticky table header disattivato su mobile per evitare glitch.
- **SW cache** aggiornata → `biotos-crm-v5` (autoupdate).

Deploy
1) Carica i file nel repo (root o cartella del sito).
2) Abilita GitHub Pages.
3) Apri l’URL con Safari/iPhone e aggiungi a Home (PWA).

Note
- Backup/restore JSON e CSV sempre disponibili nella sezione **Dati**.
- GDPR: inserire solo dati professionali.
