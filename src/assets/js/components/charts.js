import { fetchAnalyticsData, exportToCSV } from './analytics-data.js';

export default function () {
  return {
    initialized: false,
    data: null,
    isLoading: true,
    chartInstances: {},
    pageviews: null,

    async init() {
      if (!this.initialized) {
        this.initialized = true;
        this.isLoading = true;
        try {
          const result = await fetchAnalyticsData('last24');
          this.data = result;
          this.pageviews = result.pageviews;
          this.data.range = 'last24';
          this.buildCharts();
        } catch (error) {
          console.error('Error initializing charts:', error);
        } finally {
          this.isLoading = false;
        }
      }
    },

    async updateCharts(event) {
      this.isLoading = true;
      try {
        const result = await fetchAnalyticsData(event.detail.range);
        this.data = result;
        this.pageviews = result.pageviews;
        this.data.range = event.detail.range;
        
        // Destroy existing charts
        Object.values(this.chartInstances).forEach(chart => {
          if (chart) {
            chart.destroy();
          }
        });
        this.chartInstances = {};
        this.buildCharts();
      } catch (error) {
        console.error('Error updating charts:', error);
      } finally {
        this.isLoading = false;
      }
    },

    async exportData() {
      console.log('Exporting data...');
      console.log('Current pageviews:', this.pageviews);
      if (this.pageviews) {
        try {
          await exportToCSV(this.pageviews);
        } catch (error) {
          console.error('Error exporting data:', error);
        }
      } else {
        console.error('No pageviews data available for export');
      }
    },

    buildCharts() {
      if (!this.data) return;

      // Views and Visitors Over Time Chart
      this.buildViewsChart();
      this.buildPagesChart();
      this.buildReferrersChart();
      this.buildBrowsersChart();
      this.buildOSChart();
      this.buildDevicesChart();
    },

    buildViewsChart() {
      const formatDate = (date, range) => {
        const d = new Date(date);
        switch (range) {
          case 'last24':
          case 'today':
            return d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
          case 'thisWeek':
          case 'last7':
          case 'thisMonth':
          case 'last30':
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          case 'last90':
            return `Week ${getWeekNumber(d)}`;
          case 'thisYear':
          case 'last6Months':
          case 'last12Months':
            return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          case 'allTime':
            return d.getFullYear().toString();
          default:
            return d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        }
      };

      const aggregateData = (dates, visitors, views, range) => {
        // Sort data by date
        const sortedData = {
          dates: [...dates].map(d => new Date(d)),
          visitors: [...visitors],
          views: [...views]
        };

        // Sort by date
        const indices = sortedData.dates.map((_, i) => i);
        indices.sort((a, b) => sortedData.dates[a] - sortedData.dates[b]);
        
        sortedData.dates = indices.map(i => sortedData.dates[i]);
        sortedData.visitors = indices.map(i => sortedData.visitors[i]);
        sortedData.views = indices.map(i => sortedData.views[i]);

        switch (range) {
          case 'last24':
          case 'today':
          case 'default':
            // Hourly data - no aggregation needed
            return sortedData;

          case 'thisWeek':
          case 'last7':
          case 'thisMonth':
          case 'last30':
            // Aggregate by day
            const dailyData = {};
            const now = new Date();
            const startDate = new Date(now);
            
            if (range === 'thisWeek') {
              // Set to start of current week (Monday)
              const day = startDate.getDay();
              const diff = startDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
              startDate.setDate(diff);
            } else if (range === 'thisMonth') {
              // Set to start of current month
              startDate.setDate(1);
            } else {
              const daysBack = range === 'last7' ? 6 : 29;
              startDate.setDate(startDate.getDate() - daysBack);
            }
            startDate.setHours(0, 0, 0, 0);
            
            // Initialize daily data with zeros
            const daysDiff = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
            for (let i = 0; i <= daysDiff; i++) {
              const dayDate = new Date(startDate);
              dayDate.setDate(startDate.getDate() + i);
              const dayKey = dayDate.toISOString().split('T')[0];
              dailyData[dayKey] = {
                date: dayDate,
                visitors: 0,
                views: 0
              };
            }

            // Filter and fill in actual data
            sortedData.dates.forEach((date, index) => {
              const dateObj = new Date(date);
              if (dateObj >= startDate && dateObj <= now) {
                const dayKey = dateObj.toISOString().split('T')[0];
                if (!dailyData[dayKey]) {
                  dailyData[dayKey] = {
                    date: dateObj,
                    visitors: 0,
                    views: 0
                  };
                }
                dailyData[dayKey].visitors += sortedData.visitors[index];
                dailyData[dayKey].views += sortedData.views[index];
              }
            });

            // Filter out any dates beyond today
            const filteredDailyData = {};
            Object.entries(dailyData).forEach(([key, value]) => {
              if (value.date <= now) {
                filteredDailyData[key] = value;
              }
            });

            const dailyArray = Object.values(filteredDailyData).sort((a, b) => a.date - b.date);
            return {
              dates: dailyArray.map(d => d.date),
              visitors: dailyArray.map(d => d.visitors),
              views: dailyArray.map(d => d.views)
            };

          case 'last90':
            // Aggregate by week
            const weeklyData = {};
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - 89);
            weekStart.setHours(0, 0, 0, 0);

            // Initialize all weeks with zeros
            for (let i = 0; i < 13; i++) {
              const weekDate = new Date(weekStart);
              weekDate.setDate(weekStart.getDate() + (i * 7));
              const weekNumber = getWeekNumber(weekDate);
              weeklyData[`Week ${weekNumber}`] = {
                date: weekDate,
                visitors: 0,
                views: 0
              };
            }

            // Fill in actual data
            sortedData.dates.forEach((date, index) => {
              const weekNumber = getWeekNumber(date);
              const weekKey = `Week ${weekNumber}`;
              if (weeklyData[weekKey]) {
                weeklyData[weekKey].visitors += sortedData.visitors[index];
                weeklyData[weekKey].views += sortedData.views[index];
              }
            });

            const weeklyArray = Object.values(weeklyData).sort((a, b) => a.date - b.date);
            return {
              dates: weeklyArray.map(d => d.date),
              visitors: weeklyArray.map(d => d.visitors),
              views: weeklyArray.map(d => d.views)
            };

          case 'thisYear':
          case 'last6Months':
          case 'last12Months':
            // Aggregate by month
            const monthlyData = {};
            const monthStart = new Date();
            const currentDate = new Date();
            
            if (range === 'thisYear') {
              // Set to start of current year
              monthStart.setFullYear(currentDate.getFullYear(), 0, 1);
              monthStart.setHours(0, 0, 0, 0);
            } else {
              const monthsBack = range === 'last6Months' ? 5 : 11;
              monthStart.setMonth(monthStart.getMonth() - monthsBack);
              monthStart.setDate(1);
              monthStart.setHours(0, 0, 0, 0);
            }

            // Initialize all months with zeros
            const currentMonth = currentDate.getMonth();
            const monthsDiff = range === 'thisYear' ? currentMonth : (range === 'last6Months' ? 5 : 11);
            
            for (let i = 0; i <= monthsDiff; i++) {
              const monthDate = new Date(monthStart);
              monthDate.setMonth(monthStart.getMonth() + i);
              const monthKey = monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
              monthlyData[monthKey] = {
                date: monthDate,
                visitors: 0,
                views: 0
              };
            }

            // Fill in actual data
            sortedData.dates.forEach((date, index) => {
              const dateObj = new Date(date);
              if (dateObj >= monthStart && dateObj <= currentDate) {
                const monthKey = dateObj.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                if (!monthlyData[monthKey]) {
                  return;
                }
                monthlyData[monthKey].visitors += sortedData.visitors[index];
                monthlyData[monthKey].views += sortedData.views[index];
              }
            });

            // Filter out any dates beyond today
            const filteredMonthlyData = {};
            Object.entries(monthlyData).forEach(([key, value]) => {
              if (value.date <= currentDate) {
                filteredMonthlyData[key] = value;
              }
            });

            const monthlyArray = Object.values(filteredMonthlyData).sort((a, b) => a.date - b.date);
            return {
              dates: monthlyArray.map(d => d.date),
              visitors: monthlyArray.map(d => d.visitors),
              views: monthlyArray.map(d => d.views)
            };

          case 'allTime':
            // Aggregate by year
            const yearlyData = {};
            const currentYear = new Date().getFullYear();
            
            // First, find the range of years in the data
            const yearsInData = new Set();
            sortedData.dates.forEach(date => {
              const year = new Date(date).getFullYear();
              yearsInData.add(year);
            });
            
            // Initialize only years that have data
            yearsInData.forEach(year => {
              const yearDate = new Date(year, 0, 1);
              yearlyData[year] = {
                date: yearDate,
                visitors: 0,
                views: 0
              };
            });

            // Fill in actual data
            sortedData.dates.forEach((date, index) => {
              const dateObj = new Date(date);
              const year = dateObj.getFullYear();
              if (yearlyData[year]) {
                yearlyData[year].visitors += sortedData.visitors[index];
                yearlyData[year].views += sortedData.views[index];
              }
            });

            const yearlyArray = Object.values(yearlyData).sort((a, b) => a.date - b.date);
            return {
              dates: yearlyArray.map(d => d.date),
              visitors: yearlyArray.map(d => d.visitors),
              views: yearlyArray.map(d => d.views)
            };

          default:
            return sortedData;
        }
      };

      const aggregatedData = aggregateData(
        this.data.viewsOverTime.dates,
        this.data.viewsOverTime.visitors,
        this.data.viewsOverTime.views,
        this.data.range
      );

      if (aggregatedData.dates.length === 0) {
        return;
      }

      const chart = buildChart('#views-chart', mode => ({
        chart: {
          type: 'bar',
          height: 350,
          stacked: true,
          toolbar: { show: false },
          fontFamily: 'inherit',
          animations: {
            enabled: true,
            easing: 'easeinout',
            speed: 800,
            animateGradually: {
              enabled: true,
              delay: 150
            },
            dynamicAnimation: {
              enabled: true,
              speed: 350
            }
          }
        },
        grid: {
          show: true,
          borderColor: 'color-mix(in oklab, var(--color-base-content) 20%, transparent)',
          strokeDashArray: 4,
          position: 'back',
          xaxis: {
            lines: {
              show: true
            }
          },
          yaxis: {
            lines: {
              show: true
            }
          },
          padding: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
          }
        },
        series: [{
          name: 'Visitors',
          data: aggregatedData.visitors
        }, {
          name: 'Views',
          data: aggregatedData.views
        }],
        xaxis: {
          categories: aggregatedData.dates.map(date => formatDate(date, this.data.range)),
          labels: {
            style: {
              colors: 'color-mix(in oklab, var(--color-base-content) 50%, transparent)'
            },
            rotate: -45,
            rotateAlways: true
          },
          axisBorder: {
            show: true,
            color: 'color-mix(in oklab, var(--color-base-content) 20%, transparent)'
          },
          axisTicks: {
            show: true,
            color: 'color-mix(in oklab, var(--color-base-content) 20%, transparent)'
          }
        },
        yaxis: {
          labels: {
            style: {
              colors: 'color-mix(in oklab, var(--color-base-content) 50%, transparent)'
            }
          },
          axisBorder: {
            show: true,
            color: 'color-mix(in oklab, var(--color-base-content) 20%, transparent)'
          },
          axisTicks: {
            show: true,
            color: 'color-mix(in oklab, var(--color-base-content) 20%, transparent)'
          }
        },
        colors: [
          'var(--color-primary)',
          'color-mix(in oklab, var(--color-secondary) 80%, transparent)'
        ],
        legend: {
          position: 'bottom',
          horizontalAlign: 'center',
          labels: {
            colors: 'color-mix(in oklab, var(--color-base-content) 50%, transparent)',
            useSeriesColors: false
          }
        },
        tooltip: {
          theme: 'dark',
          style: { 
            fontFamily: 'inherit',
            backgroundColor: 'var(--color-base-200)',
            color: 'var(--color-base-content)',
            border: '1px solid var(--color-base-300)'
          },
          y: { formatter: value => value.toLocaleString() }
        }
      }));
      this.chartInstances['views'] = chart;
    },

    buildPagesChart() {
      const chart = buildChart('#pages-chart', mode => ({
        chart: {
          type: 'pie',
          height: 350,
          toolbar: { show: false },
          fontFamily: 'inherit',
          animations: {
            enabled: true,
            easing: 'easeinout',
            speed: 800,
            animateGradually: {
              enabled: true,
              delay: 150
            },
            dynamicAnimation: {
              enabled: true,
              speed: 350
            }
          }
        },
        series: this.data.topPages.map(page => page.views),
        labels: this.data.topPages.map(page => page.page),
        colors: [
          'var(--color-primary)',
          'color-mix(in oklab, var(--color-secondary) 80%, transparent)',
          'color-mix(in oklab, var(--color-primary) 60%, transparent)',
          'color-mix(in oklab, var(--color-secondary) 40%, transparent)',
          'color-mix(in oklab, var(--color-primary) 20%, transparent)'
        ],
        stroke: {
          width: 1,
          colors: ['color-mix(in oklab, var(--color-base-content) 20%, transparent)']
        },
        legend: {
          position: 'bottom',
          horizontalAlign: 'center',
          labels: {
            colors: 'color-mix(in oklab, var(--color-base-content) 50%, transparent)',
            useSeriesColors: false
          }
        },
        tooltip: {
          theme: 'light',
          style: { fontFamily: 'inherit' },
          y: { formatter: value => value.toLocaleString() + ' visits' }
        }
      }));
      this.chartInstances['pages'] = chart;
    },

    buildReferrersChart() {
      // Debug logging with full content and detailed mapping
      const categories = JSON.parse(JSON.stringify(this.data.referrerCategories));
      
      // Ensure we have valid data
      if (!this.data.referrerCategories || !Array.isArray(this.data.referrerCategories)) {
        console.error('Invalid referrerCategories data:', this.data.referrerCategories);
        return;
      }

      const chart = buildChart('#referrers-chart', mode => ({
        chart: {
          type: 'pie',
          height: 350,
          toolbar: { show: false },
          fontFamily: 'inherit',
          animations: {
            enabled: true,
            easing: 'easeinout',
            speed: 800,
            animateGradually: {
              enabled: true,
              delay: 150
            },
            dynamicAnimation: {
              enabled: true,
              speed: 350
            }
          }
        },
        series: this.data.referrerCategories.map(category => category.count || category.percentage || 0),
        labels: this.data.referrerCategories.map(category => {
          const source = category.source || category.category || category.name || category.type;
          return this.mapSourceToLabel(source);
        }),
        colors: [
          'var(--color-primary)',
          'color-mix(in oklab, var(--color-secondary) 80%, transparent)',
          'color-mix(in oklab, var(--color-primary) 60%, transparent)',
          'color-mix(in oklab, var(--color-secondary) 40%, transparent)',
          'color-mix(in oklab, var(--color-primary) 20%, transparent)'
        ],
        stroke: {
          width: 1,
          colors: ['color-mix(in oklab, var(--color-base-content) 20%, transparent)']
        },
        legend: {
          position: 'bottom',
          horizontalAlign: 'center',
          labels: {
            colors: 'color-mix(in oklab, var(--color-base-content) 50%, transparent)',
            useSeriesColors: false
          }
        },
        tooltip: {
          theme: 'light',
          style: { fontFamily: 'inherit' },
          y: { formatter: value => value + ' visits' }
        }
      }));
      this.chartInstances['referrers'] = chart;
    },

    mapSourceToLabel(source) {
      const sourceMap = {
        // Direct traffic
        'direct': 'Direct Traffic',
        'direct_traffic': 'Direct Traffic',
        'none': 'Direct Traffic',
        '': 'Direct Traffic',
        
        // Organic search
        'organic': 'Organic Search',
        'search_organic': 'Organic Search',
        'search': 'Organic Search',
        'google': 'Organic Search',
        'bing': 'Organic Search',
        
        // Social media
        'social': 'Social Media',
        'social_media': 'Social Media',
        'social_network': 'Social Media',
        'facebook': 'Social Media',
        'twitter': 'Social Media',
        'instagram': 'Social Media',
        'linkedin': 'Social Media',
        
        // Internal navigation
        'internal': 'Internal Navigation',
        
        // Technical
        'technical': 'Technical Sites',
        
        // Content
        'content': 'Content Sites',
        
        // Product
        'product': 'Product Sites',
        
        // Other
        'other': 'Other',
        'unknown': 'Other'
      };
      
      return sourceMap[source] || source || 'Other';
    },

    buildBrowsersChart() {
      const chart = buildChart('#browsers-chart', mode => ({
        chart: {
          type: 'pie',
          height: 350,
          toolbar: { show: false },
          fontFamily: 'inherit',
          animations: {
            enabled: true,
            easing: 'easeinout',
            speed: 800,
            animateGradually: {
              enabled: true,
              delay: 150
            },
            dynamicAnimation: {
              enabled: true,
              speed: 350
            }
          }
        },
        series: this.data.browsers.map(browser => browser.percentage),
        labels: this.data.browsers.map(browser => browser.source),
        colors: [
          'var(--color-primary)',
          'color-mix(in oklab, var(--color-secondary) 80%, transparent)',
          'color-mix(in oklab, var(--color-primary) 60%, transparent)',
          'color-mix(in oklab, var(--color-secondary) 40%, transparent)'
        ],
        stroke: {
          width: 1,
          colors: ['color-mix(in oklab, var(--color-base-content) 20%, transparent)']
        },
        legend: {
          position: 'bottom',
          horizontalAlign: 'center',
          labels: {
            colors: 'color-mix(in oklab, var(--color-base-content) 50%, transparent)',
            useSeriesColors: false
          }
        },
        tooltip: {
          theme: 'light',
          style: { fontFamily: 'inherit' },
          y: { formatter: value => {
            const totalVisits = this.data.stats.visits;
            const visits = Math.round((value / 100) * totalVisits);
            return visits.toLocaleString() + ' visits';
          }}
        }
      }));
      this.chartInstances['browsers'] = chart;
    },

    buildOSChart() {
      const chart = buildChart('#os-chart', mode => ({
        chart: {
          type: 'pie',
          height: 350,
          toolbar: { show: false },
          fontFamily: 'inherit',
          animations: {
            enabled: true,
            easing: 'easeinout',
            speed: 800,
            animateGradually: {
              enabled: true,
              delay: 150
            },
            dynamicAnimation: {
              enabled: true,
              speed: 350
            }
          }
        },
        series: this.data.operatingSystems.map(os => os.percentage),
        labels: this.data.operatingSystems.map(os => os.source),
        colors: [
          'var(--color-primary)',
          'color-mix(in oklab, var(--color-secondary) 80%, transparent)',
          'color-mix(in oklab, var(--color-primary) 60%, transparent)'
        ],
        stroke: {
          width: 1,
          colors: ['color-mix(in oklab, var(--color-base-content) 20%, transparent)']
        },
        legend: {
          position: 'bottom',
          horizontalAlign: 'center',
          labels: {
            colors: 'color-mix(in oklab, var(--color-base-content) 50%, transparent)',
            useSeriesColors: false
          }
        },
        tooltip: {
          theme: 'light',
          style: { fontFamily: 'inherit' },
          y: { formatter: value => {
            const totalVisits = this.data.stats.visits;
            const visits = Math.round((value / 100) * totalVisits);
            return visits.toLocaleString() + ' visits';
          }}
        }
      }));
      this.chartInstances['os'] = chart;
    },

    buildDevicesChart() {
      const chart = buildChart('#devices-chart', mode => ({
        chart: {
          type: 'pie',
          height: 350,
          toolbar: { show: false },
          fontFamily: 'inherit',
          animations: {
            enabled: true,
            easing: 'easeinout',
            speed: 800,
            animateGradually: {
              enabled: true,
              delay: 150
            },
            dynamicAnimation: {
              enabled: true,
              speed: 350
            }
          }
        },
        series: this.data.devices.map(device => device.percentage),
        labels: this.data.devices.map(device => device.source),
        colors: [
          'var(--color-primary)',
          'color-mix(in oklab, var(--color-secondary) 80%, transparent)',
          'color-mix(in oklab, var(--color-primary) 60%, transparent)'
        ],
        stroke: {
          width: 1,
          colors: ['color-mix(in oklab, var(--color-base-content) 20%, transparent)']
        },
        legend: {
          position: 'bottom',
          horizontalAlign: 'center',
          labels: {
            colors: 'color-mix(in oklab, var(--color-base-content) 50%, transparent)',
            useSeriesColors: false
          }
        },
        tooltip: {
          theme: 'light',
          style: { fontFamily: 'inherit' },
          y: { formatter: value => {
            const totalVisits = this.data.stats.visits;
            const visits = Math.round((value / 100) * totalVisits);
            return visits.toLocaleString() + ' visits';
          }}
        }
      }));
      this.chartInstances['devices'] = chart;
    }
  }
}

const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}; 