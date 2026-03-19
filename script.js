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
 */
vatInput.addEventListener('input', (e) => {
    let val = e.target.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    e.target.value = val; // Force uppercase and no symbols in the UI

    if (val.length >= 2) {
        const potentialCode = val.substring(0, 2);
        const exists = Array.from(countrySelect.options).some(opt => opt.value === potentialCode);
        if (exists) {
            countrySelect.value = potentialCode;
        }
    }
});

/**
 * VALIDATION FUNCTION
 * Returns { isValid: boolean, message: string }
 */
function validateVatFormat(input, selectedCountry) {
    // 1. Basic cleaning
    const cleanVat = input.replace(/[^A-Z0-9]/g, '');

    // 2. Check if it starts with the selected country
    if (!cleanVat.startsWith(selectedCountry)) {
        return { isValid: false, message: `VAT must start with the country code: ${selectedCountry}` };
    }

    // 3. Length check (Standard 11: 2 letters + 9 numbers)
    if (cleanVat.length !== 11) {
        return { isValid: false, message: "VAT must be exactly 11 characters (e.g., DE123456789)" };
    }

    // 4. Pattern check: 2 Letters followed by exactly 9 Numbers
    const regex = /^[A-Z]{2}[0-9]{9}$/;
    if (!regex.test(cleanVat)) {
        return { isValid: false, message: "Invalid format. Expected 2 letters followed by 9 numbers." };
    }

    return { isValid: true, fullVat: cleanVat };
}

/**
 * API CALL
 */
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
    const country = countrySelect.value;
    const rawInput = vatInput.value;

    if (!country) return alert("Please enter a VAT starting with a valid country code.");

    // PERFORM LOCAL VALIDATION BEFORE API CALL
    const validation = validateVatFormat(rawInput, country);

    if (!validation.isValid) {
        resultDiv.style.display = 'block';
        resultDiv.className = 'invalid';
        resultDiv.innerHTML = `<strong>✗ FORMAT ERROR</strong><br>${validation.message}`;
        return;
    }

    // If we passed validation, proceed to API
    checkBtn.disabled = true;
    loader.style.display = 'block';
    resultDiv.style.display = 'none';

    try {
        const isRegistered = await validateWithApyHub(validation.fullVat);
        
        resultDiv.style.display = 'block';
        if (isRegistered === true) {
            resultDiv.className = 'valid';
            resultDiv.innerHTML = `<strong>✓ VALID VAT</strong><br>${validation.fullVat} is active in VIES.`;
        } else {
            resultDiv.className = 'invalid';
            resultDiv.innerHTML = `<strong>✗ NOT FOUND</strong><br>${validation.fullVat} is not registered or is inactive.`;
        }
    } catch (e) {
        resultDiv.style.display = 'block';
        resultDiv.className = 'invalid';
        resultDiv.innerHTML = `<strong>Status:</strong> Service busy. Please retry in 10s.`;
    } finally {
        checkBtn.disabled = false;
        loader.style.display = 'none';
        btnText.innerText = "Verify VAT Number";
    }
});
