const checkBtn = document.getElementById('checkBtn');
const btnText = document.getElementById('btnText');
const loader = document.getElementById('loader');
const resultDiv = document.getElementById('result');
const countrySelect = document.getElementById('country');
const vatInput = document.getElementById('vatNumber');

// Your Bulgarian Company Info (Kept for UI/Consistency)
const REQ_COUNTRY = "BG";
const REQ_NUMBER = "206792586";

// ApyHub Authentication
const APY_TOKEN = "APY0VusXC3QXne41vyimEWcZd6GcUV6BFgWizYsldAbo5J65J2bxrdK7Y4Yt1J3swOjbj";
const API_URL = "https://api.apyhub.com/validate/vat";

/**
 * SMART AUTO-SELECT LOGIC
 * Automatically updates the dropdown if a country code is detected in the input
 */
vatInput.addEventListener('input', (e) => {
    let val = e.target.value.trim().toUpperCase();
    if (val.length >= 2) {
        const potentialCode = val.substring(0, 2);
        // Check if the first 2 chars match any value in our dropdown
        const exists = Array.from(countrySelect.options).some(opt => opt.value === potentialCode);
        if (exists) {
            countrySelect.value = potentialCode;
        }
    }
});

/**
 * Validates VAT using the ApyHub API.
 */
async function validateWithApyHub(fullVat) {
    try {
        if (btnText) btnText.innerText = `Syncing with VIES (attempt 1)...`;

        const timestampedUrl = `${API_URL}?t=${Date.now()}`;

        const response = await fetch(timestampedUrl, {
            method: 'POST',
            headers: {
                'apy-token': APY_TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ vat: fullVat })
        });

        if (!response.ok) {
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
    const country = countrySelect.value;
    let rawInput = vatInput.value.trim().toUpperCase();

    if (!country) return alert("Please select a Member State.");
    
    // 1. Strip everything except letters and numbers
    let cleanInput = rawInput.replace(/[^A-Z0-9]/g, '');

    // 2. Ensure we have a "Full VAT" (Country + Numbers)
    // If the user didn't type the country code, add it from the dropdown
    let fullVatCode;
    if (cleanInput.startsWith(country)) {
        fullVatCode = cleanInput;
    } else {
        fullVatCode = country + cleanInput;
    }

    // 3. Basic length check (Country code 2 + at least 5 digits)
    if (fullVatCode.length < 7) {
        if (resultDiv) {
            resultDiv.style.display = 'block';
            resultDiv.className = 'invalid';
            resultDiv.innerHTML = `<strong>✗ INVALID FORMAT</strong><br>The VAT number is too short.`;
        }
        return;
    }

    // UI State: Loading
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
            resultDiv.innerHTML = `<strong>Status:</strong> ${e.message}. The service is busy, please retry in 10s.`;
        }
    } finally {
        checkBtn.disabled = false;
        if (loader) loader.style.display = 'none';
        if (btnText) btnText.innerText = "Verify VAT Number";
    }
});
