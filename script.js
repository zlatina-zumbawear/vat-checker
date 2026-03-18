const checkBtn = document.getElementById('checkBtn');
const btnText = document.getElementById('btnText');
const loader = document.getElementById('loader');
const resultDiv = document.getElementById('result');

const REQ_COUNTRY = "BG";
const REQ_NUMBER = "206792586";

async function fetchWithTimeout(url, options, timeout = 30000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timer);
        return response;
    } catch (e) {
        clearTimeout(timer);
        throw e;
    }
}

async function fetchWithRetry(country, number) {
    const apiUrl = `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${country}/vat/${number}?requesterMs=${REQ_COUNTRY}&requesterVat=${REQ_NUMBER}&_t=${Date.now()}`;
    
    const proxies = [
        (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
        (url) => `https://thingproxy.freeboard.io/fetch/${url}`
    ];

    let lastError = "Connection failed";

    for (let i = 0; i < proxies.length; i++) {
        try {
            if (btnText) btnText.innerText = `Bridge ${i+1}...`;
            const response = await fetchWithTimeout(proxies[i](apiUrl), { method: 'GET' }, 30000);
            
            if (!response.ok) continue;

            const resData = await response.json();
            return resData.contents ? JSON.parse(resData.contents) : resData;
        } catch (err) {
            lastError = err.name === 'AbortError' ? "Timeout" : err.message;
        }
    }
    throw new Error(lastError);
}

checkBtn.addEventListener('click', async () => {
    const country = document.getElementById('country').value;
    const vatInput = document.getElementById('vatNumber').value.trim();

    if (!country) return alert("Select a country.");
    const cleanNumber = vatInput.replace(/[^a-zA-Z0-9]/g, '').replace(new RegExp(`^${country}`, 'i'), '');
    if (!cleanNumber) return alert("Enter VAT number.");

    // UI State
    checkBtn.disabled = true;
    if (loader) loader.style.display = 'block';
    if (btnText) btnText.innerText = "Verifying...";
    if (resultDiv) resultDiv.style.display = 'none';

    try {
        const data = await fetchWithRetry(country, cleanNumber);
        if (resultDiv) {
            resultDiv.style.display = 'block';
            if (data.isValid) {
                resultDiv.className = 'valid';
                resultDiv.innerHTML = `<strong>✓ VALID</strong><br>${data.name || 'Private'}<br>${data.address || ''}`;
            } else {
                resultDiv.className = 'invalid';
                resultDiv.innerHTML = `<strong>✗ INVALID</strong><br>${data.userError || 'Not found.'}`;
            }
        }
    } catch (e) {
        if (resultDiv) {
            resultDiv.style.display = 'block';
            resultDiv.className = 'invalid';
            resultDiv.innerHTML = `<strong>Busy:</strong> EU server didn't respond. Try again in 1 min.`;
        }
    } finally {
        checkBtn.disabled = false;
        if (loader) loader.style.display = 'none';
        if (btnText) btnText.innerText = "Verify VAT Number";
    }
});
