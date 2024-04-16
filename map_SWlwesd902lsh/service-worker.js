// service-worker.js

// Listen for the 'install' event, which happens when the service worker is installed
self.addEventListener('install', event => {
    console.log('Service worker installed:', event);
});

// Listen for the 'activate' event, this is where you can clean up from previous service worker versions
self.addEventListener('activate', event => {
    console.log('Service worker activated:', event);
});

// Listen for 'push' events, which are triggered by your backend sending a push message
self.addEventListener('push', event => {
    const data = event.data.json(); // Assuming the notification payload is JSON
    console.log('Push notification received:', data);

    const title = data.title || "Default Notification";
    const options = {
        body: data.body || "You have a new message.",
        icon: data.icon || "images/icon.png",
        badge: data.badge || "images/badge.png"
    };

    // Show the notification
    event.waitUntil(self.registration.showNotification(title, options));
});