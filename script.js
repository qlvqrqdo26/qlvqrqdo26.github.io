(function () {
  document.documentElement.classList.add('js');

  var views = Array.prototype.slice.call(document.querySelectorAll('.view'));
  var links = Array.prototype.slice.call(document.querySelectorAll('[data-route]'));
  var names = { home: 'Home', about: 'About', projects: 'Projects', blog: 'Blog' };

  function route() {
    var id = (location.hash || '#home').slice(1);
    if (!names[id]) id = 'home';

    views.forEach(function (v) {
      v.classList.toggle('active', v.id === id);
    });

    links.forEach(function (a) {
      if (a.getAttribute('data-route') === id) {
        a.setAttribute('aria-current', 'page');
      } else {
        a.removeAttribute('aria-current');
      }
    });

    document.title = id === 'home' ? 'Alvarado Sánchez' : names[id] + ' · Alvarado Sánchez';
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', route);
  route();
})();
