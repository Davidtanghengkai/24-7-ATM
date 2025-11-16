let currentStep = 1;
const totalSteps = 5;

const rateText = document.getElementById("rateText");
const summary = document.getElementById("summary");
const resultBox = document.getElementById("result");

let exchangeRate = 0;
let toCurrency = "";
let selectedBankID = null;

// Step navigation
function showStep(step) {
  document.querySelectorAll(".step").forEach(s => s.classList.remove("active"));
  document.getElementById(`step${step}`).classList.add("active");
}
function next() { if (currentStep < totalSteps) showStep(++currentStep); }
function back() { if (currentStep > 1) showStep(--currentStep); }

document.getElementById("next1").onclick = next;
document.getElementById("back2").onclick = back;
document.getElementById("next2").onclick = next;
document.getElementById("back3").onclick = back;
document.getElementById("next3").onclick = next;
document.getElementById("back4").onclick = back;
document.getElementById("next4").onclick = next;
document.getElementById("back5").onclick = back;

// Load countries
async function loadCountries() {
  const countrySelect = document.getElementById("country");
  countrySelect.innerHTML = "<option>Loading...</option>";

  try {
    const res = await fetch("/api/countries");
    const countries = await res.json();

    countrySelect.innerHTML = "";
    countries.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.country;
      opt.textContent = c.country;
      countrySelect.appendChild(opt);
    });
  } catch (err) {
    console.error("Country fetch error:", err);
    countrySelect.innerHTML = "<option>Error loading countries</option>";
  }
}

loadCountries();

// Country selection → fetch banks + detect currency + fetch exchange rate
document.getElementById("country").addEventListener("change", async () => {
  const country = document.getElementById("country").value;
  const bankSelect = document.getElementById("bank");

  bankSelect.innerHTML = "<option>Loading banks...</option>";
  rateText.textContent = "⏳ Detecting currency and exchange rate...";

  try {
    // Fetch banks
    const res = await fetch(`/api/banks/${country}`);
    const banks = await res.json();

    bankSelect.innerHTML = "";

    // Populate dropdown
    banks.forEach(b => {
      const opt = document.createElement("option");
      opt.value = JSON.stringify({ 
        id: b.bankID,
        name: b.bankName,
        country: b.country,
        currency: b.currency
      });
      opt.textContent = b.bankName;
      bankSelect.appendChild(opt);
    });

    // Auto-detect currency from first bank
    const detectedCurrency = banks[0].currency;
    toCurrency = detectedCurrency;

    // Fetch exchange rate
    const rateRes = await fetch(`/api/rate?base=SGD&target=${detectedCurrency}`);
    const rateData = await rateRes.json();

    if (rateData.rate) {
      exchangeRate = rateData.rate;
      rateText.textContent = `💱 1 SGD = ${exchangeRate.toFixed(4)} ${detectedCurrency}`;
    } else {
      exchangeRate = 0;
      rateText.textContent = "⚠️ Failed to fetch exchange rate.";
    }

  } catch (err) {
    console.error("Fetch banks/currency error:", err);
    bankSelect.innerHTML = "<option>Error loading banks</option>";
    rateText.textContent = "⚠️ Could not detect currency/exchange rate.";
  }
});

// --------------------------
// CONFIRM TRANSFER
// --------------------------
document.getElementById("confirmTransfer").addEventListener("click", async () => {
  const bankData = JSON.parse(document.getElementById("bank").value);

  const payload = {
    senderAccountNo: parseInt(document.getElementById("senderAccount").value),
    receiverAccountNo: document.getElementById("receiverAccount").value,
    receiverBankID: bankData.id,
    receiverBankName: bankData.name,
    receiverCountry: bankData.country,
    amount: parseFloat(document.getElementById("amount").value),
    fromCurrency: "SGD",
    toCurrency: bankData.currency
  };

  resultBox.textContent = "⏳ Processing transfer...";

  try {
    const res = await fetch("/api/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (res.ok) {
      resultBox.textContent =
        "Transfer Successful!\n\n" + JSON.stringify(data, null, 2);
    } else {
      resultBox.textContent =
        "Transfer Failed: " + (data.error || data.message);
    }

  } catch (e) {
    resultBox.textContent = "⚠️ Error: " + e.message;
  }
});

document.getElementById("next4").addEventListener("click", () => {

  const sender = document.getElementById("senderAccount").value;
  const receiver = document.getElementById("receiverAccount").value;
  const amount = parseFloat(document.getElementById("amount").value);
  
  if (!sender || !receiver || !amount) {
    alert("Please fill in all required fields before proceeding.");
    return;
  }

  if (!exchangeRate || exchangeRate <= 0) {
    alert("Exchange rate not loaded. Please re-select a country or bank.");
    return;
  }

  const bankData = JSON.parse(document.getElementById("bank").value);

  const converted = (amount * exchangeRate).toFixed(2);
  const fee = (amount * 0.005).toFixed(2);
  const total = (amount + parseFloat(fee)).toFixed(2);

  summary.innerHTML = `
    <strong>Sender Account:</strong> ${sender}<br>
    <strong>Recipient Account:</strong> ${receiver}<br>
    <strong>Recipient Bank:</strong> ${bankData.name}<br>
    <strong>Country:</strong> ${bankData.country}<br>
    <strong>Amount (SGD):</strong> ${amount.toFixed(2)}<br>
    <strong>Exchange Rate:</strong> ${exchangeRate.toFixed(4)}<br>
    <strong>Converted (${bankData.currency}):</strong> ${converted}<br>
    <strong>Service Fee (0.5%):</strong> ${fee}<br>
    <hr>
    <strong>Total Deduction (SGD):</strong> ${total}
  `;
});