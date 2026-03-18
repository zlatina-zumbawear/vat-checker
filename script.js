const checkBtn = document.getElementById('checkBtn');
const btnText = document.getElementById('btnText');
const loader = document.getElementById('loader');
const resultDiv = document.getElementById('result');

const REQ_COUNTRY = "BG";
const REQ_NUMBER = "206792586";

// Error Translation Dictionary
const VIES_ERRORS = {
    'MS_MAX_CONCURRENT_REQ': 'The country database is currently overloaded. Please wait 10 seconds and try again.',
    'MS_UNAVAILABLE': 'The selected country database is temporarily offline for maintenance.',
    'SERVICE_UNAVAILABLE': 'The VIES gateway is busy. Please try again in a moment.',
    'TIMEOUT': 'The connection timed out. The EU servers are responding slowly today.',
    'INVALID_INPUT': 'The VAT number format is incorrect for this country.'
};

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
            // Reverted to your preferred message style
            if (btnText) btnText.innerText = `Syncing with VIES (attempt ${i + 1})...`;
            
            const response = await fetchWithTimeout(proxies[i](apiUrl), { method: 'GET' }, 30000);
            
            if (!response.ok) continue;

            const resData = await response.json();
            const data = resData.contents ? JSON.parse(resData.contents) : resData;
            
            // If the API returns a technical error string instead of a valid/invalid status
            if (data.userError && VIES_ERRORS[data.userError]) {
                data.friendlyError = VIES_ERRORS[data.userError];
            }
            
            return data;
        } catch (err) {
            lastError = err.name === 'AbortError' ? "Timeout" : err.message;
        }
    }
    throw new Error(lastError);
}

checkBtn.addEventListener('click', async () => {
    const country = document.getElementById('country').value;
    const vatInput = document.getElementById('vatNumber').value.trim();

    if (!country) return alert("Please select a Member State.");
    
    const cleanNumber = vatInput.replace(/[^a-zA-Z0-9]/g, '').replace(new RegExp(`^${country}`, 'i'), '');
    
    // VALIDATION: VAT numbers are typically between 8 and 12 digits.
    if (!cleanNumber || cleanNumber.length < 8) {
        if (resultDiv) {
            resultDiv.style.display = 'block';
            resultDiv.className = 'invalid';
            resultDiv.innerHTML = `<strong>✗ INVALID FORMAT</strong><br>The VAT number is too short. Please check the digits.`;
        }
        return;
    }

    // UI State
    checkBtn.disabled = true;
    if (loader) loader.style.display = 'block';
    if (resultDiv) resultDiv.style.display = 'none';

    try {
        const data = await fetchWithRetry(country, cleanNumber);
        if (resultDiv) {
            resultDiv.style.display = 'block';
            if (data.isValid) {
                resultDiv.className = 'valid';
                resultDiv.innerHTML = `<strong>✓ VALID VAT</strong><br>${data.name || 'Company Name Restricted'}<br>${data.address || ''}`;
            } else {
                resultDiv.className = 'invalid';
                const displayError = data.friendlyError || data.userError || 'Number not found in EU database.';
                resultDiv.innerHTML = `<strong>✗ ATTENTION</strong><br>${displayError}`;
            }
        }
    } catch (e) {
        if (resultDiv) {
            resultDiv.style.display = 'block';
            resultDiv.className = 'invalid';
            resultDiv.innerHTML = `<strong>Server Busy:</strong> The VIES system is currently overloaded. Please try again in 1 minute.`;
        }
    } finally {
        checkBtn.disabled = false;
        if (loader) loader.style.display = 'none';
        if (btnText) btnText.innerText = "Verify VAT Number";
    }
});
