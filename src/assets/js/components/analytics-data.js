import { getAnalyticsData, exportToCSV } from './analytics-display.js';

// Export the main function
export const fetchAnalyticsData = async (range = 'last7') => {
  return await getAnalyticsData(range);
};

// Re-export the exportToCSV function
export { exportToCSV }; 