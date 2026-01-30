let currentStep = 1;
const totalSteps = 5;

const rateText = document.getElementById("rateText");
const summary = document.getElementById("summary");
const resultBox = document.getElementById("result");

let exchangeRate = 0;
let toCurrency = "";
let isSubmitting = false;

document.addEventListener("DOMContentLoaded", () => {
  const savedAccount = localStorage.getItem("selectedAccountNo");

  if (savedAccount) {
      const senderInput = document.getElementById("senderAccount");
      senderInput.value = savedAccount;
      senderInput.setAttribute("readonly", true);
  }
});


(function () {
  if (!document.getElementById("startFaceBtn")) {
    const hiddenBtn = document.createElement("button");
    hiddenBtn.id = "startFaceBtn";
    hiddenBtn.style.display = "none";
    document.body.appendChild(hiddenBtn);
  }
})();

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
  if (isSubmitting) return;
  isSubmitting = true;

  const btn = document.getElementById("confirmTransfer");
  btn.disabled = true;

  try {
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

    // 1) First attempt
    const first = await submitTransfer(payload);

    console.log("FIRST /api/transfer =>", first.res.status, first.data);

    // VERIFY REQUIRED
    if (first.res.ok && (first.data.chainStatus === "VERIFY_REQUIRED" || first.data.status === "PENDING_VERIFICATION")) {
      const pendingTxnID = first.data.txnID;
      const pendingRef = first.data.reference;

      showError(buildVerifyMessage(first.data.triggeredRules));

      // after user sees message, run face verify
      setTimeout(async () => {
        try {
          const token = await forceFaceVerifyAndGetToken();
          if (!token) {
            showError("Face verification failed. Transfer cancelled.");
            return;
          }

          const secondPayload = { ...payload, pendingTxnID, reference: pendingRef };
          const second = await submitTransfer(secondPayload, { token, forceProceed: true });

          console.log("SECOND /api/transfer =>", second.res.status, second.data);

          if (second.res.ok && second.data.chainStatus === "ON_CHAIN") {
            hideErrorOverlay();
            showSuccess("Transfer successful after verification!");
            return;
          }

          showError(second.data.message || second.data.error || "Transfer failed after verification.");
        } finally {
          // ✅ IMPORTANT: reset after the retry flow finishes
          btn.disabled = false;
          isSubmitting = false;
        }
      }, 400);

      // stop here; the retry flow will reset the button
      return;
    }

    // Normal success
    if (first.res.ok && first.data.chainStatus === "ON_CHAIN") {
      hideErrorOverlay();
      showSuccess("Transfer successful!");
      return;
    }

    if (first.res.ok && first.data.chainStatus === "NEEDS_REVIEW") {
      showError("Transfer recorded but blockchain needs review (NEEDS_REVIEW).");
      return;
    }

    showError(first.data.message || first.data.error || `Transfer failed (HTTP ${first.res.status})`);
  } catch (err) {
    console.error("confirmTransfer error:", err);
    showError("Network/JS error. Please try again.");
  } finally {
    // ✅ ALWAYS reset for normal flow
    // NOTE: verify flow returns earlier and resets inside setTimeout finally.
    if (!btn.disabled) {
      // already reset
    } else {
      btn.disabled = false;
      isSubmitting = false;
    }
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
function hideErrorOverlay() {
  const err = document.getElementById("errorOverlay");
  if (err) err.style.display = "none";
}

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
  hideErrorOverlay();
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
  setTimeout(() => {
    showAfterTransferPrompt();
  }, 400);
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

async function submitTransfer(payload, { token = null, forceProceed = false } = {}) {
  const headers = { "Content-Type": "application/json" };

  // ✅ default: use saved token (normal transfer)
  const finalToken = token || localStorage.getItem("jwtToken");
  if (finalToken) headers["Authorization"] = `Bearer ${finalToken}`;

  const body = forceProceed ? { ...payload, forceProceed: true } : payload;

  const res = await fetch("/api/transfer", {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  const data = await res.json().catch(() => ({}));
  return { res, data };
}


async function forceFaceVerifyAndGetToken() {
  // close the fraud message overlay (it blocks clicks)
  const errOverlay = document.getElementById("errorOverlay");
  if (errOverlay) errOverlay.style.display = "none";

  // login.js already defines these functions globally
  if (typeof openFaceModal !== "function" || typeof scanUserFace !== "function") {
    showError("Face verification module not loaded. Check if login.js is included.");
    return null;
  }

  await openFaceModal();

  // make sure models are loaded
  if (typeof loadFaceModels === "function") {
    await loadFaceModels();
  }

  // let camera stabilize
  await new Promise(r => setTimeout(r, 800));

  const videoEl = document.getElementById("video");
  const result = await scanUserFace(videoEl);

  if (!result || !result.success) {
    const status = document.getElementById("status");
    if (status) status.textContent = "❌ " + (result?.message || "Face scan failed");
    setTimeout(() => { if (typeof closeFaceModal === "function") closeFaceModal(); }, 1200);
    return null;
  }

  // get token
  const tokenRes = await fetch("/api/users/loginWithFace", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: result.userId })
  });

  const tokenData = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok) {
    if (typeof closeFaceModal === "function") closeFaceModal();
    showError(tokenData.message || "Verification failed");
    return null;
  }

  localStorage.setItem("jwtToken", tokenData.token);
  localStorage.setItem("userId", tokenData.userId);

  const status = document.getElementById("status");
  if (status) status.textContent = "✅ Verified!";
  setTimeout(() => { if (typeof closeFaceModal === "function") closeFaceModal(); }, 700);

  return tokenData.token;
}

function handleCancel() {
  window.history.back();
}
