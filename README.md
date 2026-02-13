# IPO Dashboard & Fund Optimizer

A React web application that displays live IPO data with GMP (Grey Market Premium) tracking.

## Features

- Live Mainboard & SME IPO listings
- Real-time GMP data from investorgain.com
- Application amounts for Retail, S-HNI, B-HNI categories
- Fund optimization tool

## Setup

```bash
npm install
```

## Run

**Frontend** (port 5173):
```bash
npm run dev
```

**Backend** (port 5175):
```bash
npm run server
```

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js
- **Scraping**: Axios, Cheerio, Puppeteer
- **Data Sources**: chittorgarh.com, investorgain.com
