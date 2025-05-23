import '../css/index.css';

import Alpine from 'alpinejs';
import { themeChange } from 'theme-change';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.css';
import 'flyonui/flyonui.js';
import ApexCharts from 'apexcharts';
import { fileUpload } from './components/file-upload.js';
import charts from './components/charts.js';
import dateFilter from './components/date-filter.js';

window.Alpine = Alpine

// Initialize theme controller
themeChange()

// Set default theme to cyberpunk
document.documentElement.setAttribute('data-theme', 'cyberpunk');

// Initialize ApexCharts
window.ApexCharts = ApexCharts;

// Define buildChart function globally
window.buildChart = (selector, options) => {
  const chart = new ApexCharts(document.querySelector(selector), options('light'));
  chart.render();
  return chart;
};

// Initialize FlyonUI components after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize date picker
  const dobEl = document.getElementById('dob');
  if (dobEl) {
    flatpickr('#dob', {
      allowInput: true,
      monthSelectorType: 'static',
      dateFormat: 'Y-m-d',
      altInput: true,
      altFormat: 'F j, Y',
      maxDate: 'today',
      minDate: '1900-01-01',
      defaultDate: '2000-01-01',
      disableMobile: true,
      locale: {
        firstDayOfWeek: 1
      }
    });
  }

  // Initialize advanced selects
  const selectEls = document.querySelectorAll('[data-select]');
  selectEls.forEach(selectEl => {
    // Initialize the select component using the data attribute
    selectEl.setAttribute('data-select-initialized', 'true');
  });
});

