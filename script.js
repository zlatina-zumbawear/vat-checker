const checkBtn = document.getElementById('checkBtn');
const resultDiv = document.getElementById('result');

// Your Bulgarian Company Info
const REQ_COUNTRY = "BG";
const REQ_NUMBER = "206792586";

/**
 * Tries multiple bridges to reach the EU VIES server.
 * Includes a timestamp to prevent the browser from "instantly" 
 * returning a cached timeout error.
 */
async function fetchWithRetry(country, number) {
    // Adding Date.now() makes the URL unique so the browser CANNOT cache the failure
    const apiUrl = `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${country}/vat/${number}?requesterMs=${REQ_COUNTRY}&requesterVat=${REQ_NUMBER}&_t=${Date.now()}`;
    
    const proxies = [
        (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
        (url) => `https://thingproxy.freeboard.io/fetch/${url}`
    ];

    for (let i = 0; i < proxies.length; i++) {
        try {
            const proxyUrl = proxies[i](apiUrl);
            console.log(`Connection attempt ${i + 1} of ${proxies.length}...`);
            
            const response = await fetch(proxyUrl);
            if (!response.ok) continue;

            const rawData = await response.json();
            
            // Handle different proxy response formats
            const data = rawData.contents ? JSON.parse(rawData.contents) : rawData;
            
            return data;
        } catch (err) {
            console.warn(`Bridge ${i + 1} failed, trying next...`);
        }
    }
    throw new Error("All connection bridges are timed out. This usually means the EU VIES service is down for maintenance.");
}

checkBtn.addEventListener('click', async () => {
    const country = document.getElementById('country').value;
    const inputNumber = document.getElementById('vatNumber').value.trim();
    
    // Clean the number: remove spaces, dots, and the country prefix if typed
    const cleanNumber = inputNumber.replace(/[^a-zA-Z0-9]/g, '').replace(new RegExp(`^${country}`, 'i'), '');

    if (!cleanNumber) {
        alert("Please enter a VAT number.");
        return;
    }

    // UI Feedback
    checkBtn.disabled = true;
    checkBtn.innerText = "Connecting to EU Servers...";
    resultDiv.style.display = 'none';

    try {
        const data = await fetchWithRetry(country, cleanNumber);

        resultDiv.style.display = 'block';
        if (data.isValid) {
            resultDiv.className = 'valid';
            resultDiv.innerHTML = `
                <div style="font-size: 1.1em; margin-bottom: 5px;"><strong>✓ VALID VAT NUMBER</strong></div>
                <strong>Name:</strong> ${data.name || 'Not Disclosed (Privacy)'}<br>
                <strong>Address:</strong> ${data.address ? data.address.replace(/\n/g, ', ') : 'Not Disclosed'}<br>
                <small style="display:block; margin-top:10px; color:#666;">Request ID: ${data.requestIdentifier || 'Verified'}</small>
            `;
        } else {
            resultDiv.className = 'invalid';
            resultDiv.innerHTML = `<strong>✗ INVALID</strong><br>${data.userError || 'The number is not active or formatted incorrectly.'}`;
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
