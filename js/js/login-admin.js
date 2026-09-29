const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    message.textContent = "Connexion en cours...";

    try {

        const response = await fetch("/api/admin/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            message.textContent =
                result.message || "Identifiants incorrects.";
            return;
        }

        window.location.href = "/admin/dashboard.html";

    } catch (error) {

        console.error(error);

        message.textContent =
            "Impossible de contacter le serveur.";
    }
});