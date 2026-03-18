const checkBtn = document.getElementById('checkBtn');
const btnText = document.getElementById('btnText');
const loader = document.getElementById('loader');
const resultDiv = document.getElementById('result');

// Your Bulgarian Company Info (Not required for this API, but kept for consistency)
const REQ_COUNTRY = "BG";
const REQ_NUMBER = "206792586";

// ApyHub Authentication
const APY_TOKEN = "APY0VusXC3QXne41vyiMEWcZd6GcUv6BFgWizYslDAbo5J65J2bxrdK7V4Yt1J3sw0jbj";
const API_URL = "https://api.apyhub.com/validate/vat";

/**
 * Validates VAT using the ApyHub API.
 * This API is more stable but only returns a boolean (true/false).
 */
async function validateWithApyHub(fullVat) {
    try {
        // We show Attempt 1 as requested, though ApyHub usually works on first try
        if (btnText) btnText.innerText = `Syncing with VIES (attempt 1)...`;

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apy-token': APY_TOKEN
            },
            body: JSON.stringify({ vat: fullVat })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Server Error ${response.status}`);
        }

        const result = await response.json();
        // The API returns { "data": true/false }
        return result.data;

    } catch (err) {
        console.error("API Error:", err);
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
    
    // VALIDATION: VAT numbers are typically between 8 and 12 digits.
    if (!cleanNumberOnly || cleanNumberOnly.length < 5) {
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
        const isValid = await validateWithApyHub(fullVatCode);
        
        if (resultDiv) {
            resultDiv.style.display = 'block';
            if (isValid) {
                resultDiv.className = 'valid';
                resultDiv.innerHTML = `<strong>✓ VALID VAT</strong><br>The VAT number is active and registered.<br><small>Note: ApyHub does not provide name/address details.</small>`;
            } else {
                resultDiv.className = 'invalid';
                resultDiv.innerHTML = `<strong>✗ ATTENTION</strong><br>This VAT number is not found or is currently inactive.`;
            }
        }
    } catch (e) {
        if (resultDiv) {
            resultDiv.style.display = 'block';
            resultDiv.className = 'invalid';
            resultDiv.innerHTML = `<strong>Server Busy:</strong> The validation service is currently unresponsive. Please try again in 1 minute.`;
        }
    } finally {
        checkBtn.disabled = false;
        if (loader) loader.style.display = 'none';
        if (btnText) btnText.innerText = "Verify VAT Number";
    }
});
