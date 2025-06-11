import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Investment scenarios with calibrated business parameters
const investmentScenarios = {
  conservative: {
    investment: 300000,        // $300K USD - lean launch
    ordersPerDay: 60,
    aov: 80,
    cac: 90,
    monthlyChurn: 12,
    contributionMargin: 32,
    fixedCostsPerMonth: 65000,
  },
  balanced: {
    investment: 400000,        // $400K USD - balanced approach  
    ordersPerDay: 100,
    aov: 95,
    cac: 75,
    monthlyChurn: 10,
    contributionMargin: 36,
    fixedCostsPerMonth: 85000,
  },
  aggressive: {
    investment: 500000,        // $500K USD - rapid scale
    ordersPerDay: 150,
    aov: 110,
    cac: 60,
    monthlyChurn: 7,
    contributionMargin: 42,
    fixedCostsPerMonth: 110000,
  }
};

// Legacy scenarios for backwards compatibility
const scenarios = {
  bear: investmentScenarios.conservative,
  base: investmentScenarios.balanced,
  bull: investmentScenarios.aggressive
};

interface ModelInputs {
  investment: number;
  ordersPerDay: number;
  aov: number;
  cac: number;
  monthlyChurn: number;
  contributionMargin: number;
  fixedCostsPerMonth: number;
}

interface MonthlyMetrics {
  month: number;
  newCustomers: number;
  activeCustomers: number;
  revenue: number;
  grossProfit: number;
  customerAcquisitionCost: number;
  ebitda: number;
  cumulativeCash: number;
  ltv: number;
  ltvCacRatio: number;
  // New impactful metrics
  mrr: number; // Monthly Recurring Revenue growth
  arpu: number; // Average Revenue Per User
  grossMargin: number; // Gross Margin %
  burnRate: number; // Monthly burn rate
  runway: number; // Months of runway remaining
  marketPenetration: number; // % of TAM captured
  operatingLeverage: number; // Revenue / Fixed Costs ratio
  netIncome: number; // Bottom line profit/loss
  customerCohortValue: number; // Cumulative customer value
}

