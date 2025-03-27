// ==UserScript==
// @name                Privacy Tools
// @name:fr             Outils de Confidentialité
// @name:ru             Инструменты конфиденциальности
// @name:es             Herramientas de Privacidad
// @name:de             Datenschutz-Tools
// @description         A shield against tracking, it's my privacy and it's my right to have it respected
// @description:fr      Un bouclier contre le suivi, c'est ma vie privée et c'est mon droit de la voir respectée
// @description:ru      Щит против отслеживания, это моя конфиденциальность и мне должны ее уважать
// @description:es      Un escudo contra el seguimiento, es mi privacidad y es mi derecho que sea respetada
// @description:de      Ein Schild gegen Tracking, es ist meine Privatsphäre und es ist mein Recht, dass sie respektiert wird
// @author              c127dev
// @include             https://www.messenger.com/*
// @include             https://www.amazon.*
// @namespace           http://tampermonkey.net/
// @version             1.0
// @grant               none
// @run-at              document-end
// ==/UserScript==

// TODO: Optimize code and add more services

(() => {
    'use strict';

    // Cache for already processed URLs
    const urlCache = new Map();
    const CLOUDFLARE_WORKER = 'https://url-resolver.c127.dev';
    const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36';
    const DEFAULT_REFERER = 'https://www.google.com/';

    const SERVICES = [{
        name: 'MESSENGER',
        urls: new RegExp('^https://www\.messenger\.com/t/.*'),
        referer: 'https://www.facebook.com/',
        userAgent: DEFAULT_USER_AGENT
    }, {
        name: 'AMAZON',
        urls: new RegExp('^https://www\.amazon\..*'),
        referer: 'https://www.amazon.com/',
        userAgent: DEFAULT_USER_AGENT
    }];
    
    // Check url and set service
    const SERVICE = SERVICES.find(service => service.urls.test(window.location.href));

    const removeTrackingUrl = async (url) => {
        // Return cached URL if already processed
        if (urlCache.has(url)) return urlCache.get(url);
        const oldUrl = url;

        // If URL is already a Cloudflare Worker URL, return it
        if (url.startsWith(CLOUDFLARE_WORKER)) return null;

        // Remove tracking parameters from l.messenger.com URLs
        if (url.startsWith('https://l.messenger.com/l.php?u=')) {
            const urlParams = new URL(url).searchParams;
            url = decodeURIComponent(urlParams.get('u') || url);
        }

        // Detect if the link changed domain, but contains path like /?redirect=1&referer=...
        // Then replace again the domain to WORKER domain
        if (url.includes(`?redirect=1&referer=${encodeURIComponent(SERVICE.referer || DEFAULT_REFERER)}&url=`)) {
            const urlParams = new URL(url).searchParams;
            url = urlParams.get('url');
        } else 
            url = `${CLOUDFLARE_WORKER}/?redirect=1&referer=${encodeURIComponent(SERVICE.referer || DEFAULT_REFERER)}&url=${encodeURIComponent(url)}`;

        urlCache.set(oldUrl, url);
        return url;
    }

    const processLinks = async (rootNode) => {
        // Detect all links with tracking parameters https:// or /resource/
        const links = Array.from(rootNode.querySelectorAll('a[href*="/"], a[href*="https://"]')).filter(link => !link.href.startsWith(CLOUDFLARE_WORKER));

        links.forEach(async link => {
            removeTrackingUrl(link.href)
            .then(cleanUrl => {
                const oldUrl = link.href;
                if (oldUrl.startsWith(CLOUDFLARE_WORKER)) return null;

                link.href = cleanUrl;

                if (SERVICE.name === 'MESSENGER') {
                    const parentSpan = link.closest('span');
                    if (parentSpan && parentSpan.getAttribute('role') !== 'gridcell' &&
                        parentSpan.parentElement.children.length > 0) {
                        const gridcell = parentSpan.parentElement;
                        const clone = gridcell.cloneNode(true);
                        // Replace to remove EventListeners THANKS "META"
                        gridcell.replaceWith(clone);
                    }
                } else {
                    // Remove all event listeners to avoid tracking
                    const clone = link.cloneNode(true);
                    link.replaceWith(clone);
                }

                // Debug cleaning process
                if (cleanUrl.includes("Raspberry"))
                    console.log('URL:', oldUrl, "->", cleanUrl);
            })
            .catch(e => console.error('Error processing link:', e));
        });
    };

    const setupObserver = () => {
        var targetGrid = null;

        if (SERVICE.name === 'MESSENGER') {
            const grids = document.querySelectorAll('div[role="grid"]');
            if (grids.length < 2) return false;

            const navContainer = document.querySelector("div[role=navigation]");
            targetGrid = navContainer ? navContainer.parentNode.childNodes[2] : null;
        } else {
            // Probably laggy, but it's the only way to get all links on unknown pages
            targetGrid = document;
        }

        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.addedNodes.length)
                    processLinks(targetGrid);
            });
        });

        observer.observe(targetGrid, {
            childList: true,
            subtree: true
        });

        // Process links inmediately
        processLinks(targetGrid);
        return true;
    };

    // Wait for the DOM to be ready
    if (!setupObserver()) {
        const domObserver = new MutationObserver((_, observer) => {
            if (setupObserver())
                observer.disconnect();
        });

        domObserver.observe(document, {
            childList: true,
            subtree: true
        });
    }
})();