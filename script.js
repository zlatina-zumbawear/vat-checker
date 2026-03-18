const checkBtn = document.getElementById('checkBtn');
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
    // Timestamp (_t) kills the "instant 408" cache issue
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
            console.log(`Bridge ${i + 1}: Waiting up to 30s...`);
            
            // We force a 30s wait here
            const response = await fetchWithTimeout(proxyUrl, { method: 'GET' }, 30000);
            
            if (!response.ok) {
                lastError = `Proxy ${i+1} returned ${response.status}`;
                continue;
            }

            const wrapper = await response.json();
            const data = wrapper.contents ? JSON.parse(wrapper.contents) : wrapper;
            
            return data;
        } catch (err) {
            if (err.name === 'AbortError') {
                console.warn(`Bridge ${i + 1} timed out after 30s.`);
            } else {
                console.warn(`Bridge ${i + 1} failed: ${err.message}`);
            }
            lastError = err.message;
        }
    }
    throw new Error(`All bridges failed. Last error: ${lastError}`);
}

checkBtn.addEventListener('click', async () => {
    const country = document.getElementById('country').value;
    const inputNumber = document.getElementById('vatNumber').value.trim();

    if (!country) return alert("Please select a country first.");
    
    const cleanNumber = inputNumber.replace(/[^a-zA-Z0-9]/g, '').replace(new RegExp(`^${country}`, 'i'), '');

    if (!cleanNumber) return alert("Please enter a VAT number.");

    checkBtn.disabled = true;
    checkBtn.innerText = "Connecting (Waiting up to 30s)...";
    resultDiv.style.display = 'none';

    try {
        const data = await fetchWithRetry(country, cleanNumber);

        resultDiv.style.display = 'block';
        if (data.isValid) {
            resultDiv.className = 'valid';
            resultDiv.innerHTML = `<strong>✓ VALID</strong><br>Name: ${data.name || 'N/A'}<br>Address: ${data.address || 'N/A'}`;
        } else {
            resultDiv.className = 'invalid';
            resultDiv.innerHTML = `<strong>✗ INVALID</strong><br>${data.userError || 'Not found in EU database.'}`;
        }
    } catch (error) {
        resultDiv.style.display = 'block';
        resultDiv.className = 'invalid';
        resultDiv.innerHTML = `<strong>Connection Error:</strong> ${error.message}. <br><br><small>VIES might be down for maintenance or proxies are blocked.</small>`;
    } finally {
        checkBtn.disabled = false;
        checkBtn.innerText = "Verify VAT Number";
    }
});
