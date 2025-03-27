addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

async function decodeURIIfEncoded(url) {
    try {
        return decodeURI(url);
    } catch (error) {
        return url;
    }
}

async function handleRequest(request) {
    const url = new URL(request.url);
    const targetUrl = decodeURIIfEncoded(url.searchParams.get('url'));
    const referer = decodeURIIfEncoded(url.searchParams.get('referer'));
    const userAgent = url.searchParams.get('user-agent');
    const shouldRedirect = url.searchParams.get('redirect') === '1';

    if (!targetUrl)
        return new Response('Missing parameter "url"', { status: 400 });

    try {
        // Simulate browser headers to avoid bot detection
        const browserHeaders = {
            'User-Agent': userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,es;q=0.9,en;q=0.8',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Referer': referer || 'https://www.google.com/', 
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1'
        };

        // First fetch to resolve redirections
        let response = await fetch(targetUrl, {
            redirect: 'manual',
            headers: browserHeaders
        });

        // Get final URL after redirections
        let finalUrl = response.headers.get('location') || targetUrl;
        finalUrl = cleanUrl(finalUrl);

        // Handle cases where Facebook detects a bot
        if (finalUrl.includes('unsupportedbrowser')) {
            response = await fetch(targetUrl, {
                redirect: 'manual',
                headers: {
                    ...browserHeaders,
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive'
                }
            });
            finalUrl = response.headers.get('location') || targetUrl;
            finalUrl = cleanUrl(finalUrl);
        }

        // Handle Google CAPTCHA and get URL from HTML
        if (finalUrl.includes('google.com/sorry')) {
            response = await fetch(targetUrl, {
                redirect: 'manual',
                headers: browserHeaders
            });
            const html = await response.text();
            const match = html.match(/URL: (.+?)<br>/);
            finalUrl = match ? match[1] : targetUrl;
            finalUrl = cleanUrl(finalUrl);
        }


        // If redirect=1 parameter is present, perform actual redirect
        if (shouldRedirect) {
            return Response.redirect(finalUrl, 302);
        }

        // Return JSON response with cleaned URL
        return new Response(JSON.stringify({ 
            cleaned_url: finalUrl,
            status: 'success'
        }), {
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (error) {
        return new Response(JSON.stringify({ 
            error: error.message,
            status: 'error'
        }), { 
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
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
        'igshid', 'ref', '__cft__', '__tn__', 'crid',
        'dib', 'dib_tag', 'keywords', 'qid', 'sprefix',
        'th', 'igsh'
    ];
    paramsToRemove.forEach(param => urlObj.searchParams.delete(param));

    if (urlObj.hostname.includes('.amazon.')) {
        for (const key of urlObj.searchParams.keys())
            if (key.startsWith('__mk_'))
                urlObj.searchParams.delete(key);
        urlObj.searchParams.delete('s');
        urlObj.searchParams.delete('sr');
    }

    // Delete ref= parameter from path
    const pathParts = urlObj.pathname.split('/');
    const cleanedPathParts = pathParts.map(part => {
        if (part.startsWith('ref=')) 
            return '\n';
        return part;
    }).filter(part => part !== '');

    // Rebuild path
    urlObj.pathname = cleanedPathParts.join('/');

    return urlObj.toString();
}