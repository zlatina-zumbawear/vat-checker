const checkBtn = document.getElementById('checkBtn');
const btnText = document.getElementById('btnText');
const loader = document.getElementById('loader');
const resultDiv = document.getElementById('result');

const REQ_COUNTRY = "BG";
const REQ_NUMBER = "206792586";

async function fetchWithTimeout(url, options, timeout = 30000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

async function fetchWithRetry(country, number) {
    const apiUrl = `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${country}/vat/${number}?requesterMs=${REQ_COUNTRY}&requesterVat=${REQ_NUMBER}&_t=${Date.now()}`;
    
    const proxies = [
        (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
        (url) => `https://thingproxy.freeboard.io/fetch/${url}`
    ];

    let lastError = "";

    for (let i = 0; i < proxies.length; i++) {
        try {
            const proxyUrl = proxies[i](apiUrl);
            btnText.innerText = `Attempting connection ${i+1}...`;
            
            const response = await fetchWithTimeout(proxyUrl, { method: 'GET' }, 30000);
            if (!response.ok) continue;

            const wrapper = await response.json();
            const data = wrapper.contents ? JSON.parse(wrapper.contents) : wrapper;
            return data;
        } catch (err) {
            lastError = err.name === 'AbortError' ? "Timeout" : err.message;
        }
    }
    throw new Error(lastError);
}

checkBtn.addEventListener('click', async () => {
    const country = document.getElementById('country').value;
    const inputNumber = document.getElementById('vatNumber').value.trim();

    if (!country) return alert("Please select a country.");
    const cleanNumber = inputNumber.replace(/[^a-zA-Z0-9]/g, '').replace(new RegExp(`^${country}`, 'i'), '');
    if (!cleanNumber) return alert("Please enter a VAT number.");

    // Set Loading State
    checkBtn.disabled = true;
    loader.style.display = 'block';
    btnText.innerText = "Verifying...";
    resultDiv.style.display = 'none';

    try {
        const data = await fetchWithRetry(country, cleanNumber);
        resultDiv.style.display = 'block';
        if (data.isValid) {
            resultDiv.className = 'valid';
            resultDiv.innerHTML = `<strong>✓ VALID VAT</strong><br>${data.name || 'Company Name Restricted'}<br>${data.address || ''}`;
        } else {
            resultDiv.className = 'invalid';
            resultDiv.innerHTML = `<strong>✗ INVALID</strong><br>${data.userError || 'Not found.'}`;
        }
    } catch (error) {
        resultDiv.style.display = 'block';
        resultDiv.className = 'invalid';
        resultDiv.innerHTML = `<strong>Server Busy:</strong> The EU database is currently timing out. Please try again in a few minutes.`;
    } finally {
        checkBtn.disabled = false;
        loader.style.display = 'none';
        btnText.innerText = "Verify VAT Number";
    }
});
