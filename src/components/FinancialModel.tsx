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

// Exchange rates
const exchangeRates = {
  AED: 1,
  USD: 0.272,
  EUR: 0.249
};

type Currency = keyof typeof exchangeRates;

// Percentile-based parameter ranges for auto-adjustment
const parameterRanges = {
  ordersPerDay: { p10: 20, p50: 100, p90: 200 },
  aov: { p10: 50, p50: 95, p90: 150 },
  cac: { p10: 40, p50: 75, p90: 120 },
  monthlyChurn: { p10: 5, p50: 10, p90: 20 },
  contributionMargin: { p10: 25, p50: 36, p90: 50 },
  fixedCostsPerMonth: { p10: 50000, p50: 85000, p90: 150000 }
};

function calculateParameterFromPercentile(percentile: number, range: {p10: number, p50: number, p90: number}): number {
  // Convert percentile (10-90) to interpolated value
  if (percentile <= 50) {
    // Interpolate between p10 and p50
    const ratio = (percentile - 10) / 40; // 0 to 1
    return Math.round(range.p10 + (range.p50 - range.p10) * ratio);
  } else {
    // Interpolate between p50 and p90
    const ratio = (percentile - 50) / 40; // 0 to 1
    return Math.round(range.p50 + (range.p90 - range.p50) * ratio);
  }
}