// Add Alpine extensions here
document.addEventListener('alpine:init', () => {
  Alpine.data('fileUpload', fileUpload);
  Alpine.data('charts', charts);
  Alpine.data('dateFilter', dateFilter);
  
  Alpine.data('signupForm', () => ({
    currentStep: 1,
    formSubmitted: false,
    formData: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      country: null,
      city: null,
      dateOfBirth: null,
      phoneNumber: null,
      gender: null,
      linkedinHandle: null,
      twitterHandle: null,
      githubHandle: null,
      websiteUrl: null,
      profilePictureUrl: null
    },
    passwordStrength: 0,
    passwordRules: {
      minLength: false,
      hasLowercase: false,
      hasUppercase: false,
      hasNumber: false,
      hasSpecial: false
    },
    isLoading: false,
    error: null,
    fileUploadObserver: null,

    init() {
      // Initialize any components that need it
      this.$nextTick(() => {
        if (this.$refs.dob) {
          flatpickr(this.$refs.dob, {
            allowInput: true,
            monthSelectorType: 'static',
            dateFormat: 'Y-m-d',
            altInput: true,
            altFormat: 'F j, Y',
            maxDate: 'today',
            minDate: '1900-01-01',
            defaultDate: '2000-01-01',
            disableMobile: true,
            locale: {
              firstDayOfWeek: 1
            }
          });
        }
      });
    },

    checkPasswordStrength(password) {
      this.passwordRules.minLength = password.length >= 6;
      this.passwordRules.hasLowercase = /[a-z]/.test(password);
      this.passwordRules.hasUppercase = /[A-Z]/.test(password);
      this.passwordRules.hasNumber = /[0-9]/.test(password);
      this.passwordRules.hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

      // Calculate strength (0-5)
      this.passwordStrength = Object.values(this.passwordRules).filter(Boolean).length;
    },

    async submitForm() {
      this.isLoading = true;
      this.error = null;

      try {
        // Only validate required fields
        if (!this.formData.email || !this.formData.password || !this.formData.firstName || !this.formData.lastName) {
          throw new Error('Please fill in all required fields');
        }

        // Validate password match
        if (this.formData.password !== this.formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }

        // Construct full URLs from handles
        const submitData = {
          ...this.formData,
          // Remove confirmPassword as it's not needed in the API
          confirmPassword: undefined,
          // Construct full URLs from handles
          linkedinUrl: this.formData.linkedinHandle ? `https://linkedin.com/in/${this.formData.linkedinHandle}` : null,
          twitterUrl: this.formData.twitterHandle ? `https://twitter.com/${this.formData.twitterHandle}` : null,
          githubUrl: this.formData.githubHandle ? `https://github.com/${this.formData.githubHandle}` : null,
          // Remove handle fields as they're not needed in the API
          linkedinHandle: undefined,
          twitterHandle: undefined,
          githubHandle: undefined
        };

        const response = await fetch('/api/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData)
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create account');
        }

        this.formSubmitted = true;
        this.currentStep = 4;
      } catch (error) {
        this.error = error.message;
      } finally {
        this.isLoading = false;
      }
    },

    nextStep() {
      if (this.currentStep < 4) {
        this.currentStep++;
      }
    },

    prevStep() {
      if (this.currentStep > 1) {
        this.currentStep--;
      }
    },

    async fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      });
    }
  }));

  // Add country select data
  Alpine.data('countrySelect', () => ({
    countries: [],
    isLoading: false,
    init() {
      // Get the country select element
      const countrySelect = document.getElementById('country-select');
      
      // Wait for the select to be initialized
      const checkSelect = setInterval(() => {
        const countrySelectInstance = window.HSSelect.getInstance(countrySelect);
        
        if (countrySelectInstance && countrySelectInstance.el) {
          clearInterval(checkSelect);
          // Fetch countries from countriesnow API
          this.fetchCountries(countrySelectInstance);
          
          // Listen for changes on the country select
          countrySelect.addEventListener('change', (e) => {
            countrySelectInstance.setValue(e.target.value);
          });
        }
      }, 100);
    },
    fetchCountries(countrySelectInstance) {
      if (!countrySelectInstance || !countrySelectInstance.el) return;
      
      this.isLoading = true;
      
      // Clear existing countries first
      countrySelectInstance.setValue('');
      
      // Get all current options and remove them
      const currentOptions = Array.from(countrySelectInstance.el.querySelectorAll('option'))
        .filter(opt => opt.value !== '') // Keep the placeholder
        .map(opt => opt.value);
      
      if (currentOptions.length > 0) {
        countrySelectInstance.removeOption(currentOptions);
      }

      fetch('https://countriesnow.space/api/v0.1/countries', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          if (data.error) {
            throw new Error(data.msg || 'Failed to fetch countries');
          }
          
          if (!data.data || !Array.isArray(data.data)) {
            throw new Error('Invalid data format received from API');
          }
          
          // Process countries to remove duplicates and clean up formatting
          const processedCountries = data.data
            .map(country => country.country)
            .filter((country, index, self) => self.indexOf(country) === index) // Remove duplicates
            .sort((a, b) => a.localeCompare(b)); // Sort alphabetically

          // Convert to the required format for addOptions
          const countryOptions = processedCountries.map(country => ({
            title: country,
            val: country
          }));

          // Add the new countries
          countrySelectInstance.addOption(countryOptions);
          
          this.isLoading = false;
        })
        .catch(error => {
          console.error('Error in fetchCountries:', error);
          this.isLoading = false;
        });
    }
  }));

  // Add city select data
  Alpine.data('citySelect', () => ({
    cities: [],
    isLoading: false,
    hasCountryBeenSelected: false,
    init() {
      // Get the country select element
      const countrySelect = document.getElementById('country-select');
      
      // Listen for changes on the country select
      countrySelect.addEventListener('change', (e) => {
        const countryCode = e.target.value;
        if (countryCode) {
          this.hasCountryBeenSelected = true;
          this.fetchCities(countryCode);
        } else {
          this.hasCountryBeenSelected = false;
          // Clear cities using addOptions with empty array
          const citySelect = document.getElementById('city-select');
          const citySelectInstance = window.HSSelect.getInstance(citySelect);
          citySelectInstance.addOption([]);
        }
      });

      // Listen for changes on the city select
      const citySelect = document.getElementById('city-select');
      citySelect.addEventListener('change', (e) => {
        const citySelectInstance = window.HSSelect.getInstance(citySelect);
        citySelectInstance.setValue(e.target.value);
      });
    },
    fetchCities(countryCode) {
      this.isLoading = true;
      
      // Clear existing cities first
      const citySelect = document.getElementById('city-select');
      const citySelectInstance = window.HSSelect.getInstance(citySelect);
      
      // Clear the current value
      citySelectInstance.setValue('');
      
      // Get all current options and remove them
      const currentOptions = Array.from(citySelect.querySelectorAll('option'))
        .filter(opt => opt.value !== '') // Keep the placeholder
        .map(opt => opt.value);
      
      if (currentOptions.length > 0) {
        citySelectInstance.removeOption(currentOptions);
      }
      
      const countrySelect = document.getElementById('country-select');
      const selectedOption = countrySelect.querySelector(`option[value='${countryCode}']`);
      const countryName = selectedOption ? selectedOption.textContent : '';
      
      if (!countryName) {
        console.error('Country name not found for code:', countryCode);
        this.isLoading = false;
        return;
      }

      fetch('https://countriesnow.space/api/v0.1/countries/cities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          country: countryName
        })
      })
        .then(response => response.json())
        .then(data => {
          if (data.error) {
            throw new Error(data.msg || 'Failed to fetch cities');
          }
          // Process cities to remove duplicates and clean up formatting
          const processedCities = data.data
            .filter((city, index, self) => self.indexOf(city) === index) // Remove duplicates
            .sort((a, b) => a.localeCompare(b)); // Sort alphabetically

          // Convert to the required format for addOptions
          const cityOptions = processedCities.map(city => ({
            title: city,
            val: city
          }));

          // Add the new cities
          citySelectInstance.addOption(cityOptions);
          
          this.isLoading = false;
        })
        .catch(error => {
          console.error('Error fetching cities:', error);
          this.isLoading = false;
        });
    }
  }));

  // Add reading progress component
  Alpine.data('readingProgress', () => ({
    progress: 0,
    sectionCount: 4,
    init() {
      const article = this.$el;
      const progressBar = article.querySelector('.radial-progress');
      
      const updateProgress = () => {
        const articleHeight = article.scrollHeight;
        const windowHeight = window.innerHeight;
        const scrollPosition = window.scrollY;
        
        // Calculate how far down the page the user has scrolled
        const scrollPercent = (scrollPosition / (articleHeight - windowHeight)) * 100;
        
        // Update progress, ensuring it stays between 0 and 100
        this.progress = Math.min(Math.max(Math.round(scrollPercent), 0), 100);
        
        // Update progress steps within the Alpine.js context
        const progressSteps = article.querySelectorAll('.progress-step');
        const stepSize = 100 / this.sectionCount;
        
        progressSteps.forEach((step, index) => {
          const stepStart = index * stepSize;
          const stepEnd = (index + 1) * stepSize;
          const stepProgress = (this.progress - stepStart) / stepSize;
          const opacity = Math.min(Math.max(stepProgress, 0), 1);
          step.style.opacity = opacity;
        });
      };

      // Update progress on scroll
      window.addEventListener('scroll', updateProgress);
      
      // Initial update
      updateProgress();
    }
  }));

  // Add post images component
  Alpine.data('postImages', () => ({
    init() {
      this.$nextTick(() => {
        const images = this.$el.querySelectorAll('img');
        images.forEach((img, index) => {
          img.classList.add(
            'w-1/3',
            'mb-5',
            'rounded-lg',
            'shadow-lg',
            'border-2',
            'border-primary',
            'border-opacity-20',
            'border-dashed',
            index % 2 === 0 ? 'float-right' : 'float-left',
            index % 2 === 0 ? 'ml-5' : 'mr-5'
          );
        });
      });
    }
  }));

  Alpine.data('header', () => ({
    user: null,
    notifications: [],

    async init() {
      try {
        const session = JSON.parse(localStorage.getItem('session'));
        if (session) {
          const response = await fetch('/api/profile', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            this.user = data.user;
            await this.fetchNotifications();
          }
        }
      } catch (error) {
        console.error('Error:', error);
      }
    },

    async fetchNotifications() {
      try {
        const session = JSON.parse(localStorage.getItem('session'));
        if (session) {
          const response = await fetch('/api/notifications', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            this.notifications = data.notifications;
          }
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    },

    async logout() {
      try {
        const session = JSON.parse(localStorage.getItem('session'));
        if (session) {
          await fetch('/api/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });
        }
        localStorage.removeItem('session');
        window.location.href = '/login/';
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
  }));
});
 
Alpine.start()
