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
          console.log('Initial data loaded:', this.data);
          console.log('Pageviews:', this.pageviews);
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
        console.log('Updating charts with range:', event.detail.range);
        const result = await fetchAnalyticsData(event.detail.range);
        this.data = result;
        this.pageviews = result.pageviews;
        this.data.range = event.detail.range;
        console.log('Updated data:', this.data);
        console.log('Updated pageviews:', this.pageviews);
        
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
      console.log('Building views chart with data:', this.data);
      
      const formatDate = (date, range) => {
        const d = new Date(date);
        switch (range) {
          case 'last24':
          case 'today':
            return d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
          case 'thisWeek':
          case 'last7':
            return d.toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', hour12: true });
          case 'thisMonth':
          case 'last30':
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          case 'last90':
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          case 'thisYear':
          case 'last6Months':
          case 'last12Months':
            return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          default:
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

        const maxBars = 24; // Maximum number of bars to show

        switch (range) {
          case 'last24':
          case 'today':
            // Hourly data - no aggregation needed
            return sortedData;

          case 'thisWeek':
          case 'last7':
            // Daily data - aggregate by day
            const dailyData = {};
            const dayStart = new Date();
            dayStart.setDate(dayStart.getDate() - 7);
            dayStart.setHours(0, 0, 0, 0);

            // Initialize all days with zeros
            for (let i = 0; i < 7; i++) {
              const dayDate = new Date(dayStart);
              dayDate.setDate(dayStart.getDate() + i);
              const dayKey = dayDate.toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' });
              dailyData[dayKey] = {
                date: dayDate,
                visitors: 0,
                views: 0
              };
            }

            // Fill in actual data
            sortedData.dates.forEach((date, index) => {
              const dayKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' });
              if (dailyData[dayKey]) {
                dailyData[dayKey].visitors += sortedData.visitors[index];
                dailyData[dayKey].views += sortedData.views[index];
              }
            });

            const dailyArray = Object.values(dailyData).sort((a, b) => a.date - b.date);
            return {
              dates: dailyArray.map(d => d.date),
              visitors: dailyArray.map(d => d.visitors),
              views: dailyArray.map(d => d.views)
            };

          case 'last90':
            // Weekly data - aggregate by week
            const weeklyData = {};
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - 90);
            weekStart.setHours(0, 0, 0, 0);

            // Initialize all weeks with zeros
            for (let i = 0; i < 13; i++) {
              const weekDate = new Date(weekStart);
              weekDate.setDate(weekStart.getDate() + (i * 7));
              const weekKey = weekDate.toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' });
              weeklyData[weekKey] = {
                date: weekDate,
                visitors: 0,
                views: 0
              };
            }

            // Fill in actual data
            sortedData.dates.forEach((date, index) => {
              const weekStart = new Date(date);
              weekStart.setDate(date.getDate() - date.getDay());
              weekStart.setHours(0, 0, 0, 0);
              const weekKey = weekStart.toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' });
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
            // Monthly data - aggregate by month
            const monthlyData = {};
            const monthStart = new Date();
            monthStart.setMonth(monthStart.getMonth() - maxBars + 1);
            monthStart.setDate(1);
            monthStart.setHours(0, 0, 0, 0);

            // Initialize all months with zeros
            for (let i = 0; i < maxBars; i++) {
              const monthDate = new Date(monthStart);
              monthDate.setMonth(monthStart.getMonth() + i);
              const monthKey = monthDate.toLocaleDateString('en-US', { year: 'numeric', month: 'numeric' });
              monthlyData[monthKey] = {
                date: monthDate,
                visitors: 0,
                views: 0
              };
            }

            // Fill in actual data
            sortedData.dates.forEach((date, index) => {
              const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'numeric' });
              if (monthlyData[monthKey]) {
                monthlyData[monthKey].visitors += sortedData.visitors[index];
                monthlyData[monthKey].views += sortedData.views[index];
              }
            });

            const monthlyArray = Object.values(monthlyData).sort((a, b) => a.date - b.date);
            return {
              dates: monthlyArray.map(d => d.date),
              visitors: monthlyArray.map(d => d.visitors),
              views: monthlyArray.map(d => d.views)
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

      console.log('Final aggregated data:', aggregatedData);

      if (aggregatedData.dates.length === 0) {
        console.error('No data available after aggregation');
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
          theme: 'light',
          style: { fontFamily: 'inherit' },
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
          y: { formatter: value => value.toLocaleString() }
        }
      }));
      this.chartInstances['pages'] = chart;
    },

    buildReferrersChart() {
      // Debug logging with full content and detailed mapping
      const categories = JSON.parse(JSON.stringify(this.data.referrerCategories));
      console.log('Raw Referrer Categories:', categories);
      console.log('Mapped Categories:', categories.map(cat => ({
        original: cat.source || cat.category || cat.name || cat.type,
        mapped: this.mapSourceToLabel(cat.source || cat.category || cat.name || cat.type)
      })));
      
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
          y: { formatter: value => value + '%' }
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
          y: { formatter: value => value + '%' }
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
          y: { formatter: value => value + '%' }
        }
      }));
      this.chartInstances['devices'] = chart;
    }
  }
} 