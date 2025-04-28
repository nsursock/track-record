export default function () {
  return {
    selectedRange: 'Last 24 hours',
    ranges: [
      { label: 'Today', value: 'today' },
      { label: 'Last 24 hours', value: 'last24' },
      { label: 'This week', value: 'thisWeek' },
      { label: 'Last 7 days', value: 'last7' },
      { label: 'This month', value: 'thisMonth' },
      { label: 'Last 30 days', value: 'last30' },
      { label: 'Last 90 days', value: 'last90' },
      { label: 'This year', value: 'thisYear' },
      { label: 'Last 6 months', value: 'last6Months' },
      { label: 'Last 12 months', value: 'last12Months' },
      { label: 'All time', value: 'allTime' },
      // { label: 'Custom range', value: 'custom' }
    ],

    selectRange(range) {
      this.selectedRange = range.label;
      this.$dispatch('date-range-changed', { range: range.value });
    },

    isActive(range) {
      return this.selectedRange === range.label;
    }
  }
} 