function calculateMetrics(inputs: ModelInputs): MonthlyMetrics[] {
  const results: MonthlyMetrics[] = [];
  let activeCustomers = 0;
  let cumulativeCash = -inputs.investment; // Initial investment from scenario
  const tamSize = 4200000000; // $4.2B GCC food e-commerce market in AED

  for (let month = 1; month <= 60; month++) {
    // More realistic growth assumptions: 8% monthly for first 6 months, 5% for next 12 months, then 3%
    let growthRate;
    if (month <= 6) {
      growthRate = 1.08;  // 8% monthly initial growth
    } else if (month <= 18) {
      growthRate = 1.05;  // 5% monthly sustained growth  
    } else {
      growthRate = 1.03;  // 3% monthly mature growth
    }
    
    const baseOrders = month === 1 ? inputs.ordersPerDay : inputs.ordersPerDay * Math.pow(growthRate, month - 1);
    const monthlyOrders = baseOrders * 30;
    
    // Calculate customer dynamics more realistically
    const churnedCustomers = Math.round(activeCustomers * (inputs.monthlyChurn / 100));
    
    // New customers needed = churned customers + net growth target
    // Assume 2.5 orders per active customer per month (frequency)
    const ordersFromActiveCustomers = activeCustomers * 2.5;
    const ordersFromNewCustomers = Math.max(0, monthlyOrders - ordersFromActiveCustomers);
    const newCustomers = Math.max(
      churnedCustomers, // At minimum replace churned customers
      Math.round(ordersFromNewCustomers / 1.2) // New customers typically order 1.2x in first month
    );
    
    activeCustomers = activeCustomers - churnedCustomers + newCustomers;
    
    // Financial calculations
    const revenue = monthlyOrders * inputs.aov;
    const grossProfit = revenue * (inputs.contributionMargin / 100);
    const customerAcquisitionCost = newCustomers * inputs.cac;
    const ebitda = grossProfit - customerAcquisitionCost - inputs.fixedCostsPerMonth;
    
    // Operating expenses (beyond CAC and fixed costs)
    const operatingExpenses = customerAcquisitionCost + inputs.fixedCostsPerMonth;
    const netIncome = grossProfit - operatingExpenses;
    
    cumulativeCash += ebitda;
    
    // LTV calculation (simplified)
    const avgCustomerLifespan = 1 / (inputs.monthlyChurn / 100); // months
    const ltv = (inputs.aov * (inputs.contributionMargin / 100) * avgCustomerLifespan);
    const ltvCacRatio = ltv / inputs.cac;
    
    // New impactful metrics
    const mrr = revenue; // In food delivery, this is effectively MRR
    const arpu = activeCustomers > 0 ? revenue / activeCustomers : 0;
    const grossMargin = inputs.contributionMargin; // Gross margin is always the contribution margin
    const burnRate = ebitda < 0 ? Math.abs(ebitda) : 0; // Monthly cash burn
    const runway = burnRate > 0 ? Math.max(0, cumulativeCash / burnRate) : 999; // Months left
    const marketPenetration = (revenue * 12) / tamSize * 100; // Annualized revenue as % of TAM
    const operatingLeverage = inputs.fixedCostsPerMonth > 0 ? revenue / inputs.fixedCostsPerMonth : 0;
    const customerCohortValue = activeCustomers * ltv; // Total customer base value

    results.push({
      month,
      newCustomers,
      activeCustomers,
      revenue,
      grossProfit,
      customerAcquisitionCost,
      ebitda,
      cumulativeCash,
      ltv,
      ltvCacRatio,
      mrr,
      arpu,
      grossMargin,
      burnRate,
      runway,
      marketPenetration,
      operatingLeverage,
      netIncome,
      customerCohortValue
    });
  }

  return results;
}

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '2rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    lineHeight: 1.5
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '3rem'
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #2ec4b6, #0077be)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: '1.1rem',
    color: 'var(--text-secondary)',
    fontWeight: 400
  },
  scenarioTabs: {
    display: 'flex',
    background: 'var(--bg-card)',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    padding: '4px',
    marginBottom: '3rem',
    justifyContent: 'center',
    maxWidth: '500px',
    margin: '0 auto 3rem auto',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  },
  scenarioTab: {
    flex: 1,
    padding: '12px 24px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-secondary)',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.95rem',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative' as const,
    textAlign: 'center' as const
  },
  scenarioTabActive: {
    background: 'linear-gradient(135deg, #2ec4b6, #0077be)',
    color: 'white',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(46, 196, 182, 0.4)'
  },
  mainLayout: {
    display: 'grid',
    gridTemplateColumns: '380px 1fr',
    gap: '2rem',
    alignItems: 'start',
    '@media (max-width: 1024px)': {
      gridTemplateColumns: '1fr',
      gap: '1.5rem'
    }
  },
  leftPanel: {
    position: 'sticky' as const,
    top: '2rem',
    background: 'var(--bg-card)',
    borderRadius: '20px',
    padding: '2rem',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
    border: '1px solid #f3f4f6',
    maxHeight: 'calc(100vh - 4rem)',
    overflowY: 'auto' as const,
    scrollbarWidth: 'thin' as const,
    '@media (max-width: 1024px)': {
      position: 'static',
      top: 'auto',
      maxHeight: 'none',
      overflowY: 'visible'
    }
  },
  rightPanel: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2rem'
  },
  sectionTitle: {
    fontSize: '1.2rem',
    fontWeight: 600,
    color: 'var(--text-heading)',
    marginBottom: '1.5rem',
    textAlign: 'center' as const
  },
  controlGroup: {
    marginBottom: '1.5rem'
  },
  controlLabel: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: 'var(--text-heading)',
    marginBottom: '0.75rem',
    display: 'block'
  },
  slider: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    background: '#e5e7eb',
    outline: 'none',
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
    cursor: 'pointer',
    marginBottom: '0.5rem'
  },
  sliderValue: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#2ec4b6',
    textAlign: 'center' as const
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem',
    marginBottom: '2rem'
  },
  metricCard: {
    background: 'var(--bg-card)',
    padding: '1.5rem',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    border: '1px solid #f3f4f6',
    textAlign: 'center' as const,
    transition: 'transform 0.2s ease'
  },
  chartsContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '2rem'
  },
  chartCard: {
    background: 'var(--bg-card)',
    borderRadius: '20px',
    padding: '2rem',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
    border: '1px solid #f3f4f6'
  },
  chartTitle: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: 'var(--text-heading)',
    marginBottom: '1.5rem',
    textAlign: 'center' as const
  },
  storySection: {
    marginBottom: '3rem',
    padding: '2rem',
    background: 'rgba(255, 255, 255, 0.02)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)'
  },
  storyTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--text-heading)',
    marginBottom: '1rem',
    background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  storyText: {
    fontSize: '1rem',
    lineHeight: '1.6',
    color: 'var(--text-body)',
    marginBottom: '2rem',
    opacity: 0.9
  },
  chartInsight: {
    marginTop: '1rem',
    padding: '1rem',
    background: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    borderRadius: '8px',
    fontSize: '0.9rem',
    color: 'var(--text-body)',
    lineHeight: '1.5'
  },
  responsiveLayout: {
    '@media (max-width: 1024px)': {
      gridTemplateColumns: '1fr',
      gap: '1.5rem'
    }
  }
};

