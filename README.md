# IPO Allotment Calculator

A modern web application built with React and TypeScript to calculate IPO (Initial Public Offering) allotment probability based on various parameters.

## Features

- 🎯 **Smart Probability Calculation**: Calculate your chances of getting IPO shares allocated
- 📊 **Multiple Investor Categories**: Support for Retail, HNI, and Institutional investors
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 🌙 **Dark/Light Mode**: Automatic theme switching based on system preference
- 💰 **Comprehensive Input Fields**: Application amount, lot size, share price, and oversubscription ratio
- ⚡ **Real-time Results**: Instant calculation with detailed breakdown

## How It Works

The calculator uses historical IPO allotment patterns to estimate your probability of getting shares allocated. The calculation considers:

- **Application Amount**: The total amount you're investing
- **Lot Size**: Number of shares per lot for the IPO
- **Share Price**: Price per share of the IPO
- **Oversubscription Ratio**: How many times the IPO is oversubscribed
- **Investor Category**: Your investor classification (Retail/HNI/Institutional)

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: CSS3 with responsive design
- **Development**: ESLint for code quality

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository or download the project files
2. Navigate to the project directory
3. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

Build the project:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Project Structure

```
ipo-allotment-calculator/
├── src/
│   ├── components/
│   │   ├── IPOCalculator.tsx      # Main calculator component
│   │   └── IPOCalculator.css      # Component styles
│   ├── App.tsx                    # Root component
│   ├── App.css                    # App styles
│   ├── main.tsx                   # Application entry point
│   └── index.css                  # Global styles
├── public/                        # Static assets
├── package.json                   # Dependencies and scripts
├── vite.config.ts                # Vite configuration
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # This file
```

## Usage

1. **Enter IPO Details**:
   - Application Amount: The total money you want to invest
   - Lot Size: Number of shares per lot (found in IPO prospectus)
   - Share Price: Price per share (from IPO price band)
   - Oversubscription Ratio: Current oversubscription level

2. **Select Investor Category**:
   - Retail Individual Investor (RII): For investments up to ₹2 lakhs
   - High Net Worth Individual (HNI): For investments above ₹2 lakhs
   - Qualified Institutional Buyer (QIB): For institutional investors

3. **Calculate**: Click the "Calculate Allotment Probability" button to see your results

## Results Explanation

The calculator provides:
- **Allotment Probability**: Your estimated chance of getting shares (as percentage)
- **Lots Applied**: Number of lots you can apply for with your investment amount
- **Expected Allotment**: Estimated number of lots you might receive
- **Expected Shares**: Total shares you might get allocated

## Important Disclaimer

This calculator provides estimates based on historical patterns and general IPO allotment principles. The actual allotment depends on various factors including:
- Total number of applications received
- SEBI guidelines for allotment
- Registrar's allotment methodology
- Category-wise subscription levels

**This tool is for educational purposes only and should not be considered as investment advice.**

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

If you encounter any issues or have questions, please open an issue on the project repository.

---

**Happy Investing! 📈**
