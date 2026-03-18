const checkBtn = document.getElementById('checkBtn');
const resultDiv = document.getElementById('result');

// Your company info (The Requester)
const REQ_COUNTRY = "BG";
const REQ_NUMBER = "206792586";

/**
 * Tries multiple proxies to find one that works.
 * This bypasses the 522/403 errors by rotating the "bridge".
 */
async function fetchWithRetry(country, number) {
    const apiUrl = `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${country}/vat/${number}?requesterMs=${REQ_COUNTRY}&requesterVat=${REQ_NUMBER}`;
    
    const proxies = [
        (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
        (url) => `https://thingproxy.freeboard.io/fetch/${url}`
    ];

    for (let i = 0; i < proxies.length; i++) {
        try {
            const proxyUrl = proxies[i](apiUrl);
            console.log(`Trying Proxy ${i + 1}...`);
            
            const response = await fetch(proxyUrl, { method: 'GET' });
            if (!response.ok) continue;

            const rawData = await response.json();
            
            // AllOrigins wraps the data in a "contents" string, others don't.
            const data = rawData.contents ? JSON.parse(rawData.contents) : rawData;
            
            return data;
        } catch (err) {
            console.warn(`Proxy ${i + 1} failed, trying next...`);
        }
    }
    throw new Error("All proxy servers are currently timed out. VIES might be under maintenance.");
}

checkBtn.addEventListener('click', async () => {
    const country = document.getElementById('country').value;
    const inputNumber = document.getElementById('vatNumber').value.trim();
    
    // Clean input: remove "DE", spaces, or dots
    const cleanNumber = inputNumber.replace(/[^a-zA-Z0-9]/g, '').replace(new RegExp(`^${country}`, 'i'), '');

    if (!cleanNumber) {
        alert("Please enter a VAT number.");
        return;
    }

    // UI Updates
    checkBtn.disabled = true;
    checkBtn.innerText = "Verifying (Trying Bridges)...";
    resultDiv.style.display = 'none';

    try {
        const data = await fetchWithRetry(country, cleanNumber);

        resultDiv.style.display = 'block';
        if (data.isValid) {
            resultDiv.className = 'valid';
            resultDiv.innerHTML = `
                <div style="font-size: 1.1em; margin-bottom: 8px;"><strong>✓ VALID VAT NUMBER</strong></div>
                <strong>Name:</strong> ${data.name || 'Not Disclosed'}<br>
                <strong>Address:</strong> ${data.address ? data.address.replace(/\n/g, ', ') : 'Not Disclosed'}<br>
                <small style="margin-top:10px; display:block; color:#666;">Consultation: ${data.requestIdentifier || 'Verified'}</small>
            `;
        } else {
            resultDiv.className = 'invalid';
            resultDiv.innerHTML = `<strong>✗ INVALID</strong><br>${data.userError || 'The number is not active or correctly formatted.'}`;
        }
    } catch (error) {
        resultDiv.style.display = 'block';
        resultDiv.className = 'invalid';
        resultDiv.innerHTML = `<strong>Connection Error:</strong> ${error.message}`;
    } finally {
        checkBtn.disabled = false;
        checkBtn.innerText = "Verify VAT Number";
    }
});