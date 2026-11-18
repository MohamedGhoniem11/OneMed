# OneMed – Frontend

React + Vite frontend for the OneMed Prescription Extraction Review page.

## Setup

```bash
cd frontend
npm install
npm run dev
```

Opens at http://localhost:3000

## Stack
- React 18
- Vite 5
- CSS Modules (no Tailwind)
- Inter font (Google Fonts)

## Structure
```
frontend/
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.jsx
    ├── App.jsx / App.module.css
    ├── index.css                  ← design tokens (colors, fonts)
    ├── assets/
    │   ├── icons/                 ← SVGs from Figma
    │   └── images/                ← prescription.png from Figma
    └── components/
        ├── Header.jsx             ← top nav bar
        ├── ImageViewer.jsx        ← left pane: prescription image
        └── MedicineTable.jsx      ← right pane: editable data table
```
