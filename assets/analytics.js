/* GA4. Loaded from every page so there is one measurement ID, not nine copies. */
(function () {
  var ID = "G-XX68ZRTSZT";
  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + ID;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };
  gtag("js", new Date());
  gtag("config", ID);
})();
