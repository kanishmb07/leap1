const API_BASE_URL = window.TASKNEST_API_URL || "http://localhost:8080";

function getToken() {
    return localStorage.getItem("token");
}

function clearAuthentication() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
}

function errorMessageFromResponse(data, fallback) {
    if (data && typeof data.message === "string" && data.message.trim()) {
        return data.message;
    }
    if (data && data.errors && typeof data.errors === "object") {
        return Object.values(data.errors).join(" ");
    }
    return fallback;
}

async function apiRequest(path, options = {}) {
    const headers = new Headers(options.headers || {});
    const hasBody = options.body !== undefined && options.body !== null;

    if (hasBody && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    const token = getToken();
    if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    let response;
    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers
        });
    } catch (error) {
        throw new Error("Cannot reach TaskNest. Check that the backend is running on port 8080.");
    }

    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get("content-type") || "";
    let data = null;
    if (contentType.includes("application/json")) {
        data = await response.json().catch(() => null);
    } else {
        data = await response.text().catch(() => "");
    }

    if (response.status === 401) {
        clearAuthentication();
        const isLoginRequest = path === "/api/auth/login";
        const currentPage = window.location.pathname;
        if (!isLoginRequest && !currentPage.endsWith("login.html")) {
            window.location.replace("login.html");
        }
        throw new Error(isLoginRequest
            ? errorMessageFromResponse(data, "Invalid email or password")
            : "Your session has expired. Please login again.");
    }

    if (!response.ok) {
        const fallbackMessages = {
            400: "Please check the information and try again.",
            403: "You don't have permission to perform this action.",
            404: "The requested item could not be found.",
            500: "Server error. Please try again."
        };
        const fallback = fallbackMessages[response.status] || `Request failed (${response.status}).`;
        if (response.status === 403 || response.status === 500) {
            throw new Error(fallback);
        }
        if (response.status === 404) {
            throw new Error("Task or task list not found.");
        }
        throw new Error(errorMessageFromResponse(data, fallback));
    }

    return data;
}
