const checkBtn = document.getElementById('checkBtn');
const btnText = document.getElementById('btnText');
const loader = document.getElementById('loader');
const resultDiv = document.getElementById('result');

// Your Bulgarian Company Info (Kept for UI/Consistency)
const REQ_COUNTRY = "BG";
const REQ_NUMBER = "206792586";

// ApyHub Authentication
const APY_TOKEN = "APY0VusXC3QXne41vyimEWcZd6GcUV6BFgWizYsldAbo5J65J2bxrdK7V4Yt1J3swOjbj";
const API_URL = "https://api.apyhub.com/validate/vat";

/**
 * Validates VAT using the ApyHub API.
 */
async function validateWithApyHub(fullVat) {
    try {
        if (btnText) btnText.innerText = `Syncing with VIES (attempt 1)...`;

        // Debugging: This helps you see if the token is correct in the console
        console.log("Sending request with token:", APY_TOKEN);

        const response = await fetch(API_URL, {
            method: 'POST',
            mode: 'cors', // Explicitly ask for CORS mode
            headers: {
                'Content-Type': 'application/json',
                'apy-token': APY_TOKEN.trim() 
            },
            body: JSON.stringify({ "vat": fullVat })
        });

        if (!response.ok) {
            // If we get a 401, it will show here
            throw new Error(`API Response: ${response.status}`);
        }

        const result = await response.json();
        return result.data;

    } catch (err) {
        console.error("Connection Error:", err);
        throw err;
    }
}

checkBtn.addEventListener('click', async () => {
    const country = document.getElementById('country').value;
    const vatInput = document.getElementById('vatNumber').value.trim();

    if (!country) return alert("Please select a Member State.");
    
    // Combine country code and number for ApyHub
    const cleanNumberOnly = vatInput.replace(/[^a-zA-Z0-9]/g, '').replace(new RegExp(`^${country}`, 'i'), '');
    const fullVatCode = country + cleanNumberOnly;
    
    if (!cleanNumberOnly || cleanNumberOnly.length < 5) {
        if (resultDiv) {
            resultDiv.style.display = 'block';
            resultDiv.className = 'invalid';
            resultDiv.innerHTML = `<strong>✗ INVALID FORMAT</strong><br>The VAT number is too short.`;
        }
        return;
    }

    checkBtn.disabled = true;
    if (loader) loader.style.display = 'block';
    if (resultDiv) resultDiv.style.display = 'none';

    try {
        const isValid = await validateWithApyHub(fullVatCode);
        
        if (resultDiv) {
            resultDiv.style.display = 'block';
            if (isValid === true) {
                resultDiv.className = 'valid';
                resultDiv.innerHTML = `<strong>✓ VALID VAT</strong><br>This VAT number is registered and active.`;
            } else {
                resultDiv.className = 'invalid';
                resultDiv.innerHTML = `<strong>✗ ATTENTION</strong><br>This VAT number is not valid or is inactive.`;
            }
        }
    } catch (e) {
        if (resultDiv) {
            resultDiv.style.display = 'block';
            resultDiv.className = 'invalid';
            // Show the actual error message so we can debug it
            resultDiv.innerHTML = `<strong>Status:</strong> ${e.message}. Please check API credentials.`;
        }
    } finally {
        checkBtn.disabled = false;
        if (loader) loader.style.display = 'none';
        if (btnText) btnText.innerText = "Verify VAT Number";
    }
});