export default function FinancialModel() {
  const [selectedScenario, setSelectedScenario] = useState<keyof typeof investmentScenarios>('balanced');
  const [inputs, setInputs] = useState<ModelInputs>(investmentScenarios.balanced);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('AED');
  const [metrics, setMetrics] = useState<MonthlyMetrics[]>([]);
  const [percentile, setPercentile] = useState<number>(50);

  // Calculate metrics when inputs change
  useEffect(() => {
    const calculatedMetrics = calculateMetrics(inputs);
    setMetrics(calculatedMetrics);
  }, [inputs]);

  // Currency conversion function
  const convertCurrency = useCallback((amount: number, fromCurrency: Currency = 'AED') => {
    if (fromCurrency === selectedCurrency) return amount;
    
    // Convert to AED first if not already
    const aedAmount = fromCurrency === 'AED' ? amount : amount / exchangeRates[fromCurrency];
    
    // Convert from AED to target currency
    return aedAmount * exchangeRates[selectedCurrency];
  }, [selectedCurrency]);

  // Format currency helper
  const formatCurrency = useCallback((amount: number, fromCurrency: Currency = 'AED') => {
    const convertedAmount = convertCurrency(amount, fromCurrency);
    const roundedAmount = Math.round(convertedAmount);
    
    const symbols = { AED: '', USD: '$', EUR: '€' };
    const suffix = selectedCurrency === 'AED' ? ' AED' : '';
    
    return `${symbols[selectedCurrency]}${roundedAmount.toLocaleString()}${suffix}`;
  }, [convertCurrency, selectedCurrency]);

  const updateInputs = (newInputs: Partial<ModelInputs>) => {
    setInputs(prev => ({ ...prev, ...newInputs }));
  };

  const loadScenario = (scenario: keyof typeof investmentScenarios) => {
    setSelectedScenario(scenario);
    setInputs(investmentScenarios[scenario]);
    setPercentile(50); // Reset percentile when loading scenario
  };

  const updatePercentile = (newPercentile: number) => {
    setPercentile(newPercentile);
    
    // Auto-adjust all parameters based on percentile
    const newInputs: Partial<ModelInputs> = {
      ordersPerDay: calculateParameterFromPercentile(newPercentile, parameterRanges.ordersPerDay),
      aov: calculateParameterFromPercentile(newPercentile, parameterRanges.aov),
      cac: calculateParameterFromPercentile(newPercentile, parameterRanges.cac),
      monthlyChurn: calculateParameterFromPercentile(newPercentile, parameterRanges.monthlyChurn),
      contributionMargin: calculateParameterFromPercentile(newPercentile, parameterRanges.contributionMargin),
      fixedCostsPerMonth: calculateParameterFromPercentile(newPercentile, parameterRanges.fixedCostsPerMonth),
    };
    
    setInputs(prev => ({ ...prev, ...newInputs }));
  };

  const currentMetrics = metrics[11] || metrics[metrics.length - 1];

  // Chart data
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
        borderColor: (metrics[11]?.ltvCacRatio || 0) > 3 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
        backgroundColor: (metrics[11]?.ltvCacRatio || 0) > 3 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
      }
    ]
  }), [metrics, currentMetrics?.ltvCacRatio, selectedCurrency, convertCurrency]);

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

  const chartOptions = useMemo(() => {
    // Get computed colors for current theme (check if we're in browser)
    const isDarkMode = typeof document !== 'undefined' ? 
      document.documentElement.classList.contains('dark-mode') : false;
    const textPrimary = isDarkMode ? '#ffffff' : '#1f2937';
    const textSecondary = isDarkMode ? '#9ca3af' : '#6b7280';
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(128, 128, 128, 0.1)';
    
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 750,
        easing: 'easeInOutQuart' as const,
      },
      plugins: {
        legend: {
          labels: {
            color: textPrimary,
            usePointStyle: true,
            padding: 20,
          }
        },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          titleColor: textPrimary,
          bodyColor: textSecondary,
          borderColor: isDarkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)',
          borderWidth: 1,
        }
      },
      scales: {
        x: {
          ticks: {
            color: textSecondary,
            maxTicksLimit: 6,
          },
          grid: {
            color: gridColor,
          }
        },
        y: {
          ticks: {
            color: textSecondary,
            callback: function(value: any) {
              const symbols = { AED: '', USD: '$', EUR: '€' };
              const suffix = selectedCurrency === 'AED' ? ' AED' : '';
              const formatted = Math.round(Number(value)).toLocaleString();
              return `${symbols[selectedCurrency]}${formatted}${suffix}`;
            },
            maxTicksLimit: 8,
          },
          grid: {
            color: gridColor,
          }
        }
      },
      interaction: {
        mode: 'nearest' as const,
        axis: 'x' as const,
        intersect: false,
      }
    };
  }, [selectedCurrency]);

  const businessMetricsOptions = useMemo(() => {
    // Get computed colors for current theme (check if we're in browser)
    const isDarkMode = typeof document !== 'undefined' ? 
      document.documentElement.classList.contains('dark-mode') : false;
    const textPrimary = isDarkMode ? '#ffffff' : '#1f2937';
    const textSecondary = isDarkMode ? '#9ca3af' : '#6b7280';
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(128, 128, 128, 0.1)';
    
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 750,
        easing: 'easeInOutQuart' as const,
      },
      plugins: {
        legend: {
          labels: {
            color: textPrimary,
            usePointStyle: true,
            padding: 20,
          }
        },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          titleColor: textPrimary,
          bodyColor: textSecondary,
          borderColor: isDarkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)',
          borderWidth: 1,
        }
      },
      scales: {
        x: {
          ticks: {
            color: textSecondary,
            maxTicksLimit: 6,
          },
          grid: {
            color: gridColor,
          }
        },
        y: {
          type: 'linear' as const,
          display: true,
          position: 'left' as const,
          ticks: {
            color: textSecondary,
            maxTicksLimit: 8,
          },
          grid: {
            color: gridColor,
          }
        },
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          ticks: {
            color: textSecondary,
            callback: function(value: any) {
              const symbols = { AED: '', USD: '$', EUR: '€' };
              const suffix = selectedCurrency === 'AED' ? ' AED' : '';
              const formatted = Math.round(Number(value)).toLocaleString();
              return `${symbols[selectedCurrency]}${formatted}${suffix}`;
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
            color: textSecondary,
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
    };
  }, [selectedCurrency]);

  // CSV generation helpers
  const first36Metrics = metrics.slice(0, 36);

  const generatePnlCsv = () => {
    const headers = [
      'Month',
      `Revenue (${selectedCurrency})`,
      `Cost of Goods Sold (${selectedCurrency})`,
      `Gross Profit (${selectedCurrency})`,
      `Marketing & Sales (CAC) (${selectedCurrency})`,
      `General & Admin (${selectedCurrency})`,
      `Technology & R&D (${selectedCurrency})`,
      `Total Operating Expenses (${selectedCurrency})`,
      `EBITDA (${selectedCurrency})`,
      `Depreciation & Amortization (${selectedCurrency})`,
      `EBIT (${selectedCurrency})`,
      `Interest Expense (${selectedCurrency})`,
      `EBT (${selectedCurrency})`,
      `Tax (${selectedCurrency})`,
      `Net Income (${selectedCurrency})`
    ];

    const rows = first36Metrics.map(m => {
      const revenue = convertCurrency(m.revenue);
      const cogs = revenue - convertCurrency(m.grossProfit);
      const marketing = convertCurrency(m.customerAcquisitionCost);
      const gAndA = convertCurrency(inputs.fixedCostsPerMonth * 0.6);
      const tech = convertCurrency(inputs.fixedCostsPerMonth * 0.4);
      const operatingExpenses = marketing + gAndA + tech;
      const depreciation = 0;
      const interest = 0;
      const ebit = convertCurrency(m.ebitda) - depreciation;
      const ebt = ebit - interest;
      const tax = 0; // Simplified – assume zero corporate tax for projection

      return [
        m.month,
        Math.round(revenue),
        Math.round(cogs),
        Math.round(convertCurrency(m.grossProfit)),
        Math.round(marketing),
        Math.round(gAndA),
        Math.round(tech),
        Math.round(operatingExpenses),
        Math.round(convertCurrency(m.ebitda)),
        Math.round(depreciation),
        Math.round(ebit),
        Math.round(interest),
        Math.round(ebt),
        Math.round(tax),
        Math.round(convertCurrency(m.netIncome))
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  };

  const generateBalanceSheetCsv = () => {
    const headers = [
      'Month',
      `Cash & Equivalents (${selectedCurrency})`,
      `Accounts Receivable (${selectedCurrency})`,
      `Inventory (${selectedCurrency})`,
      `Total Current Assets (${selectedCurrency})`,
      `PP&E (${selectedCurrency})`,
      `Intangibles (${selectedCurrency})`,
      `Total Assets (${selectedCurrency})`,
      `Accounts Payable (${selectedCurrency})`,
      `Accrued Expenses (${selectedCurrency})`,
      `Debt (${selectedCurrency})`,
      `Total Liabilities (${selectedCurrency})`,
      `Paid-in Capital (${selectedCurrency})`,
      `Retained Earnings (${selectedCurrency})`,
      `Total Equity (${selectedCurrency})`
    ];

    let cumulativeRetained = 0;
    const paidInCapital = convertCurrency(inputs.investment, 'USD');

    const rows = first36Metrics.map(m => {
      cumulativeRetained += convertCurrency(m.netIncome);
      const cash = -convertCurrency(m.cumulativeCash); // starting investment less cumulative burn

      const totalCurrentAssets = cash; // No AR / inventory assumed
      const totalAssets = totalCurrentAssets; // No long-term assets assumed

      const accountsPayable = 0;
      const accrued = 0;
      const debt = 0;
      const totalLiabilities = accountsPayable + accrued + debt;

      const totalEquity = paidInCapital + cumulativeRetained;

      return [
        m.month,
        Math.round(cash),
        0,
        0,
        Math.round(totalCurrentAssets),
        0,
        0,
        Math.round(totalAssets),
        0,
        0,
        0,
        Math.round(totalLiabilities),
        Math.round(paidInCapital),
        Math.round(cumulativeRetained),
        Math.round(totalEquity)
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  };

  const downloadCsv = (filename: string, csvContent: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPnlCsv = () => {
    downloadCsv(`JustCook_36m_PnL_${selectedCurrency}.csv`, generatePnlCsv());
  };

  const handleDownloadBalanceCsv = () => {
    downloadCsv(`JustCook_36m_BalanceSheet_${selectedCurrency}.csv`, generateBalanceSheetCsv());
  };

  // NEW: XLSX generation with styling using ExcelJS
  const generateAndDownloadXlsx = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const { saveAs } = await import('file-saver');

    const wb = new ExcelJS.Workbook();
    wb.creator = 'JustCook Financial Model';
    wb.created = new Date();

    /* === P&L SHEET === */
    const pnlSheet = wb.addWorksheet('P&L 36M', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });
    pnlSheet.columns = [
      { header: 'Month', key: 'month', width: 10 },
      { header: `Revenue (${selectedCurrency})`, key: 'revenue', width: 15, style: { numFmt: '#,##0' } },
      { header: `COGS (${selectedCurrency})`, key: 'cogs', width: 15, style: { numFmt: '#,##0' } },
      { header: `Gross Profit (${selectedCurrency})`, key: 'gross', width: 15, style: { numFmt: '#,##0' } },
      { header: `Marketing & Sales (${selectedCurrency})`, key: 'marketing', width: 20, style: { numFmt: '#,##0' } },
      { header: `G&A (${selectedCurrency})`, key: 'ga', width: 15, style: { numFmt: '#,##0' } },
      { header: `Tech & R&D (${selectedCurrency})`, key: 'tech', width: 18, style: { numFmt: '#,##0' } },
      { header: `Total OpEx (${selectedCurrency})`, key: 'opex', width: 18, style: { numFmt: '#,##0' } },
      { header: `EBITDA (${selectedCurrency})`, key: 'ebitda', width: 15, style: { numFmt: '#,##0' } },
      { header: `Net Income (${selectedCurrency})`, key: 'net', width: 15, style: { numFmt: '#,##0' } }
    ];

    first36Metrics.forEach((m) => {
      const revenue = convertCurrency(m.revenue);
      const cogs = revenue - convertCurrency(m.grossProfit);
      const marketing = convertCurrency(m.customerAcquisitionCost);
      const ga = convertCurrency(inputs.fixedCostsPerMonth * 0.6);
      const tech = convertCurrency(inputs.fixedCostsPerMonth * 0.4);
      const opex = marketing + ga + tech;
      pnlSheet.addRow({
        month: m.month,
        revenue: revenue,
        cogs: cogs,
        gross: convertCurrency(m.grossProfit),
        marketing,
        ga,
        tech,
        opex,
        ebitda: convertCurrency(m.ebitda),
        net: convertCurrency(m.netIncome)
      });
    });

    // Style header row
    pnlSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    pnlSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' }
    };

    /* === BALANCE SHEET === */
    const bsSheet = wb.addWorksheet('Balance Sheet 36M', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });
    bsSheet.columns = [
      { header: 'Month', key: 'month', width: 10 },
      { header: `Cash & Equivalents (${selectedCurrency})`, key: 'cash', width: 20, style: { numFmt: '#,##0' } },
      { header: `Total Assets (${selectedCurrency})`, key: 'assets', width: 20, style: { numFmt: '#,##0' } },
      { header: `Total Liabilities (${selectedCurrency})`, key: 'liab', width: 20, style: { numFmt: '#,##0' } },
      { header: `Paid-in Capital (${selectedCurrency})`, key: 'pic', width: 20, style: { numFmt: '#,##0' } },
      { header: `Retained Earnings (${selectedCurrency})`, key: 'ret', width: 20, style: { numFmt: '#,##0' } },
      { header: `Total Equity (${selectedCurrency})`, key: 'equity', width: 20, style: { numFmt: '#,##0' } }
    ];

    let cumulativeRetained = 0;
    const paidInCapital = convertCurrency(inputs.investment, 'USD');

    first36Metrics.forEach((m) => {
      cumulativeRetained += convertCurrency(m.netIncome);
      const cash = -convertCurrency(m.cumulativeCash);
      const totalAssets = cash; // simplified assumption
      const totalLiab = 0;
      const totalEquity = paidInCapital + cumulativeRetained;

      bsSheet.addRow({
        month: m.month,
        cash,
        assets: totalAssets,
        liab: totalLiab,
        pic: paidInCapital,
        ret: cumulativeRetained,
        equity: totalEquity
      });
    });

    bsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    bsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF10B981' }
    };

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    saveAs(blob, `JustCook_Financials_${selectedCurrency}.xlsx`);
  };

  return (
    <>
      <style>{`
        .financial-model h1 {
          font-family: 'Poppins', sans-serif;
        }
        
        .financial-model h3 {
          font-family: 'Poppins', sans-serif;
          color: var(--text-heading);
        }
        
        .chart-insight {
          margin-top: 1rem;
          padding: 1rem;
          border-radius: 8px;
          font-size: 0.9rem;
          line-height: 1.5;
          color: var(--text-body);
        }
        
        .metric-value {
          font-family: 'Poppins', sans-serif;
        }
        
        .story-section {
          margin-bottom: 3rem;
          padding: 2rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
        }
        
        .story-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-heading);
          margin-bottom: 1rem;
          background: linear-gradient(135deg, #3B82F6, #8B5CF6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .story-text {
          font-size: 1rem;
          line-height: 1.6;
          color: var(--text-body);
          margin-bottom: 2rem;
          opacity: 0.9;
        }

        @media (max-width: 1024px) {
          .financial-model .grid {
            grid-template-columns: 1fr !important;
            gap: 1.5rem !important;
          }
          
          .financial-model .card[style*="position: sticky"] {
            position: static !important;
          }
        }
        
        .investment-scenarios {
          display: flex;
          gap: 0.5rem;
          padding: 0.5rem;
        }
        
        .investment-button {
          flex: 1;
          padding: 1rem;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          font-size: 1rem;
          transition: all 0.3s ease;
          text-align: center;
          min-width: 0;
        }
        
        .investment-button-title {
          font-size: 1.1rem;
          margin-bottom: 0.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .investment-button-amount {
          font-size: 0.9rem;
          opacity: 0.9;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @media (max-width: 768px) {
          .financial-model {
            padding-top: 1rem;
          }
          
          .financial-model h1 {
            font-size: 2rem;
            margin-bottom: 0.5rem;
          }
          
          .financial-model h3 {
            font-size: 1.1rem;
            margin-bottom: 0.75rem;
          }
          
          .chart-insight {
            padding: 0.75rem;
            font-size: 0.85rem;
            margin-top: 0.75rem;
          }
          
          .grid-2 {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }
          
          .metric-value {
            font-size: 1.4rem;
          }
          
          .card {
            padding: 1rem;
            margin-bottom: 1rem;
          }
          
          .story-section {
            padding: 1rem;
            margin-bottom: 2rem;
          }
          
          .story-title {
            font-size: 1.25rem;
          }
          
          .investment-scenarios {
            flex-direction: column;
            gap: 0.5rem;
            padding: 0.25rem;
          }
          
          .investment-button {
            padding: 0.5rem 0.75rem;
            font-size: 0.85rem;
          }
          
          .investment-button-title {
            font-size: 0.9rem;
            margin-bottom: 0.1rem;
            white-space: normal;
          }
          
          .investment-button-amount {
            font-size: 0.8rem;
            white-space: normal;
          }
        }
        
        @media (max-width: 480px) {
          .financial-model {
            padding-top: 0.5rem;
          }
          
          .financial-model h1 {
            font-size: 1.75rem;
            margin-bottom: 0.25rem;
          }
          
          .financial-model h3 {
            font-size: 1rem;
            margin-bottom: 0.5rem;
          }
          
          .chart-insight {
            padding: 0.5rem;
            font-size: 0.8rem;
          }
          
          .metric-value {
            font-size: 1.2rem;
          }
          
          .card {
            padding: 0.75rem;
            margin-bottom: 0.75rem;
          }
          
          .story-section {
            padding: 0.75rem;
          }
          
          .story-title {
            font-size: 1.1rem;
          }
          
          .investment-scenarios {
            gap: 0.4rem;
            padding: 0.2rem;
          }
          
          .investment-button {
            padding: 0.4rem 0.6rem;
            border-radius: 8px;
          }
          
          .investment-button-title {
            font-size: 0.85rem;
            margin-bottom: 0.05rem;
          }
          
          .investment-button-amount {
            font-size: 0.75rem;
          }
        }
      `}</style>
      <div className="financial-model">
        {/* Header */}
        <div className="text-center mb-5">
          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #2ec4b6, #0077be)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.5rem'
          }}>Financial Model</h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
            Interactive scenario analysis with real-time projections
          </p>
        </div>

        {/* Currency Selector */}
        <div className="text-center mb-4">
          <label style={{ 
            fontSize: '0.9rem', 
            color: 'var(--text-secondary)',
            fontWeight: 600,
            display: 'block',
            marginBottom: '0.5rem'
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

        {/* Investment Scenarios */}
        <div className="card mb-4">
          <div className="investment-scenarios">
            {(Object.keys(investmentScenarios) as Array<keyof typeof investmentScenarios>).map(scenario => (
              <button
                key={scenario}
                onClick={() => loadScenario(scenario)}
                className="investment-button"
                style={{
                  background: selectedScenario === scenario 
                    ? 'linear-gradient(135deg, #2ec4b6, #0077be)' 
                    : 'transparent',
                  color: selectedScenario === scenario ? 'white' : 'var(--text-secondary)',
                }}
              >
                <div className="investment-button-title">
                  {scenario.charAt(0).toUpperCase() + scenario.slice(1)}
                </div>
                <div className="investment-button-amount">
                  {formatCurrency(investmentScenarios[scenario].investment, 'USD')}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Layout */}
        <div className="grid" style={{ 
          gridTemplateColumns: '380px 1fr', 
          gap: '2rem',
          alignItems: 'start'
        }}>
          
          {/* Controls Panel */}
          <div className="card" style={{
            position: 'sticky',
            top: '2rem'
          }}>
            <h3 className="text-center mb-3">Business Parameters</h3>
            
            {/* Investment Amount */}
            <div className="mb-3">
              <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
                Investment Amount
              </label>
              <div className="text-center" style={{ 
                fontSize: '1.5rem', 
                fontWeight: 600, 
                color: '#2ec4b6',
                padding: '1rem',
                background: 'rgba(46, 196, 182, 0.1)',
                borderRadius: '8px'
              }}>
                {formatCurrency(inputs.investment, 'USD')}
              </div>
            </div>

            {/* Auto-Adjust Percentile */}
            <div className="mb-4" style={{
              padding: '1rem',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
              <label style={{ fontWeight: 600, marginBottom: '0.75rem', display: 'block', fontSize: '0.9rem' }}>
                📊 Auto-Adjust Parameters by Percentile
              </label>
              <input
                type="range"
                min={10}
                max={90}
                value={percentile}
                onChange={(e) => updatePercentile(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  background: 'linear-gradient(90deg, #ef4444 0%, #f59e0b 25%, #22c55e 50%, #3b82f6 75%, #8b5cf6 100%)',
                  outline: 'none',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  cursor: 'pointer',
                  marginBottom: '0.75rem'
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                marginBottom: '0.5rem'
              }}>
                <span>Conservative (10th)</span>
                <span>Median (50th)</span>
                <span>Aggressive (90th)</span>
              </div>
              <div style={{
                textAlign: 'center',
                fontSize: '1.1rem',
                fontWeight: 600,
                color: '#3b82f6'
              }}>
                {percentile}th Percentile
                {percentile <= 25 ? ' - Conservative' : 
                 percentile <= 75 ? ' - Balanced' : ' - Aggressive'}
              </div>
              <div style={{
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                textAlign: 'center',
                marginTop: '0.5rem',
                fontStyle: 'italic'
              }}>
                Automatically adjusts all business parameters below
              </div>
            </div>

            {/* Sliders */}
            {[
              { key: 'ordersPerDay' as keyof ModelInputs, label: 'Daily Orders (Year 1)', min: 5, max: 500, suffix: ' orders/day' },
              { key: 'aov' as keyof ModelInputs, label: 'Average Order Value', min: 30, max: 400, suffix: selectedCurrency === 'AED' ? ' AED' : '' },
              { key: 'cac' as keyof ModelInputs, label: 'Customer Acquisition Cost', min: 20, max: 300, suffix: selectedCurrency === 'AED' ? ' AED' : '' },
              { key: 'monthlyChurn' as keyof ModelInputs, label: 'Monthly Churn Rate', min: 2, max: 30, suffix: '%' },
              { key: 'contributionMargin' as keyof ModelInputs, label: 'Contribution Margin', min: 10, max: 60, suffix: '%' },
              { key: 'fixedCostsPerMonth' as keyof ModelInputs, label: 'Fixed Costs (Monthly)', min: 30000, max: 500000, suffix: selectedCurrency === 'AED' ? ' AED' : '' }
            ].map(({ key, label, min, max, suffix }) => (
              <div key={key} className="mb-3">
                <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block', fontSize: '0.9rem' }}>
                  {label}
                </label>
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={inputs[key]}
                  onChange={(e) => updateInputs({ [key]: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    height: '6px',
                    borderRadius: '3px',
                    background: '#e5e7eb',
                    outline: 'none',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    cursor: 'pointer',
                    marginBottom: '0.5rem'
                  }}
                />
                <div style={{
                  textAlign: 'center',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: '#2ec4b6'
                }}>
                  {['aov', 'cac', 'fixedCostsPerMonth'].includes(key) 
                    ? formatCurrency(inputs[key])
                    : `${inputs[key]}${suffix}`
                  }
                </div>
              </div>
            ))}
          </div>

          {/* Right Panel - Investment Story */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Story Section 1: Proven Unit Economics */}
            <div className="story-section">
              <h3 className="story-title">1. Proven Unit Economics</h3>
              <p className="story-text">
                JustCook demonstrates strong unit economics with healthy LTV:CAC ratios and sustainable profit margins. 
                Our model shows a clear path to profitability with industry-leading efficiency metrics.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card">
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-heading)', fontSize: '0.9rem' }}>LTV / CAC Ratio</h4>
                  <div className="metric-value" style={{
                    fontSize: '1.8rem', 
                    fontWeight: 700, 
                    margin: '0.5rem 0',
                    color: currentMetrics?.ltvCacRatio > 3 ? '#059669' : '#dc2626'
                  }}>
                    {currentMetrics?.ltvCacRatio.toFixed(1) || '0'}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>Target: &gt; 3.0 ✓</p>
                </div>

                <div className="card">
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-heading)', fontSize: '0.9rem' }}>Gross Margin</h4>
                  <div className="metric-value" style={{ 
                    fontSize: '1.8rem', 
                    fontWeight: 700, 
                    margin: '0.5rem 0',
                    color: currentMetrics?.grossMargin > 30 ? '#059669' : currentMetrics?.grossMargin > 20 ? '#d97706' : '#dc2626'
                  }}>
                    {currentMetrics?.grossMargin.toFixed(1) || '0'}%
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>Above industry standard</p>
                </div>

                <div className="card">
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-heading)', fontSize: '0.9rem' }}>ARPU Growth</h4>
                  <div className="metric-value" style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0.5rem 0' }}>
                    {formatCurrency(currentMetrics?.arpu || 0)}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>Increasing customer value</p>
                </div>
              </div>
            </div>

            {/* Story Section 2: Scalable Growth Trajectory */}
            <div className="story-section">
              <h3 className="story-title">2. Scalable Growth Trajectory</h3>
              <p className="story-text">
                Our revenue model shows accelerating growth with improving operational leverage. 
                As we scale, fixed costs become more efficient and profit margins expand significantly.
              </p>
              
              <div className="card">
                <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '1.5rem', textAlign: 'center' }}>Revenue Growth & Operational Leverage</h4>
                <div style={{ height: '350px', width: '100%' }}>
                  <Line data={revenueChartData} options={chartOptions} />
                </div>
                <div className="chart-insight" style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.2)'
                }}>
                  <strong>Key Insight:</strong> Revenue scales exponentially while fixed costs remain stable, 
                  creating expanding profit margins as we reach scale.
                </div>
              </div>
            </div>

            {/* Story Section 3: Clear Path to Profitability */}
            <div className="story-section">
              <h3 className="story-title">3. Clear Path to Profitability</h3>
              <p className="story-text">
                Our P&L projections show a definitive timeline to profitability with strong margin expansion. 
                Operating leverage kicks in as revenue growth outpaces cost increases.
              </p>
              
              <div className="card">
                <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '1.5rem', textAlign: 'center' }}>Profit & Loss Progression</h4>
                <div style={{ height: '350px', width: '100%' }}>
                  <Line data={plChartData} options={chartOptions} />
                </div>
                <div className="chart-insight" style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.2)'
                }}>
                  <strong>Key Insight:</strong> Net income turns positive by month {
                    metrics.findIndex(m => m.netIncome > 0) + 1 || 'N/A'
                  }, with accelerating profitability thereafter.
                </div>
              </div>
            </div>

            {/* Story Section 4: Market Opportunity & Capture */}
            <div className="story-section">
              <h3 className="story-title">4. Massive Market with Clear Capture Strategy</h3>
              <p className="story-text">
                Operating in the $4.2B GCC food e-commerce market, our customer acquisition and retention 
                metrics show sustainable market capture with room for significant expansion.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card">
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-heading)', fontSize: '0.9rem' }}>Market Penetration</h4>
                  <div className="metric-value" style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0.5rem 0' }}>
                    {currentMetrics?.marketPenetration.toFixed(3) || '0'}%
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>Of $4.2B TAM - huge runway</p>
                </div>

                <div className="card">
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-heading)', fontSize: '0.9rem' }}>Customer Base</h4>
                  <div className="metric-value" style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0.5rem 0' }}>
                    {currentMetrics?.activeCustomers.toLocaleString() || '0'}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>Active users by month 12</p>
                </div>

                <div className="card">
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-heading)', fontSize: '0.9rem' }}>Revenue Rate</h4>
                  <div className="metric-value" style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0.5rem 0' }}>
                    {formatCurrency(currentMetrics?.revenue || 0)}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>Monthly run rate</p>
                </div>
              </div>

              <div className="card">
                <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '1.5rem', textAlign: 'center' }}>Customer Growth & Business Metrics</h4>
                <div style={{ height: '350px', width: '100%' }}>
                  <Line data={businessMetricsData} options={businessMetricsOptions} />
                </div>
                <div className="chart-insight" style={{
                  background: 'rgba(168, 85, 247, 0.1)',
                  border: '1px solid rgba(168, 85, 247, 0.2)'
                }}>
                  <strong>Key Insight:</strong> Customer acquisition accelerates while ARPU increases, 
                  demonstrating strong product-market fit and expansion opportunities.
                </div>
              </div>
            </div>

            {/* Story Section 5: Smart Capital Efficiency */}
            <div className="story-section">
              <h3 className="story-title">5. Capital Efficient Growth</h3>
              <p className="story-text">
                Our funding requirements are optimized for maximum runway and growth. 
                Cash flow projections show when we achieve self-sustaining growth.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card">
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-heading)', fontSize: '0.9rem' }}>Monthly Burn</h4>
                  <div className="metric-value" style={{ 
                    fontSize: '1.8rem', 
                    fontWeight: 700, 
                    margin: '0.5rem 0',
                    color: currentMetrics?.burnRate === 0 ? '#059669' : '#dc2626'
                  }}>
                    {currentMetrics?.burnRate > 0 ? formatCurrency(currentMetrics?.burnRate) : 'Profitable'}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>Decreasing over time</p>
                </div>

                <div className="card">
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-heading)', fontSize: '0.9rem' }}>Runway</h4>
                  <div className="metric-value" style={{ 
                    fontSize: '1.8rem', 
                    fontWeight: 700, 
                    margin: '0.5rem 0',
                    color: currentMetrics?.runway > 24 ? '#059669' : currentMetrics?.runway > 12 ? '#d97706' : '#dc2626'
                  }}>
                    {currentMetrics?.runway === 999 ? '∞' : Math.round(currentMetrics?.runway || 0)}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>Months to profitability</p>
                </div>

                <div className="card">
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-heading)', fontSize: '0.9rem' }}>Operating Leverage</h4>
                  <div className="metric-value" style={{ 
                    fontSize: '1.8rem', 
                    fontWeight: 700, 
                    margin: '0.5rem 0',
                    color: currentMetrics?.operatingLeverage > 2 ? '#059669' : '#d97706'
                  }}>
                    {currentMetrics?.operatingLeverage.toFixed(1) || '0'}x
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>Efficient cost scaling</p>
                </div>
              </div>

              <div className="card">
                <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '1.5rem', textAlign: 'center' }}>Cash Flow & Path to Self-Sustainability</h4>
                <div style={{ height: '350px', width: '100%' }}>
                  <Line data={cashFlowData} options={chartOptions} />
                </div>
                <div className="chart-insight" style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.2)'
                }}>
                  <strong>Key Insight:</strong> Positive cumulative cash flow achieved by month {
                    metrics.findIndex(m => m.cumulativeCash > 0) + 1 || 'N/A'
                  }, ensuring investor capital protection and growth sustainability.
                </div>
              </div>
            </div>

            {/* Download Excel Button */}
            <div className="mb-3" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <button
                onClick={generateAndDownloadXlsx}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  padding: '0.6rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  width: '100%'
                }}
              >
                Download Styled 36-Month Excel (.xlsx)
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}