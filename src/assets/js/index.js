import '../css/index.css';

import Alpine from 'alpinejs';
import { themeChange } from 'theme-change';
import 'flyonui/flyonui.js';
 
window.Alpine = Alpine

// Initialize theme controller
themeChange()

// Set default theme to cyberpunk
document.documentElement.setAttribute('data-theme', 'cyberpunk');

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
  Alpine.data('signupForm', () => ({
    currentStep: 1,
    formSubmitted: false,
    formData: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      country: '',
      city: '',
      dateOfBirth: '',
      phoneNumber: '',
      gender: '',
      linkedinUrl: '',
      twitterUrl: '',
      githubUrl: '',
      websiteUrl: ''
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
        // Submit form data
        const response = await fetch('/api/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(this.formData)
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create account');
        }

        // Handle profile picture upload if selected
        const fileInput = this.$refs.profilePic;
        if (fileInput && fileInput.files.length > 0) {
          const file = fileInput.files[0];
          const reader = new FileReader();
          
          reader.onload = async (e) => {
            try {
              const uploadResponse = await fetch('/api/upload-profile-picture', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  userId: data.userId,
                  file: e.target.result
                })
              });

              if (!uploadResponse.ok) {
                throw new Error('Failed to upload profile picture');
              }
            } catch (error) {
              console.error('Error uploading profile picture:', error);
              // Continue with signup even if profile picture upload fails
            }
          };

          reader.readAsDataURL(file);
        }

        this.formSubmitted = true;
        this.currentStep = 4;

      } catch (error) {
        console.error('Error:', error);
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
});
 
Alpine.start()
