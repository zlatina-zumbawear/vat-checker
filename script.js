const checkBtn = document.getElementById('checkBtn');
const resultDiv = document.getElementById('result');

const REQ_COUNTRY = "BG";
const REQ_NUMBER = "206792586";

async function fetchWithRetry(country, number) {
    const apiUrl = `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${country}/vat/${number}?requesterMs=${REQ_COUNTRY}&requesterVat=${REQ_NUMBER}`;
    
    // We are trying more direct proxies this time
    const proxies = [
        (url) => `https://proxy.cors.sh/${url}`, // Often more stable
        (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
        (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
    ];

    for (let i = 0; i < proxies.length; i++) {
        try {
            const proxyUrl = proxies[i](apiUrl);
            console.log(`Attempting Proxy ${i + 1}...`);
            
            const response = await fetch(proxyUrl);
            
            if (!response.ok) continue;

            const rawData = await response.json();
            // Handle AllOrigins wrapper vs direct JSON
            const data = rawData.contents ? JSON.parse(rawData.contents) : rawData;
            
            return data;
        } catch (err) {
            console.warn(`Proxy ${i + 1} failed.`);
        }
    }
    throw new Error("VIES is not responding. This usually means the EU server is down for maintenance or all free proxies are currently blocked.");
}

checkBtn.addEventListener('click', async () => {
    const country = document.getElementById('country').value;
    const inputNumber = document.getElementById('vatNumber').value.trim();
    const cleanNumber = inputNumber.replace(/[^a-zA-Z0-9]/g, '').replace(new RegExp(`^${country}`, 'i'), '');

    if (!cleanNumber) {
        alert("Please enter a VAT number.");
        return;
    }

    checkBtn.disabled = true;
    checkBtn.innerText = "Verifying...";
    resultDiv.style.display = 'none';

    try {
        const data = await fetchWithRetry(country, cleanNumber);

        resultDiv.style.display = 'block';
        if (data.isValid) {
            resultDiv.className = 'valid';
            resultDiv.innerHTML = `<strong>✓ VALID</strong><br>Name: ${data.name || 'N/A'}<br>Address: ${data.address || 'N/A'}`;
        } else {
            resultDiv.className = 'invalid';
            resultDiv.innerHTML = `<strong>✗ INVALID</strong><br>${data.userError || 'Not found.'}`;
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
