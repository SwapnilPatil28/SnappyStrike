<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/shopping-bag.svg" width="100" height="100" alt="SnappyStrike Logo" />
  
  # SnappyStrike ERP ⚡
  
  **A resilient, blazing-fast, and dual-mode Point of Sale (POS) & Enterprise Resource Planning (ERP) platform designed dynamically for the modern local retail ecosystem.**

  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
  
  Deployed Link: https://snappystrike.vercel.app/
</div>

<br />

---

## 🛑 The Problem

Local retail shops and small-scale distributors often find themselves trapped between outgrowing pen-and-paper ledgers and being unable to afford complex, enterprise-level ERP software. They face several critical pain points:

1. **Disconnected Systems**: The cash register, inventory warehouse, and public marketing fronts are isolated.
2. **Poor Usability**: Legacy POS software is infamously clunky and often lacks cloud backups.
3. **Audit Nightmares**: Difficulty tracking ledger modifications, leading to trust issues and accounting errors.
4. **No Digital Presence**: Zero easy ways to broadcast active inventory and flash sales to nearby foot traffic.

## 💡 The Solution

**SnappyStrike ERP** unifies local retail operations into a single, offline-resilient web application. It seamlessly bridges the gap between B2B supply buying and B2C retail selling without requiring custom hardware. 

By injecting real-time cloud synchronization natively alongside local storage caching mechanisms, shop owners can operate lightning-fast checkouts even under poor internet conditions.

---

## 🔥 Key Features

### 🛒 Dual-Mode POS Terminal
Seamlessly toggle the terminal between **Retail Sales** and **Supplier Purchases**. The system dynamically routes database deductions, adjusts the UI contrast (to prevent cashier mistakes), and parses custom tax structures based on the active mode.

### 📷 Hardware Optic Engine
Why buy expensive barcode guns? Integrated `html5-qrcode` utilizes the device's native hardware cameras (laptops, iPads, smartphones) to precision-scan product barcodes. Engineered with strict cooldown limits to prevent accidental double-billing.

### 🧾 Dense A4 Render Engine
A highly specialized sub-10px print rendering engine built fully in CSS. Capable of condensing up to **40 line items** onto a single standard thermal or A4 page, complete with dynamic Authorized Signature blocks and store metadata arrays.

### 🛡️ Tamper-Proof Electronic Ledger
The Invoice History isn’t just a read-only list. It’s an intelligent ledger that allows necessary cashier corrections while deploying a **Tamper Count Badge**. It deep-compares any edits against the original database payload and permanently flags the history UI if math anomalies occur.

### 🏯 Auto-Propagating Digital Storefront
The moment a store is initialized, the platform auto-generates a `/stores/[username]` e-commerce style landing page. It broadcasts active promotional offers, contact details, and a public inventory that syncs entirely with the seller's live POS terminal.

<br />

---

## 🛠️ Technology Stack & Architecture

| Layer | Technology | Description |
| --- | --- | --- |
| **Frontend Core** | React 19 + Vite | Blazing fast HMR and optimized asset delivery. |
| **Styling** | TailwindCSS | Utility-first architecture with aggressive `@media print` overrides. |
| **Backend & DB** | Google Firebase | Leveraging `Firestore` (NoSQL) and Authentication. |
| **Routing** | React Router v6 | Protected routing blocks for Seller isolation. |
| **Icons & SVG** | Lucide React | Highly scalable vector icon integration. |
| **Hardware** | HTML5-QRCode | Lightweight wrapper for raw camera stream processing. |

### 🔒 Firebase Security Focus
The database strictly utilizes `request.auth.uid` validation patterns at the Firestore Rules level. This prevents Broken Access Control (IDOR) attacks, ensuring user authentication dictates explicit row-level ownership across *Stores*, *Products*, and *Invoices*.

<br />

---

## 🚀 Quick Setup & Deployment

To run this repository locally or launch your own ERP node:

```bash
# 1. Clone the repository
git clone https://github.com/SwapnilPatil28/snappystrike.git
cd snappystrike

# 2. Install Dependencies
npm install

# 3. Secure Environment Setup
# Create a .env.local file in the root directory and add your Firebase configurations:
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# 4. Launch the Local Dev Server
npm run dev
```
<br>

---

## 🗺️ Roadmap & Future Optimizations

While the core POS terminal is production-ready, SnappyStrike is constantly evolving. The upcoming milestones are:

- [ ] **Geospatial Proximity Networking**: Utilizing the *Nominatim OpenStreetMaps API* to power a "Find Nearby Stores" radius filter via mathematical Lat/Long Haversine distance tracking.
- [ ] **Global Product Discovery**: A cross-store product search engine.
- [ ] **Advanced Analytics Board**: Visual tracking of monthly PnL, cashflows, and automated low-stock warnings.
- [ ] **Cloud Functions Lock**: Offloading the race conditions of real-time inventory deductions from the React client to Firebase Cloud Functions.
- [ ] **AppCheck Integration**: Enforcing traffic origination exclusively from the verified Vercel URI endpoint.

---

<div align="center">
  <b>Built with ❤️ and heavy emphasis on Retail Resilience and UX design.</b>
</div>
