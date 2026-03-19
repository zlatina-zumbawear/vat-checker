const checkBtn = document.getElementById('checkBtn');
const btnText = document.getElementById('btnText');
const loader = document.getElementById('loader');
const resultDiv = document.getElementById('result');
const countrySelect = document.getElementById('country');
const vatInput = document.getElementById('vatNumber');

// ApyHub Authentication
const APY_TOKEN = "APY0VusXC3QXne41vyimEWcZd6GcUV6BFgWizYsldAbo5J65J2bxrdK7Y4Yt1J3swOjbj";
const API_URL = "https://api.apyhub.com/validate/vat";

/**
 * SMART AUTO-SELECT & FORMATTING
 * UI automatically reflects the first 2 letters if they match a country
 */
vatInput.addEventListener('input', (e) => {
    let val = e.target.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    e.target.value = val; 

    if (val.length >= 2) {
        const potentialCode = val.substring(0, 2);
        const exists = Array.from(countrySelect.options).some(opt => opt.value === potentialCode);
        if (exists) {
            countrySelect.value = potentialCode;
        }
    }
});

/**
 * SHOW ERROR IN RED BOX
 * Standardizes all feedback to the UI result div
 */
function showError(message) {
    resultDiv.style.display = 'block';
    resultDiv.className = 'invalid';
    resultDiv.innerHTML = `<strong>✗ FORMAT ERROR</strong><br>${message}`;
}

/**
 * VALIDATION FUNCTION
 */
function validateVatFormat(input) {
    const cleanVat = input.replace(/[^A-Z0-9]/g, '');

    // 1. Check if it has at least the 2-letter country code
    if (cleanVat.length < 2) {
        return { isValid: false, message: "Please enter a VAT number including the country code (e.g. BG...)" };
    }

    const countryCode = cleanVat.substring(0, 2);
    const countryExists = Array.from(countrySelect.options).some(opt => opt.value === countryCode);

    // 2. Validate the Country Code prefix
    if (!countryExists) {
        return { isValid: false, message: `"${countryCode}" is not a valid EU Member State code.` };
    }

    // 3. Length check (Standard 11: 2 letters + 9 numbers)
    if (cleanVat.length !== 11) {
        return { isValid: false, message: "VAT must be exactly 11 characters (e.g. DE123456789)" };
    }

    // 4. Pattern check: 2 Letters followed by 9 Numbers
    const regex = /^[A-Z]{2}[0-9]{9}$/;
    if (!regex.test(cleanVat)) {
        return { isValid: false, message: "Invalid format. Expected 2 letters followed by 9 numbers." };
    }

    return { isValid: true, fullVat: cleanVat, country: countryCode };
}

async function validateWithApyHub(fullVat) {
    try {
        if (btnText) btnText.innerText = `Syncing with VIES...`;
        const timestampedUrl = `${API_URL}?t=${Date.now()}`;
        const response = await fetch(timestampedUrl, {
            method: 'POST',
            headers: {
                'apy-token': APY_TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ vat: fullVat })
        });
        if (!response.ok) throw new Error(`API Status: ${response.status}`);
        const result = await response.json();
        return result.data;
    } catch (err) {
        throw err;
    }
}

checkBtn.addEventListener('click', async () => {
    const rawInput = vatInput.value;

    // PERFORM LOCAL VALIDATION
    const validation = validateVatFormat(rawInput);

    if (!validation.isValid) {
        showError(validation.message);
        return;
    }

    // Sync dropdown visually if it hasn't already
    countrySelect.value = validation.country;

    // UI State: Loading
    checkBtn.disabled = true;
    loader.style.display = 'block';
    resultDiv.style.display = 'none';

    try {
        const isRegistered = await validateWithApyHub(validation.fullVat);
        
        resultDiv.style.display = 'block';
        if (isRegistered === true) {
            resultDiv.className = 'valid';
            resultDiv.innerHTML = `<strong>✓ VALID VAT</strong><br>${validation.fullVat} is active and registered.`;
        } else {
            resultDiv.className = 'invalid';
            resultDiv.innerHTML = `<strong>✗ NOT FOUND</strong><br>${validation.fullVat} is not registered or is inactive.`;
        }
    } catch (e) {
        showError("Service busy or connection lost. Please retry in 10s.");
    } finally {
        checkBtn.disabled = false;
        loader.style.display = 'none';
        btnText.innerText = "Verify VAT Number";
    }
});
