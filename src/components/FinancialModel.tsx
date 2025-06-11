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
}

function calculateMetrics(inputs: ModelInputs): MonthlyMetrics[] {
  const results: MonthlyMetrics[] = [];
  let activeCustomers = 0;
  let cumulativeCash = -inputs.investment; // Initial investment from scenario

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
    
    cumulativeCash += ebitda;
    
    // LTV calculation (simplified)
    const avgCustomerLifespan = 1 / (inputs.monthlyChurn / 100); // months
    const ltv = (inputs.aov * (inputs.contributionMargin / 100) * avgCustomerLifespan);
    const ltvCacRatio = ltv / inputs.cac;

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
      ltvCacRatio
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
    '@media (max-width: 1024px)': {
      position: 'static',
      top: 'auto'
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
  responsiveLayout: {
    '@media (max-width: 1024px)': {
      gridTemplateColumns: '1fr',
      gap: '1.5rem'
    }
  }
};

export default function FinancialModel() {
  const [inputs, setInputs] = useState<ModelInputs>(investmentScenarios.balanced);
  const [debouncedInputs, setDebouncedInputs] = useState<ModelInputs>(investmentScenarios.balanced);
  const [activeScenario, setActiveScenario] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');

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

  const currentMetrics = metrics[11] || metrics[metrics.length - 1];

  // Calculate dynamic axis ranges with padding
  const revenueAxisRange = useMemo(() => {
    const filteredMetrics = metrics.filter((_, i) => i % 6 === 0);
    const revenues = filteredMetrics.map(m => m.revenue);
    const ebitdas = filteredMetrics.map(m => m.ebitda);
    const allValues = [...revenues, ...ebitdas];
    
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = Math.abs(max - min) * 0.1; // 10% padding
    
    return {
      min: Math.floor((min - padding) / 100000) * 100000, // Round to nearest 100K
      max: Math.ceil((max + padding) / 100000) * 100000
    };
  }, [metrics]);

  const cashFlowAxisRange = useMemo(() => {
    const cashFlows = metrics.filter((_, i) => i % 6 === 0).map(m => m.cumulativeCash);
    const min = Math.min(...cashFlows);
    const max = Math.max(...cashFlows);
    const padding = Math.abs(max - min) * 0.1; // 10% padding
    
    return {
      min: Math.floor((min - padding) / 100000) * 100000, // Round to nearest 100K
      max: Math.ceil((max + padding) / 100000) * 100000
    };
  }, [metrics]);

  // Stable chart data with fixed labels and smooth animations
  const chartLabels = ['Month 1', 'Month 6', 'Month 12', 'Month 18', 'Month 24', 'Month 30', 'Month 36', 'Month 42', 'Month 48', 'Month 54', 'Month 60'];
  
  const revenueChartData = useMemo(() => {
    const filteredMetrics = metrics.filter((_, i) => i % 6 === 0);
    return {
      labels: chartLabels,
      datasets: [
        {
          label: 'Monthly Revenue (AED)',
          data: filteredMetrics.map(m => m.revenue),
          borderColor: 'rgb(46, 196, 182)',
          backgroundColor: 'rgba(46, 196, 182, 0.1)',
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
        },
        {
          label: 'EBITDA (AED)',
          data: filteredMetrics.map(m => m.ebitda),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
        }
      ]
    };
  }, [metrics]);

  const cashFlowData = useMemo(() => ({
    labels: chartLabels,
    datasets: [
      {
        label: 'Cumulative Cash Flow (AED)',
        data: metrics.filter((_, i) => i % 6 === 0).map(m => m.cumulativeCash),
        borderColor: currentMetrics.ltvCacRatio > 3 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
        backgroundColor: currentMetrics.ltvCacRatio > 3 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
      }
    ]
  }), [metrics, currentMetrics.ltvCacRatio]);

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
            return 'AED ' + Math.round(Number(value)).toLocaleString();
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
  }), [revenueAxisRange]);

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
            return 'AED ' + Math.round(Number(value)).toLocaleString();
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
  }), [cashFlowAxisRange]);

  return (
    <>
      <style>{`
        @media (max-width: 1024px) {
          .financial-main-layout {
            grid-template-columns: 1fr !important;
            gap: 1.5rem !important;
          }
          .financial-left-panel {
            position: static !important;
            top: auto !important;
          }
        }
        @media (max-width: 640px) {
          .financial-scenario-tabs {
            flex-direction: column !important;
            padding: 8px !important;
          }
          .financial-metrics-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Financial Model</h1>
        <p style={styles.subtitle}>Interactive scenario analysis with real-time projections</p>
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
              min="40"
              max="200"
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
              min="50"
              max="200"
              value={inputs.aov}
              onChange={e => handleInputChange('aov', Number(e.target.value))}
              style={styles.slider}
            />
            <div style={styles.sliderValue}>AED {inputs.aov}</div>
          </div>

          <div style={styles.controlGroup}>
            <label style={styles.controlLabel}>Customer Acquisition Cost</label>
            <input
              type="range"
              min="40"
              max="120"
              value={inputs.cac}
              onChange={e => handleInputChange('cac', Number(e.target.value))}
              style={styles.slider}
            />
            <div style={styles.sliderValue}>AED {inputs.cac}</div>
          </div>

          <div style={styles.controlGroup}>
            <label style={styles.controlLabel}>Monthly Churn Rate</label>
            <input
              type="range"
              min="5"
              max="20"
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
              min="25"
              max="50"
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
              min="60000"
              max="200000"
              step="5000"
              value={inputs.fixedCostsPerMonth}
              onChange={e => handleInputChange('fixedCostsPerMonth', Number(e.target.value))}
              style={styles.slider}
            />
            <div style={styles.sliderValue}>AED {inputs.fixedCostsPerMonth.toLocaleString()}</div>
          </div>
        </div>

        {/* Right Panel - Visualizations */}
        <div style={styles.rightPanel}>
          {/* Key Metrics */}
          <div className="financial-metrics-grid" style={styles.metricsGrid}>
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
              <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>Target: &gt; 3.0</p>
            </div>

            <div style={styles.metricCard}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-heading)', fontSize: '0.9rem' }}>Monthly Revenue (Year 1)</h4>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0.5rem 0' }}>
                AED {Math.round(currentMetrics.revenue).toLocaleString()}
              </div>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>Month 12 projection</p>
            </div>

            <div style={styles.metricCard}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-heading)', fontSize: '0.9rem' }}>Payback Period</h4>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0.5rem 0' }}>
                {Math.round(inputs.cac / (inputs.aov * inputs.contributionMargin / 100))} months
              </div>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>Time to recover CAC</p>
            </div>

            <div style={styles.metricCard}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-heading)', fontSize: '0.9rem' }}>Year 5 Cash Position</h4>
              <div style={{ 
                fontSize: '1.8rem', 
                fontWeight: 700, 
                margin: '0.5rem 0',
                color: (metrics[59]?.cumulativeCash || 0) > 0 ? '#059669' : '#dc2626'
              }}>
                AED {Math.round(metrics[59]?.cumulativeCash || 0).toLocaleString()}
              </div>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>Cumulative cash flow</p>
            </div>
          </div>

          {/* Charts */}
          <div style={styles.chartsContainer}>
            <div style={styles.chartCard}>
              <h4 style={styles.chartTitle}>Revenue & EBITDA Projection</h4>
              <div style={{ height: '350px', width: '100%' }}>
                <Line data={revenueChartData} options={chartOptions} />
              </div>
            </div>

            <div style={styles.chartCard}>
              <h4 style={styles.chartTitle}>Cumulative Cash Flow</h4>
              <div style={{ height: '350px', width: '100%' }}>
                <Line data={cashFlowData} options={cashFlowOptions} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
} 