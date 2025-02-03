document.addEventListener("DOMContentLoaded", function () {
    const isUserSignedUp = localStorage.getItem("userLoggedIn") === "true"; // Ensure it's a boolean
    const signupBtn = document.getElementById("signupBtn");

    if (isUserSignedUp) {
        signupBtn.style.display = "none"; // Hide Signup button if logged in
    }
});

// Simulating User Signup
function userSignup() {
    localStorage.setItem("userLoggedIn", "true");
    location.reload(); // Refresh the page
}

// Simulating User Logout
function userLogout() {
    localStorage.removeItem("userLoggedIn");
    location.reload(); // Refresh the page
}
