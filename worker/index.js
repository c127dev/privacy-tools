addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl)
        return new Response('Missing parameter "url"', { status: 400 });

    try {
        // Simulate browser headers
        const browserHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Referer': 'https://www.facebook.com/',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1'
        };

        // Resolve redirections
        const res = await fetch(targetUrl, {
            redirect: 'manual',
            headers: browserHeaders
        });

        // Last URL after redirections
        let finalUrl = res.headers.get('location') || targetUrl;

        // Clean tracking parameters
        finalUrl = cleanUrl(finalUrl);

        // More headers if bot detected
        if (finalUrl.includes('unsupportedbrowser')) {
            const retryRes = await fetch(targetUrl, {
                redirect: 'manual',
                headers: {
                    ...browserHeaders,
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive'
                }
            });
            finalUrl = retryRes.headers.get('location') || targetUrl;
            finalUrl = cleanUrl(finalUrl);
        }

        return new Response(JSON.stringify({ cleaned_url: finalUrl }), {
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500 
        });
    }
}

/**
 * Remove tracking parameters from URL
 * @param {string} url 
 * @returns {string}
 */
function cleanUrl(url) {
    const urlObj = new URL(url);
    const paramsToRemove = [
        'h', 'u', 'rdid', 'share_url', 'fbclid', 
        'igshid', 'ref', '__cft__', '__tn__'
    ];
    paramsToRemove.forEach(param => urlObj.searchParams.delete(param));
    return urlObj.toString();
}