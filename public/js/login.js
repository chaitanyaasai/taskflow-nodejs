const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const messageBox = document.getElementById("message");

function showMessage(message, type) {
  messageBox.textContent = message;
  messageBox.className = `message ${type}`;
}

function clearMessage() {
  messageBox.textContent = "";
  messageBox.className = "message";
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage();

  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;

  loginButton.disabled = true;
  loginButton.textContent = "Signing in...";

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Login failed.");
    }

    if (!data.token) {
      throw new Error(
        "Login response did not contain an authentication token.",
      );
    }

    // Store JWT for authenticated API requests
    localStorage.setItem("taskflow_token", data.token);

    showMessage("Login successful! Opening your dashboard...", "success");

    setTimeout(() => {
      window.location.href = "/dashboard.html";
    }, 800);
  } catch (error) {
    showMessage(error.message || "Something went wrong.", "error");

    loginButton.disabled = false;
    loginButton.textContent = "Sign In";
  }
});
