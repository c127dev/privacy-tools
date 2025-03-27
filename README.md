# Privacy Toolkit  
*A shield against tracking, it's my privacy and it's my right to have it respected*  

[![Badge License]][License] 
[![Badge Cloudflare Worker]][Cloudflare Worker] 
[![Badge Tampermonkey]][Tampermonkey] 
[![Badge Issues]][Issues] 

## 📖 Overview  
This project combats pervasive link tracking across services. It combines:  
1. **Cloudflare Worker**: Resolves redirects (302/301) and scrubs tracking parameters without exposing your IP.  
2. **Tampermonkey Script**: Automatically de-tracks URLs in Services Online in real time.  

## ✨ Features  
- **IP Masking**: Redirects via Cloudflare to prevent Services from logging your IP.  
- **Parameter Scrubbing**: Removes `fbclid`, `rdid`, `share_url`, and other trackers.  
- **Real-Time DOM Cleaning**: Blocks from re-adding tracking URLs after page updates.  
- **Open Source**: Self-hostable, customizable, and transparent.  

## 🛠 How It Works  

### 🔗 Cloudflare Worker  
Intercepts requests to tracking URLs, resolves redirects, and returns clean URLs:  

```javascript  
// Simple Example Worker Logic
async function handleRequest(request) {  
  const url = getUrlParam(request);  
  const response = await fetch(url, { headers: fakeBrowserHeaders });  
  const finalUrl = cleanUrl(response.headers.get('location'));  
  return new Response(finalUrl);  
}
```  

### 🐒 Tampermonkey Script  
Runs on Multiple Services (Meta Services), detecting and rewriting tracking links:  

```javascript  
// DOM Mutation Observer  
new MutationObserver(() => {  
  document.querySelectorAll('a[href*="l.messenger.com"]').forEach(link => {  
    link.href = decodeTrackingUrl(link.href);  
  });  
}).observe(document.body, { childList: true });  
```  


## 🚀 Setup  

### 1. Deploy Cloudflare Worker  
- **Requirements**: Cloudflare account, Node.js, Wrangler CLI.  
- **Steps**:  

```bash  
git clone https://github.com/c127dev/privacy-tools.git  
cd privacy-tools/worker  
wrangler deploy  
```  

### 2. Install Tampermonkey Script  
- **Requirements**: Tampermonkey extension ([Chrome][Chrome Tampermonkey], [Firefox][Firefox Tampermonkey]).  
- **Steps**:  
  - Copy [untracker.js](tampermonkey/untracker.js).  
  - Open Tampermonkey Dashboard > **+** New Script.  
  - Paste and configure `CLOUDFLARE_WORKER_URL`

## ⚙️ Configuration  

### Environment Variables (Worker)  
| Variable          | Description                          | Example Value                              |  
|-------------------|--------------------------------------|--------------------------------------------|  
| `FACEBOOK_UA`     | User-Agent to mimic browsers        | `Mozilla/5.0 (Windows NT 10.0; Win64````  |  
| `ALLOWED_DOMAINS` | Restrict to specific domains        | `messenger.com,facebook.com`              |  

## 💻 Usage  

### Test via cURL  
```bash  
curl "https://YOUR_WORKER.workers.dev/?url=https://l.messenger.com/l.php?u=https://example.com"  
```  
**Response**:  
```json  
{ "cleaned_url": "https://example.com" }  
```  

### In Messenger  
Just browse normally. The script auto-detects and cleans URLs:  
- **Before**: `https://l.messenger.com/l.php?u=https%3A%2F%2Fexample.com&h=ABC123`  
- **After**: `https://example.com`  


## 🤝 Contributing  
1. Fork the repository.  
2. Submit PRs to:  
   - Add support for Instagram/Twitter/Google/Amazon tracking.  
   - Improve header spoofing in the Worker.  
3. Report bugs via [Issues].  

## 📜 License  
MIT License. See [LICENSE](LICENSE).  

## 🙌 Acknowledgments  
- Cloudflare Workers for serverless edge computing.  
- Tampermonkey for enabling client-side privacy hacks.  

<!----------------------------------------------------------------------------->
[License]: LICENSE
[Tampermonkey]: https://www.tampermonkey.net/
[Cloudflare Worker]: https://workers.cloudflare.com/
[Issues]: https://github.com/c127dev/privacy-tools/issues

[Chrome Tampermonkey]: https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo
[Firefox Tampermonkey]: https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/

<!----------------------------------{ Badges }--------------------------------->

[Badge License]: https://img.shields.io/github/license/c127dev/privacy-tools
[Badge Cloudflare Worker]: https://img.shields.io/badge/Cloudflare-Workers-orange
[Badge Issues]: https://img.shields.io/github/issues/c127dev/privacy-tools
[Badge Tampermonkey]: https://img.shields.io/badge/Tampermonkey-Script-green