# Retirement Calculator

A modern, single-page retirement planning calculator built with **Next.js (App Router)**, **TypeScript**, **React hooks**, and **Tailwind CSS**. It helps users estimate whether they are on track to retire with their desired income and visualizes how long their funds may last.

## Features

- ✅ Client-side calculator with real-time results
- ✅ Dynamic status (green background when on track, red when off track)
- ✅ Visual retirement timeline with depletion marker
- ✅ Detailed financial metrics (capital gap, income shortfall, run-out age)

## Assumptions

- Pre-retirement return: **6%**
- Retirement return: **5%**
- Safe withdrawal rate: **5%**
- Life expectancy: **90**

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
src/
  app/
    page.tsx       # Retirement calculator UI + logic
    layout.tsx     # App layout
    globals.css    # Tailwind styles
```

## Tech Stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS

## License

MIT
