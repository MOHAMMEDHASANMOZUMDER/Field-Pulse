/**
 * Vercel Speed Insights Integration
 * Initializes Speed Insights to track Core Web Vitals
 */

// Initialize Speed Insights queue
window.si = window.si || function() {
  (window.siq = window.siq || []).push(arguments);
};

// Load Speed Insights script
(function() {
  // Determine script source based on environment
  const scriptSrc = '/_vercel/speed-insights/script.js';
  
  // Check if script is already loaded
  if (document.head.querySelector(`script[src*="${scriptSrc}"]`)) {
    return;
  }
  
  // Create and inject script
  const script = document.createElement('script');
  script.src = scriptSrc;
  script.defer = true;
  script.dataset.sdkn = '@vercel/speed-insights';
  script.dataset.sdkv = '2.0.0';
  
  script.onerror = function() {
    console.log(
      '[Vercel Speed Insights] Failed to load script from ' + scriptSrc + 
      '. Please check if any content blockers are enabled and try again.'
    );
  };
  
  document.head.appendChild(script);
})();
