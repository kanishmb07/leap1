function showFormMessage(element, message, type) {
    element.textContent = message;
    element.className = `form-message ${type ? `message-${type}` : ""}`;
}

const registerForm = document.getElementById("register-form");
if (registerForm) {
    if (getToken()) {
        window.location.replace("dashboard.html");
    }

    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const message = document.getElementById("register-message");
        const name = document.getElementById("register-name").value.trim();
        const email = document.getElementById("register-email").value.trim();
        const password = document.getElementById("register-password").value;

        if (!registerForm.reportValidity()) {
            return;
        }
        if (password.length < 6) {
            showFormMessage(message, "Password must contain at least 6 characters.", "error");
            return;
        }

        const submitButton = registerForm.querySelector("button[type=submit]");
        submitButton.disabled = true;
        showFormMessage(message, "Creating your account…", "info");
        try {
            await apiRequest("/api/users", {
                method: "POST",
                body: JSON.stringify({ name, email, password })
            });
            showFormMessage(message, "Registration successful", "success");
            setTimeout(() => window.location.assign("login.html"), 900);
        } catch (error) {
            showFormMessage(message, error.message, "error");
            submitButton.disabled = false;
        }
    });
}

const loginForm = document.getElementById("login-form");
if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const message = document.getElementById("login-message");
        const email = document.getElementById("login-email").value.trim();
        const password = document.getElementById("login-password").value;

        if (!loginForm.reportValidity()) {
            return;
        }

        const submitButton = loginForm.querySelector("button[type=submit]");
        submitButton.disabled = true;
        showFormMessage(message, "Checking your details…", "info");
        try {
            const response = await apiRequest("/api/auth/login", {
                method: "POST",
                body: JSON.stringify({ email, password })
            });
            if (!response || !response.token) {
                throw new Error("Login succeeded, but no access token was returned.");
            }

            localStorage.setItem("token", response.token);
            localStorage.setItem("user", JSON.stringify({
                id: response.id,
                name: response.name,
                email: response.email
            }));
            loginForm.reset();
            window.location.assign("dashboard.html");
        } catch (error) {
            showFormMessage(message, error.message, "error");
            submitButton.disabled = false;
        }
    });
}