// Currency conversion rates (base: AED)
const exchangeRates = {
  AED: 1,
  USD: 0.272, // 1 AED = 0.272 USD
  EUR: 0.249  // 1 AED = 0.249 EUR
};

const currencySymbols = {
  AED: 'AED',
  USD: '$',
  EUR: '€'
};

type Currency = keyof typeof exchangeRates;

export default function FinancialModel() {
  const [inputs, setInputs] = useState<ModelInputs>(investmentScenarios.balanced);
  const [debouncedInputs, setDebouncedInputs] = useState<ModelInputs>(investmentScenarios.balanced);
  const [activeScenario, setActiveScenario] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('AED');

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('justcook-financial-inputs');
    if (saved) {
      try {
        const savedInputs = JSON.parse(saved);
        setInputs(savedInputs);
        setDebouncedInputs(savedInputs);
      } catch (e) {
        console.warn('Failed to load saved inputs');
      }
    }
  }, []);

  // Debounce inputs to reduce chart re-renders and smooth animations
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInputs(inputs);
      localStorage.setItem('justcook-financial-inputs', JSON.stringify(inputs));
    }, 200);

    return () => clearTimeout(timer);
  }, [inputs]);

  const metrics = useMemo(() => calculateMetrics(debouncedInputs), [debouncedInputs]);

  const handleInputChange = useCallback((field: keyof ModelInputs, value: number) => {
    setInputs(prev => ({ ...prev, [field]: value }));
    setActiveScenario('balanced');
  }, []);

  const loadScenario = useCallback((scenario: 'conservative' | 'balanced' | 'aggressive') => {
    const scenarioInputs = investmentScenarios[scenario];
    setInputs(scenarioInputs);
    setDebouncedInputs(scenarioInputs); // Immediate update for scenario changes
    setActiveScenario(scenario);
  }, []);

  // Currency conversion function
  const convertCurrency = useCallback((amountInAED: number, targetCurrency: Currency = selectedCurrency): number => {
    return amountInAED * exchangeRates[targetCurrency];
  }, [selectedCurrency]);

  // Format currency with proper symbol
  const formatCurrency = useCallback((amountInAED: number, targetCurrency: Currency = selectedCurrency): string => {
    const convertedAmount = convertCurrency(amountInAED, targetCurrency);
    const symbol = currencySymbols[targetCurrency];
    return symbol === 'AED' ? 
      `AED ${Math.round(convertedAmount).toLocaleString()}` : 
      `${symbol}${Math.round(convertedAmount).toLocaleString()}`;
  }, [convertCurrency, selectedCurrency]);

  const currentMetrics = metrics[11] || metrics[metrics.length - 1];

  // Calculate dynamic axis ranges with padding
  const revenueAxisRange = useMemo(() => {
    const filteredMetrics = metrics.filter((_, i) => i % 6 === 0);
    const revenues = filteredMetrics.map(m => convertCurrency(m.revenue));
    const ebitdas = filteredMetrics.map(m => convertCurrency(m.ebitda));
    const allValues = [...revenues, ...ebitdas];
    
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = Math.abs(max - min) * 0.1; // 10% padding
    
    const roundingFactor = selectedCurrency === 'AED' ? 100000 : 50000; // Different rounding for different currencies
    return {
      min: Math.floor((min - padding) / roundingFactor) * roundingFactor,
      max: Math.ceil((max + padding) / roundingFactor) * roundingFactor
    };
  }, [metrics, convertCurrency, selectedCurrency]);

  const cashFlowAxisRange = useMemo(() => {
    const cashFlows = metrics.filter((_, i) => i % 6 === 0).map(m => convertCurrency(m.cumulativeCash));
    const min = Math.min(...cashFlows);
    const max = Math.max(...cashFlows);
    const padding = Math.abs(max - min) * 0.1; // 10% padding
    
    const roundingFactor = selectedCurrency === 'AED' ? 100000 : 50000; // Different rounding for different currencies
    return {
      min: Math.floor((min - padding) / roundingFactor) * roundingFactor,
      max: Math.ceil((max + padding) / roundingFactor) * roundingFactor
    };
  }, [metrics, convertCurrency, selectedCurrency]);

  // Stable chart data with fixed labels and smooth animations
  const chartLabels = ['Month 1', 'Month 6', 'Month 12', 'Month 18', 'Month 24', 'Month 30', 'Month 36', 'Month 42', 'Month 48', 'Month 54', 'Month 60'];
  
  const revenueChartData = useMemo(() => {
    const filteredMetrics = metrics.filter((_, i) => i % 6 === 0);
    return {
      labels: chartLabels,
              datasets: [
          {
            label: `Monthly Revenue (${selectedCurrency})`,
            data: filteredMetrics.map(m => convertCurrency(m.revenue)),
            borderColor: 'rgb(46, 196, 182)',
            backgroundColor: 'rgba(46, 196, 182, 0.1)',
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
          },
          {
            label: `EBITDA (${selectedCurrency})`,
            data: filteredMetrics.map(m => convertCurrency(m.ebitda)),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
          }
        ]
    };
  }, [metrics, selectedCurrency, convertCurrency]);

  const cashFlowData = useMemo(() => ({
    labels: chartLabels,
    datasets: [
      {
        label: `Cumulative Cash Flow (${selectedCurrency})`,
        data: metrics.filter((_, i) => i % 6 === 0).map(m => convertCurrency(m.cumulativeCash)),
        borderColor: currentMetrics.ltvCacRatio > 3 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
        backgroundColor: currentMetrics.ltvCacRatio > 3 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
      }
    ]
  }), [metrics, currentMetrics.ltvCacRatio, selectedCurrency, convertCurrency]);

  // P&L Chart Data
  const plChartData = useMemo(() => {
    const filteredMetrics = metrics.filter((_, i) => i % 6 === 0);
    return {
      labels: chartLabels,
      datasets: [
        {
          label: `Gross Profit (${selectedCurrency})`,
          data: filteredMetrics.map(m => convertCurrency(m.grossProfit)),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
        },
        {
          label: `Net Income (${selectedCurrency})`,
          data: filteredMetrics.map(m => convertCurrency(m.netIncome)),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
        },
        {
          label: `Fixed Costs (${selectedCurrency})`,
          data: filteredMetrics.map(m => -convertCurrency(inputs.fixedCostsPerMonth)),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
        }
      ]
    };
  }, [metrics, selectedCurrency, convertCurrency, inputs.fixedCostsPerMonth]);

  // Business Metrics Chart Data
  const businessMetricsData = useMemo(() => {
    const filteredMetrics = metrics.filter((_, i) => i % 6 === 0);
    return {
      labels: chartLabels,
      datasets: [
        {
          label: 'Active Customers',
          data: filteredMetrics.map(m => m.activeCustomers),
          borderColor: 'rgb(168, 85, 247)',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          yAxisID: 'y'
        },
        {
          label: `ARPU (${selectedCurrency})`,
          data: filteredMetrics.map(m => convertCurrency(m.arpu)),
          borderColor: 'rgb(245, 158, 11)',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          yAxisID: 'y1'
        },
        {
          label: 'Gross Margin %',
          data: filteredMetrics.map(m => m.grossMargin),
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          yAxisID: 'y2'
        }
      ]
    };
  }, [metrics, selectedCurrency, convertCurrency]);

  // Stable chart options to prevent axis jumping
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750,
      easing: 'easeInOutQuart' as const,
    },
    plugins: {
      legend: {
        labels: {
          color: 'var(--text-primary)',
          usePointStyle: true,
          padding: 20,
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      }
    },
    scales: {
      x: {
        ticks: {
          color: 'var(--text-secondary)',
          maxTicksLimit: 6,
        },
        grid: {
          color: 'rgba(128, 128, 128, 0.1)',
          drawBorder: false,
        }
      },
      y: {
        min: revenueAxisRange.min,
        max: revenueAxisRange.max,
        ticks: {
          color: 'var(--text-secondary)',
          callback: function(value: any) {
            const symbol = currencySymbols[selectedCurrency];
            const formatted = Math.round(Number(value)).toLocaleString();
            return symbol === 'AED' ? `AED ${formatted}` : `${symbol}${formatted}`;
          },
          maxTicksLimit: 8,
        },
        grid: {
          color: 'rgba(128, 128, 128, 0.1)',
          drawBorder: false,
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    }
  }), [revenueAxisRange, selectedCurrency]);

  const cashFlowOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750,
      easing: 'easeInOutQuart' as const,
    },
    plugins: {
      legend: {
        labels: {
          color: 'var(--text-primary)',
          usePointStyle: true,
          padding: 20,
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      }
    },
    scales: {
      x: {
        ticks: {
          color: 'var(--text-secondary)',
          maxTicksLimit: 6,
        },
        grid: {
          color: 'rgba(128, 128, 128, 0.1)',
          drawBorder: false,
        }
      },
      y: {
        min: cashFlowAxisRange.min,
        max: cashFlowAxisRange.max,
        ticks: {
          color: 'var(--text-secondary)',
          callback: function(value: any) {
            const symbol = currencySymbols[selectedCurrency];
            const formatted = Math.round(Number(value)).toLocaleString();
            return symbol === 'AED' ? `AED ${formatted}` : `${symbol}${formatted}`;
          },
          maxTicksLimit: 8,
        },
        grid: {
          color: 'rgba(128, 128, 128, 0.1)',
          drawBorder: false,
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    }
  }), [cashFlowAxisRange, selectedCurrency]);

  // P&L Chart Options
  const plChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750,
      easing: 'easeInOutQuart' as const,
    },
    plugins: {
      legend: {
        labels: {
          color: 'var(--text-primary)',
          usePointStyle: true,
          padding: 20,
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      }
    },
    scales: {
      x: {
        ticks: {
          color: 'var(--text-secondary)',
          maxTicksLimit: 6,
        },
        grid: {
          color: 'rgba(128, 128, 128, 0.1)',
          drawBorder: false,
        }
      },
      y: {
        ticks: {
          color: 'var(--text-secondary)',
          callback: function(value: any) {
            const symbol = currencySymbols[selectedCurrency];
            const formatted = Math.round(Number(value)).toLocaleString();
            return symbol === 'AED' ? `AED ${formatted}` : `${symbol}${formatted}`;
          },
          maxTicksLimit: 8,
        },
        grid: {
          color: 'rgba(128, 128, 128, 0.1)',
          drawBorder: false,
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    }
  }), [selectedCurrency]);

  // Business Metrics Chart Options (multi-axis)
  const businessMetricsOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750,
      easing: 'easeInOutQuart' as const,
    },
    plugins: {
      legend: {
        labels: {
          color: 'var(--text-primary)',
          usePointStyle: true,
          padding: 20,
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      }
    },
    scales: {
      x: {
        ticks: {
          color: 'var(--text-secondary)',
          maxTicksLimit: 6,
        },
        grid: {
          color: 'rgba(128, 128, 128, 0.1)',
          drawBorder: false,
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        ticks: {
          color: 'var(--text-secondary)',
          maxTicksLimit: 8,
        },
        grid: {
          color: 'rgba(128, 128, 128, 0.1)',
          drawBorder: false,
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        ticks: {
          color: 'var(--text-secondary)',
          callback: function(value: any) {
            const symbol = currencySymbols[selectedCurrency];
            const formatted = Math.round(Number(value)).toLocaleString();
            return symbol === 'AED' ? `AED ${formatted}` : `${symbol}${formatted}`;
          },
          maxTicksLimit: 6,
        },
        grid: {
          drawOnChartArea: false,
        },
      },
      y2: {
        type: 'linear' as const,
        display: false,
        ticks: {
          callback: function(value: any) {
            return value + '%';
          },
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    }
  }), [selectedCurrency]);

  return (
    <>
      <style>{`
        .financial-left-panel::-webkit-scrollbar {
          width: 6px;
        }
        
        .financial-left-panel::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 3px;
        }
        
        .financial-left-panel::-webkit-scrollbar-thumb {
          background: rgba(46, 196, 182, 0.3);
          border-radius: 3px;
        }
        
        .financial-left-panel::-webkit-scrollbar-thumb:hover {
          background: rgba(46, 196, 182, 0.5);
        }

        @media (max-width: 1024px) {
          .financial-main-layout {
            grid-template-columns: 1fr !important;
            gap: 1.5rem !important;
          }
          .financial-left-panel {
            position: static !important;
            top: auto !important;
            max-height: none !important;
            overflow-y: visible !important;
          }
        }
        @media (max-width: 768px) {
          .financial-container {
            padding: 1rem !important;
          }
          .financial-header {
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
            gap: 1rem !important;
          }
          .financial-header > div:first-child {
            order: 2;
          }
          .financial-header > div:last-child {
            order: 1;
            align-items: center !important;
          }
          .financial-scenario-tabs {
            flex-direction: column !important;
            padding: 8px !important;
            max-width: 100% !important;
            margin: 0 0 2rem 0 !important;
          }
          .financial-story-metrics {
            grid-template-columns: 1fr !important;
          }
          .financial-chart-container {
            height: 250px !important;
          }
          .financial-story-section {
            padding: 1.5rem !important;
            margin-bottom: 2rem !important;
          }
          .financial-story-title {
            font-size: 1.25rem !important;
          }
          .financial-title {
            font-size: 2rem !important;
          }
        }
        @media (max-width: 480px) {
          .financial-container {
            padding: 0.5rem !important;
          }
          .financial-left-panel {
            padding: 1rem !important;
          }
          .financial-story-section {
            padding: 1rem !important;
          }
          .financial-chart-container {
            height: 200px !important;
          }
        }
      `}</style>
      <div className="financial-container" style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div className="financial-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h1 className="financial-title" style={styles.title}>Financial Model</h1>
            <p style={styles.subtitle}>Interactive scenario analysis with real-time projections</p>
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '0.5rem'
          }}>
            <label style={{ 
              fontSize: '0.9rem', 
              color: 'var(--text-secondary)',
              fontWeight: 600 
            }}>Currency</label>
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value as Currency)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="AED">AED (درهم)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Investment Scenario Tabs */}
      <div className="financial-scenario-tabs" style={styles.scenarioTabs}>
        <button 
          style={{
            ...styles.scenarioTab,
            ...(activeScenario === 'conservative' ? styles.scenarioTabActive : {})
          }}
          onClick={() => loadScenario('conservative')}
        >
          Conservative
          <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '2px' }}>$300K</div>
        </button>
        <button 
          style={{
            ...styles.scenarioTab,
            ...(activeScenario === 'balanced' ? styles.scenarioTabActive : {})
          }}
          onClick={() => loadScenario('balanced')}
        >
          Balanced
          <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '2px' }}>$400K</div>
        </button>
        <button 
          style={{
            ...styles.scenarioTab,
            ...(activeScenario === 'aggressive' ? styles.scenarioTabActive : {})
          }}
          onClick={() => loadScenario('aggressive')}
        >
          Aggressive
          <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '2px' }}>$500K</div>
        </button>
      </div>

      {/* Main Layout */}
      <div className="financial-main-layout" style={styles.mainLayout}>
        {/* Left Panel - Controls */}
        <div className="financial-left-panel" style={styles.leftPanel}>
          <h3 style={styles.sectionTitle}>Business Parameters</h3>
          
          <div style={styles.controlGroup}>
            <label style={styles.controlLabel}>Investment Amount</label>
            <div style={styles.sliderValue}>${inputs.investment.toLocaleString()}</div>
          </div>

          <div style={styles.controlGroup}>
            <label style={styles.controlLabel}>Daily Orders (Year 1)</label>
            <input
              type="range"
              min="5"
              max="500"
              value={inputs.ordersPerDay}
              onChange={e => handleInputChange('ordersPerDay', Number(e.target.value))}
              style={styles.slider}
            />
            <div style={styles.sliderValue}>{inputs.ordersPerDay} orders/day</div>
          </div>

          <div style={styles.controlGroup}>
            <label style={styles.controlLabel}>Average Order Value</label>
            <input
              type="range"
              min="30"
              max="400"
              step="5"
              value={inputs.aov}
              onChange={e => handleInputChange('aov', Number(e.target.value))}
              style={styles.slider}
            />
            <div style={styles.sliderValue}>{formatCurrency(inputs.aov)}</div>
          </div>

          <div style={styles.controlGroup}>
            <label style={styles.controlLabel}>Customer Acquisition Cost</label>
            <input
              type="range"
              min="20"
              max="300"
              step="5"
              value={inputs.cac}
              onChange={e => handleInputChange('cac', Number(e.target.value))}
              style={styles.slider}
            />
            <div style={styles.sliderValue}>{formatCurrency(inputs.cac)}</div>
          </div>

          <div style={styles.controlGroup}>
            <label style={styles.controlLabel}>Monthly Churn Rate</label>
            <input
              type="range"
              min="2"
              max="30"
              value={inputs.monthlyChurn}
              onChange={e => handleInputChange('monthlyChurn', Number(e.target.value))}
              style={styles.slider}
            />
            <div style={styles.sliderValue}>{inputs.monthlyChurn}%</div>
          </div>

          <div style={styles.controlGroup}>
            <label style={styles.controlLabel}>Contribution Margin</label>
            <input
              type="range"
              min="10"
              max="60"
              value={inputs.contributionMargin}
              onChange={e => handleInputChange('contributionMargin', Number(e.target.value))}
              style={styles.slider}
            />
            <div style={styles.sliderValue}>{inputs.contributionMargin}%</div>
          </div>

          <div style={styles.controlGroup}>
            <label style={styles.controlLabel}>Monthly Fixed Costs</label>
            <input
              type="range"
              min="30000"
              max="500000"
              step="10000"
              value={inputs.fixedCostsPerMonth}
              onChange={e => handleInputChange('fixedCostsPerMonth', Number(e.target.value))}
              style={styles.slider}
            />
            <div style={styles.sliderValue}>{formatCurrency(inputs.fixedCostsPerMonth)}</div>
          </div>
        </div>

        {/* Right Panel - Investment Story */}
        <div style={styles.rightPanel}>
          
          {/* Story Section 1: Strong Unit Economics */}
          <div className="financial-story-section" style={styles.storySection}>
            <h3 className="financial-story-title" style={styles.storyTitle}>1. Proven Unit Economics</h3>
            <p style={styles.storyText}>
              JustCook demonstrates strong unit economics with healthy LTV:CAC ratios and sustainable profit margins. 
              Our model shows a clear path to profitability with industry-leading efficiency metrics.
            </p>
            
            <div className="financial-story-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div style={styles.metricCard}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-heading)', fontSize: '0.9rem' }}>LTV / CAC Ratio</h4>
                <div style={{ 
                  fontSize: '1.8rem', 
                  fontWeight: 700, 
                  margin: '0.5rem 0',
                  color: currentMetrics.ltvCacRatio > 3 ? '#059669' : '#dc2626'
                }}>
                  {currentMetrics.ltvCacRatio.toFixed(1)}
                </div>
                <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>Target: &gt; 3.0 ✓</p>
              </div>

              <div style={styles.metricCard}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-heading)', fontSize: '0.9rem' }}>Gross Margin</h4>
                <div style={{ 
                  fontSize: '1.8rem', 
                  fontWeight: 700, 
                  margin: '0.5rem 0',
                  color: currentMetrics.grossMargin > 30 ? '#059669' : currentMetrics.grossMargin > 20 ? '#d97706' : '#dc2626'
                }}>
                  {currentMetrics.grossMargin.toFixed(1)}%
                </div>
                <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>Above industry standard</p>
              </div>

              <div style={styles.metricCard}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-heading)', fontSize: '0.9rem' }}>ARPU Growth</h4>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0.5rem 0' }}>
                  {formatCurrency(currentMetrics.arpu)}
                </div>
                <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>Increasing customer value</p>
              </div>
            </div>
          </div>

          {/* Story Section 2: Scalable Growth Trajectory */}
          <div className="financial-story-section" style={styles.storySection}>
            <h3 className="financial-story-title" style={styles.storyTitle}>2. Scalable Growth Trajectory</h3>
            <p style={styles.storyText}>
              Our revenue model shows accelerating growth with improving operational leverage. 
              As we scale, fixed costs become more efficient and profit margins expand significantly.
            </p>
            
            <div style={styles.chartCard}>
              <h4 style={styles.chartTitle}>Revenue Growth & Operational Leverage</h4>
              <div className="financial-chart-container" style={{ height: '350px', width: '100%' }}>
                <Line data={revenueChartData} options={chartOptions} />
              </div>
              <div style={styles.chartInsight}>
                <strong>Key Insight:</strong> Revenue scales exponentially while fixed costs remain stable, 
                creating expanding profit margins as we reach scale.
              </div>
            </div>
          </div>

          {/* Story Section 3: Clear Path to Profitability */}
          <div className="financial-story-section" style={styles.storySection}>
            <h3 className="financial-story-title" style={styles.storyTitle}>3. Clear Path to Profitability</h3>
            <p style={styles.storyText}>
              Our P&L projections show a definitive timeline to profitability with strong margin expansion. 
              Operating leverage kicks in as revenue growth outpaces cost increases.
            </p>
            
            <div style={styles.chartCard}>
              <h4 style={styles.chartTitle}>Profit & Loss Progression</h4>
              <div className="financial-chart-container" style={{ height: '350px', width: '100%' }}>
                <Line data={plChartData} options={plChartOptions} />
              </div>
              <div style={styles.chartInsight}>
                <strong>Key Insight:</strong> Net income turns positive by month {
                  metrics.findIndex(m => m.netIncome > 0) + 1 || 'N/A'
                }, with accelerating profitability thereafter.
              </div>
            </div>
          </div>

          {/* Story Section 4: Market Opportunity & Capture */}
          <div className="financial-story-section" style={styles.storySection}>
            <h3 className="financial-story-title" style={styles.storyTitle}>4. Massive Market with Clear Capture Strategy</h3>
            <p style={styles.storyText}>
              Operating in the $4.2B GCC food e-commerce market, our customer acquisition and retention 
              metrics show sustainable market capture with room for significant expansion.
            </p>
            
            <div className="financial-story-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div style={styles.metricCard}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-heading)', fontSize: '0.9rem' }}>Market Penetration</h4>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0.5rem 0' }}>
                  {currentMetrics.marketPenetration.toFixed(3)}%
                </div>
                <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>Of $4.2B TAM - huge runway</p>
              </div>

              <div style={styles.metricCard}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-heading)', fontSize: '0.9rem' }}>Customer Base</h4>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0.5rem 0' }}>
                  {currentMetrics.activeCustomers.toLocaleString()}
                </div>
                <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>Active users by month 12</p>
              </div>

              <div style={styles.metricCard}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-heading)', fontSize: '0.9rem' }}>Revenue Rate</h4>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0.5rem 0' }}>
                  {formatCurrency(currentMetrics.revenue)}
                </div>
                <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>Monthly run rate</p>
              </div>
            </div>

            <div style={styles.chartCard}>
              <h4 style={styles.chartTitle}>Customer Growth & Business Metrics</h4>
              <div className="financial-chart-container" style={{ height: '350px', width: '100%' }}>
                <Line data={businessMetricsData} options={businessMetricsOptions} />
              </div>
              <div style={styles.chartInsight}>
                <strong>Key Insight:</strong> Customer acquisition accelerates while ARPU increases, 
                demonstrating strong product-market fit and expansion opportunities.
              </div>
            </div>
          </div>

          {/* Story Section 5: Smart Capital Efficiency */}
          <div className="financial-story-section" style={styles.storySection}>
            <h3 className="financial-story-title" style={styles.storyTitle}>5. Capital Efficient Growth</h3>
            <p style={styles.storyText}>
              Our funding requirements are optimized for maximum runway and growth. 
              Cash flow projections show when we achieve self-sustaining growth.
            </p>
            
            <div className="financial-story-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div style={styles.metricCard}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-heading)', fontSize: '0.9rem' }}>Monthly Burn</h4>
                <div style={{ 
                  fontSize: '1.8rem', 
                  fontWeight: 700, 
                  margin: '0.5rem 0',
                  color: currentMetrics.burnRate === 0 ? '#059669' : '#dc2626'
                }}>
                  {currentMetrics.burnRate > 0 ? formatCurrency(currentMetrics.burnRate) : 'Profitable'}
                </div>
                <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>Decreasing over time</p>
              </div>

              <div style={styles.metricCard}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-heading)', fontSize: '0.9rem' }}>Runway</h4>
                <div style={{ 
                  fontSize: '1.8rem', 
                  fontWeight: 700, 
                  margin: '0.5rem 0',
                  color: currentMetrics.runway > 24 ? '#059669' : currentMetrics.runway > 12 ? '#d97706' : '#dc2626'
                }}>
                  {currentMetrics.runway === 999 ? '∞' : Math.round(currentMetrics.runway)}
                </div>
                <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>Months to profitability</p>
              </div>

              <div style={styles.metricCard}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-heading)', fontSize: '0.9rem' }}>Operating Leverage</h4>
                <div style={{ 
                  fontSize: '1.8rem', 
                  fontWeight: 700, 
                  margin: '0.5rem 0',
                  color: currentMetrics.operatingLeverage > 2 ? '#059669' : '#d97706'
                }}>
                  {currentMetrics.operatingLeverage.toFixed(1)}x
                </div>
                <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>Efficient cost scaling</p>
              </div>
            </div>

            <div style={styles.chartCard}>
              <h4 style={styles.chartTitle}>Cash Flow & Path to Self-Sustainability</h4>
              <div className="financial-chart-container" style={{ height: '350px', width: '100%' }}>
                <Line data={cashFlowData} options={cashFlowOptions} />
              </div>
              <div style={styles.chartInsight}>
                <strong>Key Insight:</strong> Positive cumulative cash flow achieved by month {
                  metrics.findIndex(m => m.cumulativeCash > 0) + 1 || 'N/A'
                }, ensuring investor capital protection and growth sustainability.
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
    </>
  );
}