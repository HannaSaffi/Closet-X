// services/outfit-service/src/services/weatherService.js

const axios = require('axios');
const NodeCache = require('node-cache');
const { weatherConfig, categorizeTemperature, mapWeatherCondition } = require('../config/weather');

// Cache for weather data (1 hour TTL)
const weatherCache = new NodeCache({ stdTTL: weatherConfig.cache.ttl });

class WeatherService {
  constructor() {
    this.provider = weatherConfig.provider;
    this.baseUrl = weatherConfig[this.provider].baseUrl;
    this.apiKey = weatherConfig[this.provider].apiKey;
  }

  /**
   * Get current weather for a location
   * @param {string} city - City name or coordinates
   * @returns {Promise<Object>} Weather data
   */
  async getCurrentWeather(city = weatherConfig.defaultLocation.city) {
    try {
      // Check cache first
      const cacheKey = `${weatherConfig.cache.keyPrefix}${city}`;
      const cached = weatherCache.get(cacheKey);
      if (cached) {
        console.log(`Returning cached weather for ${city}`);
        return cached;
      }

      let weatherData;
      
      if (this.provider === 'openweather') {
        weatherData = await this.getOpenWeatherData(city);
      } else if (this.provider === 'weatherstack') {
        weatherData = await this.getWeatherStackData(city);
      }

      // Cache the result
      if (weatherConfig.cache.enabled) {
        weatherCache.set(cacheKey, weatherData);
      }

      return weatherData;
    } catch (error) {
      console.error('Weather Service Error:', error.message);
      throw error;
    }
  }

  /**
   * Get weather forecast for next 5 days
   */
  async getWeatherForecast(city = weatherConfig.defaultLocation.city) {
    try {
      const cacheKey = `${weatherConfig.cache.keyPrefix}forecast:${city}`;
      const cached = weatherCache.get(cacheKey);
      if (cached) return cached;

      const response = await axios.get(
        `${this.baseUrl}${weatherConfig.openweather.endpoints.forecast}`,
        {
          params: {
            q: city,
            appid: this.apiKey,
            units: weatherConfig.openweather.units
          }
        }
      );

      const forecast = this.parseOpenWeatherForecast(response.data);
      
      if (weatherConfig.cache.enabled) {
        weatherCache.set(cacheKey, forecast);
      }

      return forecast;
    } catch (error) {
      throw new Error(`Forecast Error: ${error.message}`);
    }
  }

