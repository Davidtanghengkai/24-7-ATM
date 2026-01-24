let currentStep = 1;
const totalSteps = 5;

const rateText = document.getElementById("rateText");
const summary = document.getElementById("summary");
const resultBox = document.getElementById("result");

let exchangeRate = 0;
let toCurrency = "";

document.addEventListener("DOMContentLoaded", () => {
  const savedAccount = localStorage.getItem("selectedAccountNo");

  if (savedAccount) {
      const senderInput = document.getElementById("senderAccount");
      senderInput.value = savedAccount;
      senderInput.setAttribute("readonly", true);
  }
});
// -------------------------------------------------
// STEP NAVIGATION
// -------------------------------------------------
function showStep(step) {
  document.querySelectorAll(".step").forEach(s => s.classList.remove("active"));

  const target = document.getElementById(`step${step}`);
  if (target) {
    target.classList.add("active");
    currentStep = step;
  }
}

function next() {
  if (currentStep < totalSteps) {
    showStep(currentStep + 1);
  }
}

function back() {
  if (currentStep > 1) {
    showStep(currentStep - 1);
  }
}

// -------------------------------------------------
// STEP 1 VALIDATION
// -------------------------------------------------
document.getElementById("next1").onclick = () => {
  const username = document.getElementById("username").value.trim();
  const savedAccount = localStorage.getItem("selectedAccountNo");

  if (!username) {
    showError("Please fill in your name.");
    return;
  }

  if (!savedAccount) {
   showError("No account selected. Please select an account first.");
    return;
  }

  next();
};
document.getElementById("back2").onclick = back;

// -------------------------------------------------
// STEP 2 VALIDATION
// -------------------------------------------------
document.getElementById("next2").onclick = () => {
  const country = document.getElementById("country").value;
  const bank = document.getElementById("bank").value; 

  if ( !country ) {
    showError("Please select country.");
    return;
  }

  if (!bank){
    showError("Please select bank.");
    return;
  }
  next();
};
document.getElementById("back3").onclick = back;

// -------------------------------------------------
// STEP 3 VALIDATION
// -------------------------------------------------
document.getElementById("next3").onclick = async () => {
  const receiver = document.getElementById("receiverAccount").value.trim();

  if (!receiver) {
    showError("Please enter the recipient account number.");
    return;
  }

  next();

  await loadSenderBalance();
};
document.getElementById("back4").onclick = back;


// -------------------------------------------------
// LOAD COUNTRIES
// -------------------------------------------------
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
    showError("Failed to load countries.");
  }
}
loadCountries();


// -------------------------------------------------
// LOAD BANKS + RATE
// -------------------------------------------------
document.getElementById("country").addEventListener("change", async () => {
  const country = document.getElementById("country").value;
  const bankSelect = document.getElementById("bank");

  if (!country) return;

  bankSelect.innerHTML = "<option>Loading banks...</option>";
  rateText.textContent = "⏳ Detecting exchange rate...";

  try {
    const res = await fetch(`/api/banks/${country}`);
    const banks = await res.json();

    bankSelect.innerHTML = "";

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

    toCurrency = banks[0].currency;

    const rateRes = await fetch(`/api/rate?base=SGD&target=${toCurrency}`);
    const rateData = await rateRes.json();

    if (rateData.rate) {
      exchangeRate = rateData.rate;
      rateText.textContent = `💱 1 SGD = ${exchangeRate.toFixed(4)} ${toCurrency}`;
    } else {
      showError("Failed to load exchange rate.");;
    }

  } catch (err) {
    showError("Error fetching banks or exchange rate.");
  }
});


