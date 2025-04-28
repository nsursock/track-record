import { fetchAnalyticsData } from './analytics-data-generator.js';

// Function to format duration as "Xm Ys"
const formatDuration = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

// Function to convert counts to percentages
const toPercentage = (map) => {
  const total = Array.from(map.values()).reduce((sum, count) => sum + count, 0);
  return Array.from(map.entries()).map(([key, count]) => ({
    source: key,
    percentage: Math.round((count / total) * 100)
  }));
};

// Function to filter pageviews by date range
const filterPageviewsByRange = (pageviews, range) => {
  const now = new Date();
  const startDate = new Date();
  
  switch (range) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'last24':
      startDate.setDate(startDate.getDate() - 1);
      break;
    case 'thisWeek':
      // Set to start of current week (Monday)
      const day = startDate.getDay();
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
      startDate.setDate(diff);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'last7':
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'thisMonth':
    case 'last30':
      startDate.setDate(startDate.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'last90':
      startDate.setDate(startDate.getDate() - 89);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'thisYear':
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'last6Months':
      startDate.setMonth(startDate.getMonth() - 5);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'last12Months':
      startDate.setMonth(startDate.getMonth() - 11);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'allTime':
      startDate.setFullYear(2020, 0, 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    default:
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
  }
  
  return pageviews.filter(pageview => {
    const pageviewDate = new Date(pageview.timestamp);
    return pageviewDate >= startDate && pageviewDate <= now;
  });
};

// Cache for generated data
let cachedData = null;
let lastGeneratedRange = null;

// Function to compute statistics from pageviews
const computeStats = (pageviews, range, allPageviews) => {
  // Initialize all stats maps at the beginning
  const pageStats = new Map();
  const referrerStats = new Map();
  const browserStats = new Map();
  const osStats = new Map();
  const deviceStats = new Map();
  const referrerCategoryStats = new Map();
  const referrerSubcategoryStats = new Map();

  // Group pageviews by visitor (using visitorId)
  const visitors = new Map();
  pageviews.forEach(pageview => {
    const visitorKey = pageview.visitorId;
    if (!visitors.has(visitorKey)) {
      visitors.set(visitorKey, []);
    }
    visitors.get(visitorKey).push(pageview);
  });

  // Compute bounce rate
  const bounces = Array.from(visitors.values()).filter(visitorPages => 
    visitorPages.length === 1 && visitorPages[0].isBounce
  ).length;
  const bounceRate = visitors.size > 0 ? (bounces / visitors.size) * 100 : 0;

  // Compute average visit duration
  const totalDuration = pageviews.reduce((sum, pv) => sum + pv.duration, 0);
  const avgDuration = pageviews.length > 0 ? Math.floor(totalDuration / pageviews.length) : 0;

  // Calculate previous period metrics for comparison
  let viewsChange = 0;
  let visitorsChange = 0;
  let bounceRateChange = 0;
  let visitDurationChange = 0;

  // Skip comparison for 'allTime' and when we don't have enough data
  if (range !== 'allTime' && allPageviews && allPageviews.length > 0) {
    const now = new Date();
    const previousStartDate = new Date();
    
    // Set the previous period start date based on the current range
    switch (range) {
      case 'today':
        previousStartDate.setDate(previousStartDate.getDate() - 1);
        previousStartDate.setHours(0, 0, 0, 0);
        break;
      case 'last24':
        previousStartDate.setDate(previousStartDate.getDate() - 2);
        break;
      case 'thisWeek':
        previousStartDate.setDate(previousStartDate.getDate() - 7);
        previousStartDate.setHours(0, 0, 0, 0);
        break;
      case 'last7':
        previousStartDate.setDate(previousStartDate.getDate() - 7);
        previousStartDate.setHours(0, 0, 0, 0);
        break;
      case 'thisMonth':
      case 'last30':
        previousStartDate.setDate(previousStartDate.getDate() - 30);
        previousStartDate.setHours(0, 0, 0, 0);
        break;
      case 'last90':
        previousStartDate.setDate(previousStartDate.getDate() - 90);
        previousStartDate.setHours(0, 0, 0, 0);
        break;
      case 'thisYear':
        previousStartDate.setFullYear(now.getFullYear() - 1, 0, 1);
        previousStartDate.setHours(0, 0, 0, 0);
        break;
      default:
        previousStartDate.setDate(previousStartDate.getDate() - 7);
        previousStartDate.setHours(0, 0, 0, 0);
    }

    // Filter pageviews for previous period from the full dataset
    const previousPageviews = allPageviews.filter(pv => {
      const pvDate = new Date(pv.timestamp);
      return pvDate >= previousStartDate && pvDate < now;
    });

    if (previousPageviews.length > 0) {
      // Compute previous period metrics
      const previousVisitors = new Set(previousPageviews.map(pv => pv.visitorId)).size;
      const previousViews = previousPageviews.length;
      const previousBounces = previousPageviews.filter(pv => pv.isBounce).length;
      const previousBounceRate = previousVisitors > 0 ? (previousBounces / previousVisitors) * 100 : 0;
      const previousTotalDuration = previousPageviews.reduce((sum, pv) => sum + pv.duration, 0);
      const previousAvgDuration = previousPageviews.length > 0 ? Math.floor(previousTotalDuration / previousPageviews.length) : 0;

      // Calculate percentage changes
      const calculateChange = (current, previous) => {
        if (previous === 0) return 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      viewsChange = calculateChange(pageviews.length, previousViews);
      visitorsChange = calculateChange(visitors.size, previousVisitors);
      bounceRateChange = calculateChange(bounceRate, previousBounceRate);
      visitDurationChange = calculateChange(avgDuration, previousAvgDuration);
    }
  }

  // Group pageviews by page
  pageviews.forEach(pageview => {
    const page = pageview.currentPage || '/';
    if (!pageStats.has(page)) {
      pageStats.set(page, 0);
    }
    pageStats.set(page, pageStats.get(page) + 1);
  });

  // Group pageviews by referrer
  pageviews.forEach(pageview => {
    let source = 'direct';
    if (pageview.referrer) {
      if (typeof pageview.referrer === 'string') {
        source = pageview.referrer;
      } else if (pageview.referrer.source) {
        source = pageview.referrer.source;
      }
    }
    
    // Clean up the source
    if (source.startsWith('https://')) {
      source = source.split('/')[2];
    }
    
    if (!referrerStats.has(source)) {
      referrerStats.set(source, 0);
    }
    referrerStats.set(source, referrerStats.get(source) + 1);
  });

  // Group pageviews by browser
  pageviews.forEach(pageview => {
    const browser = pageview.browser.name;
    if (!browserStats.has(browser)) {
      browserStats.set(browser, 0);
    }
    browserStats.set(browser, browserStats.get(browser) + 1);
  });

  // Group pageviews by OS
  pageviews.forEach(pageview => {
    const os = pageview.os.name;
    if (!osStats.has(os)) {
      osStats.set(os, 0);
    }
    osStats.set(os, osStats.get(os) + 1);
  });

  // Group pageviews by device
  pageviews.forEach(pageview => {
    const device = pageview.device.type;
    if (!deviceStats.has(device)) {
      deviceStats.set(device, 0);
    }
    deviceStats.set(device, deviceStats.get(device) + 1);
  });

  // Group pageviews by referrer category
  pageviews.forEach(pageview => {
    const category = pageview.referrer?.category || 'direct';
    if (!referrerCategoryStats.has(category)) {
      referrerCategoryStats.set(category, 0);
    }
    referrerCategoryStats.set(category, referrerCategoryStats.get(category) + 1);
  });

  // Group pageviews by referrer subcategory
  pageviews.forEach(pageview => {
    const subcategory = pageview.referrer?.subcategory || 'direct';
    if (!referrerSubcategoryStats.has(subcategory)) {
      referrerSubcategoryStats.set(subcategory, 0);
    }
    referrerSubcategoryStats.set(subcategory, referrerSubcategoryStats.get(subcategory) + 1);
  });

  // Group pageviews by hour for time series
  const timeSeriesStats = new Map();
  
  // Initialize all hours in the range
  const now = new Date();
  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);
  
  // Create entries for all hours in the range
  for (let d = new Date(startDate); d <= now; d.setHours(d.getHours() + 1)) {
    const hourKey = d.toISOString();
    timeSeriesStats.set(hourKey, { 
      views: 0, 
      visitors: new Set(),
      timestamp: new Date(d)
    });
  }

  // Process pageviews
  pageviews.forEach(pageview => {
    const timestamp = new Date(pageview.timestamp);
    const hourKey = new Date(timestamp);
    hourKey.setMinutes(0, 0, 0);
    const hourKeyStr = hourKey.toISOString();
    
    if (!timeSeriesStats.has(hourKeyStr)) {
      timeSeriesStats.set(hourKeyStr, { 
        views: 0, 
        visitors: new Set(),
        timestamp: new Date(hourKey)
      });
    }
    
    const stats = timeSeriesStats.get(hourKeyStr);
    stats.views++;
    stats.visitors.add(pageview.visitorId);
  });

  // Sort dates and prepare time series data
  const sortedHours = Array.from(timeSeriesStats.entries())
    .sort((a, b) => a[1].timestamp - b[1].timestamp);

  // Convert maps to sorted arrays
  const topReferrers = Array.from(referrerStats.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([source, count]) => ({
      source: source || 'direct',
      count: count || 0
    }))
    .filter(item => item.source && item.count > 0);

  const referrerCategories = Array.from(referrerCategoryStats.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({
      category: category || 'direct',
      count: count || 0
    }))
    .filter(item => item.category && item.count > 0);

  const referrerSubcategories = Array.from(referrerSubcategoryStats.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([subcategory, count]) => ({
      subcategory: subcategory || 'direct',
      count: count || 0
    }))
    .filter(item => item.subcategory && item.count > 0);

  return {
    stats: {
      views: pageviews.length,
      visits: visitors.size,
      visitors: visitors.size,
      bounceRate: Math.round(bounceRate),
      visitDuration: formatDuration(avgDuration),
      viewsChange,
      visitsChange: visitorsChange,
      visitorsChange,
      bounceRateChange,
      visitDurationChange
    },
    viewsOverTime: {
      dates: sortedHours.map(([_, stats]) => stats.timestamp.toISOString()),
      visitors: sortedHours.map(([_, stats]) => stats.visitors.size),
      views: sortedHours.map(([_, stats]) => stats.views)
    },
    topPages: Array.from(pageStats.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([page, views]) => ({
        page: page === '/' ? 'Home' : page.slice(1).charAt(0).toUpperCase() + page.slice(2),
        views: views || 0
      }))
      .filter(item => item.views > 0),
    topReferrers,
    referrerCategories,
    referrerSubcategories,
    browsers: toPercentage(browserStats),
    operatingSystems: toPercentage(osStats),
    devices: toPercentage(deviceStats)
  };
};

// Export the main function
export const getAnalyticsData = async (range = 'last7') => {
  // Generate new data only if we don't have cached data
  if (!cachedData) {
    // Simulate API delay only on initial load
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Get data from the generator
    cachedData = await fetchAnalyticsData('allTime');
  }
  
  // Filter the cached data based on the selected range
  const filteredPageviews = filterPageviewsByRange(cachedData.pageviews, range);
  
  // Compute statistics from filtered pageviews, passing the full dataset for comparison
  const stats = computeStats(filteredPageviews, range, cachedData.pageviews);
  
  // Return both the statistics and the filtered pageviews
  return {
    ...stats,
    pageviews: filteredPageviews
  };
};

// Function to export analytics data to CSV
export const exportToCSV = async (pageviews) => {
  // Convert pageviews to CSV rows
  const rows = pageviews.map(pageview => {
    const timestamp = pageview.timestamp?.toISOString() || '';
    const page = pageview.currentPage || '';
    const referrer = pageview.referrer?.source || '';
    // For internal referrers, the source is the full URL
    // For external referrers, we need to construct a URL based on the source
    const referrerUrl = pageview.referrer?.category === 'internal' 
      ? pageview.referrer?.source 
      : `https://${pageview.referrer?.source?.toLowerCase()}.com` || '';
    const browser = pageview.browser ? `${pageview.browser.name || ''} ${pageview.browser.version || ''}`.trim() : '';
    const os = pageview.os ? `${pageview.os.name || ''} ${pageview.os.version || ''}`.trim() : '';
    const device = pageview.device ? `${pageview.device.type || ''} (${pageview.device.width || ''}x${pageview.device.height || ''})`.trim() : '';
    const duration = pageview.duration || '';
    const isBounce = pageview.isBounce ? 'Yes' : 'No';

    return [timestamp, page, referrer, referrerUrl, browser, os, device, duration, isBounce];
  });

  // Add header row
  const headers = ['Timestamp', 'Page', 'Referrer Source', 'Referrer URL', 'Browser', 'Operating System', 'Device', 'Duration (seconds)', 'Bounce'];
  rows.unshift(headers);

  // Convert to CSV string
  const csvContent = rows.map(row => row.map(cell => {
    // Handle null/undefined values
    if (cell === null || cell === undefined) {
      return '';
    }
    // Escape double quotes and wrap in quotes if cell contains comma, newline, or double quote
    const escaped = cell.toString().replace(/"/g, '""');
    return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
  }).join(',')).join('\n');

  // Create a Blob with the CSV content
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  try {
    // Use the File System Access API to save the file
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: `analytics-export-${new Date().toISOString().split('T')[0]}.csv`,
      types: [{
        description: 'CSV Files',
        accept: {
          'text/csv': ['.csv']
        }
      }]
    });

    // Create a FileSystemWritableFileStream to write to
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
  } catch (error) {
    if (error.name === 'AbortError') {
      // User cancelled the save dialog
      return;
    }
    // Fallback to the old method if File System Access API is not supported
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}; 