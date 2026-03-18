const checkBtn = document.getElementById('checkBtn');
const btnText = document.getElementById('btnText');
const loader = document.getElementById('loader');
const resultDiv = document.getElementById('result');

// Your Bulgarian Company Info (Kept for UI/Consistency)
const REQ_COUNTRY = "BG";
const REQ_NUMBER = "206792586";

// ApyHub Authentication - DOUBLE CHECK THIS TOKEN IN YOUR DASHBOARD
const APY_TOKEN = "APY0VusXC3QXne41vyimEWcZd6GcUV6BFgWizYsldAbo5J65J2bxrdK7Y4Yt1J3swOjbj";
const API_URL = "https://api.apyhub.com/validate/vat";

/**
 * Validates VAT using the ApyHub API.
 * This API is more stable but only returns a boolean (true/false).
 */
async function validateWithApyHub(fullVat) {
    try {
        // Force the UI to show the attempt immediately
        if (btnText) btnText.innerText = `Syncing with VIES (attempt 1)...`;

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apy-token': APY_TOKEN.trim() // Added trim() to prevent hidden space errors
            },
            body: JSON.stringify({ vat: fullVat })
        });

        if (response.status === 401) {
            throw new Error("Invalid API Token. Please check your ApyHub credentials.");
        }

        if (!response.ok) {
            throw new Error(`Server Error ${response.status}`);
        }

        const result = await response.json();
        return result.data;

    } catch (err) {
        console.error("Detailed API Error:", err);
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
            resultDiv.innerHTML = `<strong>Error:</strong> ${e.message}`;
        }
    } finally {
        checkBtn.disabled = false;
        if (loader) loader.style.display = 'none';
        if (btnText) btnText.innerText = "Verify VAT Number";
    }
});
