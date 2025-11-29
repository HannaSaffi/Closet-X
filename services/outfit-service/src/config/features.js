// services/outfit-service/src/config/features.js
// Feature flag configuration for Outfit Service
// All features default to DISABLED for safety

/**
 * Check if social features are enabled
 * @returns {boolean}
 */
function isSocialEnabled() {
  return process.env.FEATURE_SOCIAL_ENABLED === 'true';
}

/**
 * Check if advanced analytics are enabled
 * @returns {boolean}
 */
function isAdvancedAnalyticsEnabled() {
  return process.env.FEATURE_ADVANCED_ANALYTICS_ENABLED === 'true';
}

/**
 * Check if ML recommendations are enabled
 * @returns {boolean}
 */
function isMlRecommendationsEnabled() {
  return process.env.FEATURE_ML_RECOMMENDATIONS_ENABLED === 'true';
}

/**
 * Get all feature flags status
 * @returns {object}
 */
function getFeatureFlags() {
  return {
    social: isSocialEnabled(),
    advancedAnalytics: isAdvancedAnalyticsEnabled(),
    mlRecommendations: isMlRecommendationsEnabled()
  };
}

/**
 * Log feature flag status (for debugging)
 */
function logFeatureStatus() {
  const flags = getFeatureFlags();
  console.log('🚩 Outfit Service Feature Flags:', {
    'Social Features': flags.social ? '✅ ENABLED' : '❌ DISABLED',
    'Advanced Analytics': flags.advancedAnalytics ? '✅ ENABLED' : '❌ DISABLED',
    'ML Recommendations': flags.mlRecommendations ? '✅ ENABLED' : '❌ DISABLED'
  });
}

module.exports = {
  isSocialEnabled,
  isAdvancedAnalyticsEnabled,
  isMlRecommendationsEnabled,
  getFeatureFlags,
  logFeatureStatus
};
