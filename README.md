# JustCook.app Pitch Site

A beautiful, responsive pitch site for JustCook.app built with Astro, featuring an interactive financial model and real market data.

## ✨ New Features

- 📊 **Interactive Financial Model**: Bear/Base/Bull scenario analysis with real-time LTV/CAC calculations
- 📈 **Live Charts**: Revenue projections, cash flow analysis, and unit economics visualization  
- 🔍 **Market Research**: Real data from Grand View Research, Statista, and Hootsuite with proper citations
- 💰 **Financial Analysis Page**: Deep dive into unit economics, TAM/SAM/SOM, and growth projections

## Features

- 🎨 Modern, clean design
- 📱 Fully responsive
- ⚡ Fast loading with Astro
- 🌟 Interactive React components with Chart.js
- 📊 Real market data with citations
- 👥 Team showcase
- 📧 Contact form
- 💼 Financial modeling & analysis

## Tech Stack

- **Framework**: Astro with React islands
- **Charts**: Chart.js with react-chartjs-2
- **Styling**: CSS with custom properties
- **Data**: Real market research from credible sources
- **Deployment**: Cloudflare Pages ready

## Getting Started

```bash
# Clone the repository
git clone [repository-url]

# Navigate to the project
cd justcookapp-pitch

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── sections/
│   │   ├── FinancialModel.tsx
│   │   └── PitchDeckModal.astro
│   ├── layouts/
│   │   └── MainLayout.astro
│   ├── content/
│   │   └── references.md
│   └── pages/
│       ├── index.astro
│       └── financials.astro
└── package.json
```

## Components

### Core Sections
- **HeroSection**: Landing section with main value proposition
- **ProblemSection**: Market problem identification  
- **SolutionSection**: JustCook's solution overview
- **AppDemoSection**: Product demonstration
- **MarketSection**: Real market data with growth projections and sources
- **DataVizSection**: Business metrics and growth projections
- **HowItWorksSection**: Step-by-step process explanation
- **TechStackSection**: Technology choices and architecture  
- **TeamSection**: Founder and team information
- **ContactSection**: Contact form and information

### New Interactive Components
- **FinancialModel**: React component with sliders, scenarios, and live calculations
- **Financial Analysis Page**: Comprehensive unit economics and projections analysis

## Financial Model Features

- **Scenario Analysis**: Bear (conservative), Base (realistic), Bull (optimistic)
- **Interactive Sliders**: Adjust CAC, AOV, churn rate, margins, and fixed costs
- **Live Metrics**: LTV/CAC ratio, payback period, breakeven analysis
- **Visual Charts**: Revenue/EBITDA projections and cumulative cash flow
- **Local Storage**: Saves your custom inputs between sessions

## Market Data Sources

All market figures are from credible sources with proper attribution:
- Grand View Research (meal kit market data)
- Statista Digital Market Insights (GCC e-commerce)
- Hootsuite & DataReportal (social media trends)
- Talabat Annual Report (regional basket sizes)

## Deployment

### Cloudflare Pages (Recommended)

The site is optimized for Cloudflare Pages deployment:

```bash
# Build the site
npm run build

# Deploy with Wrangler (if configured)
npx wrangler pages publish dist
```

Or connect your GitHub repository to Cloudflare Pages with these settings:
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Node.js version**: 18 or higher

### Other Platforms

The site is a static build and works with any static hosting:
- Netlify, Vercel, GitHub Pages, AWS S3, etc.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## Customization

### Styling
The site uses CSS custom properties for easy theming:

```css
:root {
  --color-primary: #ff6b6b;
  --color-secondary: #2ec4b6;
  --color-accent: #ffe66d;
  /* ... */
}
```

### Financial Model
Adjust default scenarios in `src/components/FinancialModel.tsx`:

```typescript
const scenarios = {
  bear: { ordersPerDay: 25, aov: 85, cac: 120, ... },
  base: { ordersPerDay: 50, aov: 95, cac: 95, ... },
  bull: { ordersPerDay: 85, aov: 110, cac: 75, ... }
};
```

## Performance

- **Build size**: ~8KB main bundle + ~170KB financial model chunk (lazy loaded)
- **Load time**: <2s on average connection
- **Chart rendering**: Optimized with manual chunks for Chart.js
- **Mobile optimized**: Responsive design with touch-friendly controls

## License

[Add your license information here]
