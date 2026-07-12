const CACHE_NAME = "ward-survey-v1";

const FILES_TO_CACHE = [

    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./manifest.json"

];

self.addEventListener("install", function(event){

    event.waitUntil(

        caches.open(CACHE_NAME)

        .then(function(cache){

            return cache.addAll(FILES_TO_CACHE);

        })

    );

});
self.addEventListener("activate", function(event){

    console.log("Activated");

});

self.addEventListener("fetch", (event) => {

    event.respondWith(

        caches.match(event.request)
            .then((cachedResponse) => {

                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(event.request)
                    .then((networkResponse) => {

                        return networkResponse;

                    });

            })
            .catch((error) => {

                console.log("Fetch failed:", event.request.url, error);

                return new Response("", {
                    status: 503,
                    statusText: "Offline"
                });

            })

    );

});