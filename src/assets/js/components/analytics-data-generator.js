// Sample data for realistic generation
const countries = [
  { code: 'US', name: 'United States', cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'] },
  { code: 'GB', name: 'United Kingdom', cities: ['London', 'Manchester', 'Birmingham', 'Glasgow', 'Liverpool'] },
  { code: 'DE', name: 'Germany', cities: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne'] },
  { code: 'FR', name: 'France', cities: ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice'] },
  { code: 'IT', name: 'Italy', cities: ['Rome', 'Milan', 'Naples', 'Turin', 'Palermo'] },
  { code: 'ES', name: 'Spain', cities: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza'] },
  { code: 'JP', name: 'Japan', cities: ['Tokyo', 'Osaka', 'Yokohama', 'Nagoya', 'Sapporo'] },
  { code: 'IN', name: 'India', cities: ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai'] },
  { code: 'BR', name: 'Brazil', cities: ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza'] },
  { code: 'CA', name: 'Canada', cities: ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Ottawa'] }
];

const browsers = [
  { name: 'Chrome', version: '120.0.0' },
  { name: 'Safari', version: '17.0' },
  { name: 'Firefox', version: '121.0' },
  { name: 'Edge', version: '120.0.0' },
  { name: 'Opera', version: '106.0.0' }
];

const operatingSystems = [
  { name: 'Windows', version: '10' },
  { name: 'Windows', version: '11' },
  { name: 'macOS', version: '14.2' },
  { name: 'iOS', version: '17.4' },
  { name: 'Android', version: '14' },
  { name: 'Linux', version: '6.6' }
];

const devices = [
  { type: 'Desktop', width: 1920, height: 1080 },
  { type: 'Desktop', width: 2560, height: 1440 },
  { type: 'Desktop', width: 1366, height: 768 },
  { type: 'Mobile', width: 414, height: 896 },
  { type: 'Mobile', width: 390, height: 844 },
  { type: 'Tablet', width: 768, height: 1024 },
  { type: 'Tablet', width: 1024, height: 1366 }
];

const pages = [
  '/',
  '/products',
  '/about',
  '/contact',
  '/blog',
  '/pricing',
  '/login',
  '/register',
  '/dashboard',
  '/settings'
];

const referrers = [
  { source: 'Google', category: 'search', subcategory: 'organic' },
  { source: 'Bing', category: 'search', subcategory: 'organic' },
  { source: 'Facebook', category: 'social', subcategory: 'social' },
  { source: 'Twitter', category: 'social', subcategory: 'social' },
  { source: 'LinkedIn', category: 'social', subcategory: 'social' },
  { source: 'Reddit', category: 'social', subcategory: 'social' },
  { source: 'YouTube', category: 'social', subcategory: 'social' },
  { source: 'Instagram', category: 'social', subcategory: 'social' },
  { source: 'Pinterest', category: 'social', subcategory: 'social' },
  { source: 'TikTok', category: 'social', subcategory: 'social' },
  { source: 'Medium', category: 'content', subcategory: 'blog' },
  { source: 'GitHub', category: 'technical', subcategory: 'developer' },
  { source: 'Stack Overflow', category: 'technical', subcategory: 'developer' },
  { source: 'Product Hunt', category: 'product', subcategory: 'launch' },
  { source: 'Hacker News', category: 'technical', subcategory: 'news' }
];

const sampleHosts = [
  "example.com",
  "myapp.com",
  "coolstuff.shop",
  "newsportal.io",
  "travelbuddy.org"
];

// Sample data for traffic sources
const sampleTrafficSources = [
  { source: 'Direct', weight: 0.3 },
  { source: 'Organic Search', weight: 0.25 },
  { source: 'Social', weight: 0.15 },
  { source: 'Referral', weight: 0.1 },
  { source: 'Email', weight: 0.08 },
  { source: 'Paid Search', weight: 0.05 },
  { source: 'Paid Social', weight: 0.03 },
  { source: 'Display', weight: 0.02 },
  { source: 'Affiliate', weight: 0.01 },
  { source: 'Video', weight: 0.01 }
];

// Helper functions
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Function to generate a random IP address
const generateIP = () => {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
};

// Function to generate a random timestamp within the last 24 hours
const generateTimestamp = (startDate) => {
  const timestamp = new Date(startDate);
  timestamp.setMinutes(timestamp.getMinutes() + Math.floor(Math.random() * 60));
  timestamp.setSeconds(Math.floor(Math.random() * 60));
  timestamp.setMilliseconds(Math.floor(Math.random() * 1000));
  return timestamp;
};

// Function to generate pageview data
export const generatePageviews = () => {
  const pageviews = [];
  const now = new Date();
  const startDate = new Date(now);
  startDate.setMonth(startDate.getMonth() - 1); // Go back 1 month
  startDate.setHours(0, 0, 0, 0);

  // Generate visitors for each day
  const daysDiff = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
  
  for (let day = 0; day < daysDiff; day++) {
    const dayStart = new Date(startDate);
    dayStart.setDate(dayStart.getDate() + day);
    
    // Generate random number of visitors for this day (between 5 and 30)
    const dayVisitors = Math.floor(5 + Math.random() * 25);
    
    // Generate all visitors for this day
    for (let visitorIndex = 0; visitorIndex < dayVisitors; visitorIndex++) {
      // Generate visitor data
      const ip = generateIP();
      const country = randomItem(countries);
      const city = randomItem(country.cities);
      const browser = randomItem(browsers);
      const os = randomItem(operatingSystems);
      const device = randomItem(devices);
      
      // Generate a random number of pageviews for this visitor (between 1 and 4, with 2 being most common)
      const pageviewsPerVisitor = Math.floor(1 + Math.random() * 3);
      
      // Generate a sequence of pageviews for this visitor
      const visitorPages = [];
      for (let i = 0; i < pageviewsPerVisitor; i++) {
        // First page is usually home page, subsequent pages are random
        const page = i === 0 ? "/" : randomItem(pages.filter(p => p !== "/"));
        visitorPages.push(page);
      }
      
      // Generate timestamps and durations for each pageview
      let lastTimestamp = new Date(dayStart);
      lastTimestamp.setHours(Math.floor(Math.random() * 24));
      lastTimestamp.setMinutes(Math.floor(Math.random() * 60));
      
      for (let i = 0; i < visitorPages.length; i++) {
        const page = visitorPages[i];
        const timestamp = generateTimestamp(lastTimestamp);
        lastTimestamp = timestamp;
        
        // Generate a random duration between 30 seconds and 5 minutes
        const duration = Math.floor(30 + Math.random() * 270);
        
        // Generate referrer data
        let referrer;
        if (i === 0) {
          // First pageview gets an external referrer
          referrer = randomItem(referrers);
        } else {
          // Subsequent pageviews get internal referrers
          const previousPage = visitorPages[i-1];
          referrer = {
            source: `https://${randomItem(sampleHosts)}${previousPage}`,
            category: 'internal',
            subcategory: 'navigation'
          };
        }
        
        pageviews.push({
          visitedAt: timestamp.toISOString(),
          ip: ip,
          referrer: referrer,
          currentPage: page,
          browser: browser,
          os: os,
          device: device,
          screenSize: `${device.width}x${device.height}`,
          location: {
            country: country.name,
            countryCode: country.code,
            city: city
          },
          visitorId: ip,
          timestamp: timestamp,
          duration: duration,
          isBounce: pageviewsPerVisitor === 1
        });
      }
    }
  }

  // Sort pageviews by timestamp
  return pageviews.sort((a, b) => new Date(a.visitedAt) - new Date(b.visitedAt));
};

// Function to compute analytics from pageviews
export const computeAnalytics = (pageviews) => {
  // Group pageviews by hour
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
    const timestamp = new Date(pageview.visitedAt);
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
    stats.visitors.add(pageview.ip);
  });

  // Sort dates and prepare time series data
  const sortedHours = Array.from(timeSeriesStats.entries())
    .sort((a, b) => a[1].timestamp - b[1].timestamp);

  // Compute other statistics
  const uniqueVisitors = new Set(pageviews.map(p => p.ip)).size;
  const totalViews = pageviews.length;
  
  // Handle division by zero cases
  const bounceRate = totalViews > 0 ? (pageviews.filter(p => p.currentPage === '/').length / totalViews) * 100 : 0;
  const avgVisitDuration = totalViews > 0 ? Math.round(pageviews.reduce((sum, p) => sum + (p.duration || 0), 0) / totalViews / 60) : 0;

  return {
    stats: {
      views: totalViews,
      visits: totalViews,
      visitors: uniqueVisitors,
      bounceRate: Math.round(bounceRate),
      visitDuration: `${avgVisitDuration}m`,
      viewsChange: 0,
      visitsChange: 0,
      visitorsChange: 0,
      bounceRateChange: 0,
      visitDurationChange: 0
    },
    viewsOverTime: {
      dates: sortedHours.map(([_, stats]) => stats.timestamp.toISOString()),
      visitors: sortedHours.map(([_, stats]) => stats.visitors.size),
      views: sortedHours.map(([_, stats]) => stats.views)
    }
  };
};

// Export the main function
export const fetchAnalyticsData = async (range = 'last7') => {
  // Generate pageviews
  const pageviews = generatePageviews();
  
  // Compute analytics
  const analytics = computeAnalytics(pageviews);
  
  return {
    ...analytics,
    pageviews: pageviews
  };
}; 