  /**
   * Get weather data from OpenWeatherMap
   */
  async getOpenWeatherData(city) {
    try {
      const response = await axios.get(
        `${this.baseUrl}${weatherConfig.openweather.endpoints.current}`,
        {
          params: {
            q: city,
            appid: this.apiKey,
            units: weatherConfig.openweather.units
          },
          timeout: 5000
        }
      );

      return this.parseOpenWeatherResponse(response.data);
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`City not found: ${city}`);
      }
      throw new Error(`OpenWeather API Error: ${error.message}`);
    }
  }

  /**
   * Parse OpenWeatherMap API response
   */
  parseOpenWeatherResponse(data) {
    const temp = data.main.temp;
    const condition = data.weather[0].main;
    
    return {
      location: {
        city: data.name,
        country: data.sys.country,
        coordinates: {
          lat: data.coord.lat,
          lon: data.coord.lon
        }
      },
      current: {
        temperature: {
          value: Math.round(temp),
          unit: 'fahrenheit',
          feelsLike: Math.round(data.main.feels_like),
          category: categorizeTemperature(temp)
        },
        condition: {
          main: condition,
          description: data.weather[0].description,
          icon: data.weather[0].icon,
          mapped: mapWeatherCondition(condition)
        },
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        windSpeed: data.wind.speed,
        cloudiness: data.clouds.all,
        visibility: data.visibility
      },
      precipitation: this.calculatePrecipitation(data),
      timestamp: new Date(data.dt * 1000),
      sunrise: new Date(data.sys.sunrise * 1000),
      sunset: new Date(data.sys.sunset * 1000)
    };
  }

  /**
   * Get weather data from WeatherStack (backup provider)
   */
  async getWeatherStackData(city) {
    try {
      const response = await axios.get(`${this.baseUrl}/current`, {
        params: {
          access_key: this.apiKey,
          query: city,
          units: weatherConfig.weatherstack.units
        },
        timeout: 5000
      });

      if (response.data.error) {
        throw new Error(response.data.error.info);
      }

      return this.parseWeatherStackResponse(response.data);
    } catch (error) {
      throw new Error(`WeatherStack API Error: ${error.message}`);
    }
  }

  /**
   * Parse WeatherStack API response
   */
  parseWeatherStackResponse(data) {
    const temp = data.current.temperature;
    const condition = data.current.weather_descriptions[0];
    
    return {
      location: {
        city: data.location.name,
        country: data.location.country,
        coordinates: {
          lat: data.location.lat,
          lon: data.location.lon
        }
      },
      current: {
        temperature: {
          value: temp,
          unit: 'fahrenheit',
          feelsLike: data.current.feelslike,
          category: categorizeTemperature(temp)
        },
        condition: {
          main: condition,
          description: condition,
          mapped: mapWeatherCondition(condition)
        },
        humidity: data.current.humidity,
        pressure: data.current.pressure,
        windSpeed: data.current.wind_speed,
        cloudiness: data.current.cloudcover,
        visibility: data.current.visibility
      },
      precipitation: {
        probability: data.current.precip > 0 ? 100 : 0,
        amount: data.current.precip,
        type: data.current.precip > 0 ? 'rain' : 'none'
      },
      timestamp: new Date(data.location.localtime)
    };
  }

  /**
   * Calculate precipitation details
   */
  calculatePrecipitation(data) {
    const rain = data.rain?.['1h'] || 0;
    const snow = data.snow?.['1h'] || 0;
    
    let type = 'none';
    let level = 'none';
    
    if (snow > 0) {
      type = 'snow';
      level = snow > 2 ? 'heavy' : snow > 0.5 ? 'moderate' : 'light';
    } else if (rain > 0) {
      type = 'rain';
      level = rain > 7.6 ? 'heavy' : rain > 2.5 ? 'moderate' : 'light';
    }
    
    return {
      type,
      level,
      amount: rain + snow,
      probability: type !== 'none' ? 100 : 0
    };
  }

  /**
   * Parse forecast data
   */
  parseOpenWeatherForecast(data) {
    // Group forecasts by day
    const dailyForecasts = {};
    
    data.list.forEach(item => {
      const date = new Date(item.dt * 1000).toLocaleDateString();
      if (!dailyForecasts[date]) {
        dailyForecasts[date] = {
          date,
          temps: [],
          conditions: [],
          precipitation: []
        };
      }
      
      dailyForecasts[date].temps.push(item.main.temp);
      dailyForecasts[date].conditions.push(item.weather[0].main);
      dailyForecasts[date].precipitation.push(item.pop || 0);
    });
    
    // Calculate daily summaries
    return Object.values(dailyForecasts).map(day => ({
      date: day.date,
      temperature: {
        high: Math.round(Math.max(...day.temps)),
        low: Math.round(Math.min(...day.temps)),
        avg: Math.round(day.temps.reduce((a, b) => a + b) / day.temps.length)
      },
      condition: this.getMostFrequent(day.conditions),
      precipitationProbability: Math.round(Math.max(...day.precipitation) * 100)
    }));
  }

  /**
   * Get most frequent item in array
   */
  getMostFrequent(arr) {
    const frequency = {};
    arr.forEach(item => frequency[item] = (frequency[item] || 0) + 1);
    return Object.keys(frequency).reduce((a, b) => 
      frequency[a] > frequency[b] ? a : b
    );
  }

  /**
   * Get clothing recommendations based on weather
   */
  getClothingRecommendations(weatherData) {
    const temp = weatherData.current.temperature.value;
    const tempCategory = categorizeTemperature(temp);
    const precipitation = weatherData.precipitation.level;
    
    const recommendations = {
      ...weatherConfig.temperatureRecommendations[tempCategory],
      precipitation: weatherConfig.precipitationRecommendations[precipitation] || []
    };
    
    return {
      temperature: tempCategory,
      weatherCondition: weatherData.current.condition.mapped,
      required: recommendations.required || [],
      suggested: recommendations.suggested || [],
      avoid: recommendations.avoid || [],
      precipitation: recommendations.precipitation,
      summary: this.generateRecommendationSummary(temp, weatherData.current.condition.main, precipitation)
    };
  }

  /**
   * Generate human-readable recommendation summary
   */
  generateRecommendationSummary(temp, condition, precipitation) {
    let summary = `It's ${Math.round(temp)}°F`;
    
    if (condition) {
      summary += ` and ${condition.toLowerCase()}`;
    }
    
    if (precipitation !== 'none') {
      summary += ` with ${precipitation} precipitation`;
    }
    
    summary += '. ';
    
    if (temp < 50) {
      summary += 'Dress warmly with layers.';
    } else if (temp < 65) {
      summary += 'A light jacket would be comfortable.';
    } else if (temp < 80) {
      summary += 'Perfect weather for casual wear.';
    } else {
      summary += 'Wear light, breathable clothing.';
    }
    
    if (precipitation === 'moderate' || precipitation === 'heavy') {
      summary += ' Bring rain gear!';
    }
    
    return summary;
  }
}

module.exports = new WeatherService();