(function () {
    'use strict';

    var CACHE_NAME = "TorigoyaCache-1468156813077";
    var CACHE_LIST_FILE = '/cache.json';

    var HOST = location.href.replace(/\/[^\/]+$/, '');

    var canPlayOgg = (function () {
        var ua = navigator.userAgent.toLowerCase();
        var isChrome = (~ua.indexOf('chrome')) && (!~ua.indexOf('edge'));
        var isFirefox = (~ua.indexOf('firefox'));
        var isIOS = (~ua.indexOf('iphone') || ~ua.indexOf('ipad') || ~ua.indexOf('ipod'));
        var isAndroid = (~ua.indexOf('android'));
        return (isChrome || isFirefox) && !(isIOS || isAndroid);
    })();

    self.addEventListener('install', function (e) {
        console.info('service worker: install [' + CACHE_NAME + ']');
        e.waitUntil(
            fetch(HOST + CACHE_LIST_FILE).then(function (response) {
                return response.json();
            }).then(function (json) {
                return json.filter(function (file) {
                    if (canPlayOgg) {
                        return !file.path.match(/\.(m4a|mp4)$/);
                    } else {
                        return !file.path.match(/\.(ogg|webm)$/);
                    }
                });
            }).then(function (json) {
                return json.map(function (file) {
                    return HOST + file.path;
                });
            }).then(function (json) {
                return caches.open(CACHE_NAME).then(function (cache) {
                    return cache.addAll(json);
                });
            })
        );
    });

    self.addEventListener('activate', function (e) {
        console.info('service worker: activate [' + CACHE_NAME + ']');
        e.waitUntil(
            caches.keys().then(function (cacheNames) {
                return Promise.all(
                    cacheNames.map(function (cacheName) {
                        if (cacheName !== CACHE_NAME) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
        );
    });

    self.addEventListener('fetch', function (e) {
        e.respondWith(
            caches.match(e.request, {cacheName: CACHE_NAME})
                .then(function (response) {
                    if (response) {
                        console.log('from cache -> ' + e.request.url);
                        return response;
                    } else {
                        console.log('download -> ' + e.request.url);
                        return fetch(e.request).then(function (response) {
                            if (!response || response.status !== 200 || response.type !== 'basic') {
                                return response;
                            }

                            var responseCopy = response.clone();
                            caches.open(CACHE_NAME).then(function (cache) {
                                return cache.put(e.request, responseCopy);
                            });
                            return response;
                        });
                    }
                })
        );
    });
})();
