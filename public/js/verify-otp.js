const verifyForm = document.getElementById("verifyForm");
const verifyButton = document.getElementById("verifyButton");
const resendButton = document.getElementById("resendButton");
const otpInput = document.getElementById("otp");
const messageBox = document.getElementById("message");
const emailDisplay = document.getElementById("emailDisplay");

// Get email from the URL
const params = new URLSearchParams(window.location.search);
const email = (params.get("email") || "").trim().toLowerCase();

emailDisplay.textContent = email || "your email address";

function showMessage(message, type) {
  messageBox.textContent = message;
  messageBox.className = `message ${type}`;
}

function clearMessage() {
  messageBox.textContent = "";
  messageBox.className = "message";
}

// Allow only numbers in OTP field
otpInput.addEventListener("input", () => {
  otpInput.value = otpInput.value.replace(/\D/g, "").slice(0, 6);
});

// Verify OTP
verifyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage();

  const otp = otpInput.value.trim();

  if (!email) {
    showMessage("Email address is missing. Please register again.", "error");
    return;
  }

  if (!/^\d{6}$/.test(otp)) {
    showMessage("Please enter a valid 6-digit OTP.", "error");
    return;
  }

  verifyButton.disabled = true;
  verifyButton.textContent = "Verifying...";

  try {
    const response = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, otp }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "OTP verification failed.");
    }

    showMessage(data.message || "Email verified successfully!", "success");

    setTimeout(() => {
      window.location.href = "/login.html";
    }, 1200);
  } catch (error) {
    showMessage(error.message || "Something went wrong.", "error");
  } finally {
    verifyButton.disabled = false;
    verifyButton.textContent = "Verify Email";
  }
});

// Resend OTP
resendButton.addEventListener("click", async () => {
  clearMessage();

  if (!email) {
    showMessage("Email address is missing. Please register again.", "error");
    return;
  }

  resendButton.disabled = true;
  resendButton.textContent = "Sending...";

  try {
    const response = await fetch("/api/auth/resend-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not resend OTP.");
    }

    showMessage(
      data.message || "A new OTP has been sent to your email.",
      "success",
    );

    otpInput.value = "";
  } catch (error) {
    showMessage(error.message || "Something went wrong.", "error");
  } finally {
    resendButton.disabled = false;
    resendButton.textContent = "Resend OTP";
  }
});
