// self.addEventListener('install', (ev) => {
//   console.log('installed');
// })

// self.addEventListener('activate', (ev) => {
//   console.log('activated');
// })

// self.addEventListener('fetch', (ev) => {
//   console.log('intercepted a http request', ev.request);
// }
// )

const SERVICE_WORKER_REGISTER = {
  background: null, 
  cacheName: 'dicitionary-cache',
  init() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/background.js', 
      { scope: '/'})
      .then(registration=> {
        SERVICE_WORKER_REGISTER.background = registration.installing ||
                            registration.waiting ||
                            registration.active;
        console.log('service worker registered');
        document.querySelector("output").innerHTML = "Service Worker registered";
      })
      .catch(error => {
        // console.error('Service Worker registration failed:', error);
        document.querySelector("output").innerHTML = error;
      });
    }
    else {
      console.log('Service workers are not suppported');
    }
    SERVICE_WORKER_REGISTER.startCaching();
    
    document.querySelector("output").addEventListener('click',SERVICE_WORKER_REGISTER.deleteCache);
  },
  startCaching() {
    caches.open(SERVICE_WORKER_REGISTER.cacheName)
    // .then(cache => {
    //   console.log(`Cache ${SERVICE_WORKER_REGISTER.cacheName} opened`);
    //   let urlString = '/dictionary.txt?id=one';
    //   cache.add(urlString); // add is fetch + put
    //   // {
    //   // if(!event.request.url.startsWith('http')){
    //   //   //skip request
    //   // }
    // //}
    // });
  },
};

document.addEventListener('DOMContentLoaded', SERVICE_WORKER_REGISTER.init);

