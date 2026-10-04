const registerForm = document.getElementById("registerForm");
const registerButton = document.getElementById("registerButton");
const messageBox = document.getElementById("message");

function showMessage(message, type) {
  messageBox.textContent = message;
  messageBox.className = `form-message ${type}`;
}

function clearMessage() {
  messageBox.textContent = "";
  messageBox.className = "form-message";
}

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  clearMessage();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  // Frontend validation
  if (name.length < 2) {
    showMessage("Please enter a valid name.", "error");
    return;
  }

  if (password.length < 8) {
    showMessage("Password must contain at least 8 characters.", "error");
    return;
  }

  if (password !== confirmPassword) {
    showMessage("Passwords do not match.", "error");
    return;
  }

  registerButton.disabled = true;
  registerButton.textContent = "Creating account...";

  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Registration failed.");
    }

    showMessage(
      data.message ||
        "Account created successfully. Check your email for the OTP.",
      "success",
    );

    // Move to OTP verification page
    window.location.href = `/verify-otp.html?email=${encodeURIComponent(email)}`;
  } catch (error) {
    showMessage(error.message || "Something went wrong.", "error");

    registerButton.disabled = false;
    registerButton.textContent = "Create Account";
  }
});
