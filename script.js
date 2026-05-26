(function () {
  'use strict';

  // Event: Saturday, September 26, 2026 at 6:00 PM Pacific (PDT, UTC-7).
  var EVENT_TIME = new Date('2026-09-26T18:00:00-07:00').getTime();

  var els = {
    days: document.getElementById('cd-days'),
    hours: document.getElementById('cd-hours'),
    minutes: document.getElementById('cd-minutes'),
    seconds: document.getElementById('cd-seconds')
  };

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function tick() {
    var diff = EVENT_TIME - Date.now();
    if (diff <= 0) {
      els.days.textContent = '0';
      els.hours.textContent = '00';
      els.minutes.textContent = '00';
      els.seconds.textContent = '00';
      return false;
    }
    var s = Math.floor(diff / 1000);
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60); s -= m * 60;
    els.days.textContent = String(d);
    els.hours.textContent = pad(h);
    els.minutes.textContent = pad(m);
    els.seconds.textContent = pad(s);
    return true;
  }

  if (els.days) {
    tick();
    var iv = setInterval(function () {
      if (!tick()) clearInterval(iv);
    }, 1000);
  }

  // RSVP form: submit via fetch so the visitor stays on the page.
  var form = document.getElementById('rsvp-form');
  var status = document.getElementById('form-status');

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      status.className = 'form-status';
      status.textContent = 'Sending…';

      var data = new FormData(form);
      fetch(form.action, {
        method: 'POST',
        body: data,
        headers: { 'Accept': 'application/json' }
      }).then(function (res) {
        if (res.ok) {
          form.reset();
          status.className = 'form-status success';
          status.textContent = 'Thank you! Your RSVP has been received. See you September 26th!';
        } else {
          return res.json().then(function (body) {
            var msg = (body && body.errors && body.errors.map(function (x) { return x.message; }).join(', ')) ||
                      'Something went wrong. Please try again or email rhsfresno06@gmail.com.';
            status.className = 'form-status error';
            status.textContent = msg;
          });
        }
      }).catch(function () {
        status.className = 'form-status error';
        status.textContent = 'Network error. Please try again or email rhsfresno06@gmail.com.';
      });
    });
  }
})();
