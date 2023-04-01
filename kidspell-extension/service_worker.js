const SERVICE_WORKER_RESIGER = {
background: null, 
init() {
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./background.js', {
        scope: './',
    })
      .then(registration=> {
        SERVICE_WORKER_RESIGER.background = registration.installing ||
                            registration.waiting ||
                            registration.active;
            console.log('service worker registered');
      })
      .catch(function(err) {
        console.error('Service Worker registration failed:', err);
      });
  }
else {
    console.log('Service workers are not suppported');
     }
  }
}

document.addEventListener('DOMContentLoaded', SERVICE_WORKER_RESIGER.init);
  