// -------------------------------------------------
// STEP 4 SUMMARY PREVIEW
// -------------------------------------------------
document.getElementById("next4").onclick = () => {
  const sender = document.getElementById("senderAccount").value.trim();
  const receiver = document.getElementById("receiverAccount").value.trim();
  const amount = parseFloat(document.getElementById("amount").value);

  if (!amount || amount <= 0) {
    showError("Please enter a valid amount.");
    return;
  }

  if (!exchangeRate) {
    showError("Exchange rate not loaded.");
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

  next();
  document.getElementById("back5").onclick = back;

};


// -------------------------------------------------
// CONFIRM TRANSFER
// -------------------------------------------------
document.getElementById("confirmTransfer").onclick = async () => {
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

  try {
    const res = await fetch("/api/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    // ✅ CASE 1: FRAUD VERIFY REQUIRED (rules triggered)
    if (res.ok && (data.chainStatus === "VERIFY_REQUIRED" || data.status === "PENDING_VERIFICATION")) {
      const msg = buildVerifyMessage(data.triggeredRules);
      showError(msg); // reuse your error overlay as a "security popup"
      return;
    }

    // ✅ CASE 2: SUCCESSFUL ON_CHAIN
    if (res.ok && data.chainStatus === "ON_CHAIN") {
      // show success + ask user if they want another transaction
      showSuccess("Transfer successful!");
      // after they close success overlay, show the prompt
      const closeBtn = document.getElementById("closeSuccess");
      if (closeBtn) {
        closeBtn.onclick = () => {
          document.getElementById("successOverlay").classList.remove("active");
          showAfterTransferPrompt();
        };
      } else {
        // fallback if button missing
        showAfterTransferPrompt();
      }
      return;
    }

    // ✅ CASE 3: Any other backend response
    if (res.ok) {
      // still treat as success but prompt user
      showSuccess("Transfer processed.");
      const closeBtn = document.getElementById("closeSuccess");
      if (closeBtn) {
        closeBtn.onclick = () => {
          document.getElementById("successOverlay").classList.remove("active");
          showAfterTransferPrompt();
        };
      }
      return;
    }

    showError(data.message || data.error || "Unknown error.");

  } catch (err) {
    showError("Network error. Please try again.");
  }
};

async function loadSenderBalance() {
  const sender = document.getElementById("senderAccount").value.trim();
  const balanceInfo = document.getElementById("balanceInfo");

  if (!sender) {
    balanceInfo.textContent = "Current balance: unavailable (no account selected)";
    return;
  }

  try {
    const res = await fetch(`/api/accounts/${sender}/balance`);
    const data = await res.json();

    if (res.ok && typeof data.balance === "number") {
      balanceInfo.textContent = `Current balance: SGD ${data.balance.toFixed(2)}`;
    } else {
      balanceInfo.textContent = "Current balance: unable to fetch.";
    }
  } catch (err) {
    console.error("Balance fetch error:", err);
    balanceInfo.textContent = "Current balance: error fetching data.";
  }
}

// -------------------------------------------------
// FRAUD / VERIFY MESSAGE MAPPING
// -------------------------------------------------
function getRuleMessage(ruleCode) {
  const map = {
    "R1_NEW_RECEIVER": "This is a new recipient you have never transferred to before.",
    "R2_AMOUNT_GT_HALF_BALANCE": "This transfer amount is more than half of your current balance.",
    "R3_UNUSUAL_TIME": "This transfer is being made at an unusual time (late night hours).",
    "R4_HIGH_VELOCITY_5M": "Too many transfers were made within 5 minutes."
  };
  return map[ruleCode] || `Security check triggered: ${ruleCode}`;
}

function buildVerifyMessage(triggeredRules = []) {
  if (!Array.isArray(triggeredRules) || triggeredRules.length === 0) {
    return "For your safety, please verify yourself to proceed with this transfer.";
  }

  const lines = triggeredRules.map(r => `• ${getRuleMessage(r)}`).join("\n");
  return `For your safety, please verify yourself to proceed.\n\nTriggered checks:\n${lines}`;
}

// -------------------------------------------------
// MODAL POPUP FUNCTION
// -------------------------------------------------
function showError(msg) {
  document.getElementById("overlayMessage").textContent = msg;
  document.getElementById("errorOverlay").style.display = "flex";
}

// CLOSE MODAL
document.getElementById("closeOverlay").onclick = () => {
  document.getElementById("errorOverlay").style.display = "none";
};

// SHOW SUCCESS MODAL
function showSuccess(msg) {
  const successOverlay = document.getElementById("successOverlay");
  const successMessage = document.getElementById("successMessage");
  
  if (successMessage) {
    successMessage.textContent = msg;
  }
  
  if (successOverlay) {
    successOverlay.classList.add("active");
  } else {
    console.error("Success overlay element not found!");
  }
}

function showAfterTransferPrompt() {
  const overlay = document.getElementById("afterTransferOverlay");
  if (overlay) overlay.style.display = "flex";
}

function closeAfterTransferPrompt() {
  const overlay = document.getElementById("afterTransferOverlay");
  if (overlay) overlay.style.display = "none";
}

// Reset UI back to step 1 for another transfer
function resetTransferForm() {
  // clear inputs except sender (since you keep from localStorage)
  document.getElementById("receiverAccount").value = "";
  document.getElementById("amount").value = "";
  document.getElementById("country").selectedIndex = 0;
  document.getElementById("bank").innerHTML = "";

  exchangeRate = 0;
  toCurrency = "";
  rateText.textContent = "";
  summary.innerHTML = "";

  showStep(1);
}

// Buttons for after transfer prompt
document.getElementById("btnAnotherYes").onclick = () => {
  closeAfterTransferPrompt();
  resetTransferForm();
};

document.getElementById("btnAnotherNo").onclick = () => {
  // redirect to index/home page
  window.location.href = "index.html";
};

document.getElementById("closeSuccess").onclick = () => {
  document.getElementById("successOverlay").classList.remove("active");
};