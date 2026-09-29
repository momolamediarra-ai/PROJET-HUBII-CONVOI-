const reservationsList =
    document.getElementById("reservationsList");

const totalReservations =
    document.getElementById("totalReservations");

const totalTickets =
    document.getElementById("totalTickets");

const totalMontant =
    document.getElementById("totalMontant");

const logoutBtn =
    document.getElementById("logoutBtn");


// Vérifier si l'administrateur est connecté
async function verifierConnexion() {

    try {

        const response = await fetch("/api/admin/me");

        const result = await response.json();

        if (!response.ok || !result.success) {

            window.location.href = "/admin/login.html";
            return false;
        }

        return true;

    } catch (error) {

        console.error(error);

        window.location.href = "/admin/login.html";
        return false;
    }
}


// Charger les réservations
async function chargerReservations() {

    try {

        const response = await fetch(
            "/api/reservations"
        );

        const reservations = await response.json();

        reservationsList.innerHTML = "";

        let nombreTickets = 0;
        let montant = 0;

        reservations.forEach((reservation) => {

            nombreTickets += Number(reservation.quantite);
            montant += Number(reservation.total);

            const ligne = document.createElement("tr");

           ligne.innerHTML = `
    <td>${reservation.id}</td>
    <td>${reservation.nom}</td>
    <td>${reservation.telephone}</td>
    <td>${reservation.ticket}</td>
    <td>${reservation.quantite}</td>
    <td>
        ${Number(reservation.total)
            .toLocaleString("fr-FR")} FCFA
    </td>

    <td>${reservation.statut}</td>

    <td>
        ${
           reservation.statut === "EN_ATTENTE"
    ? `
        <button onclick="marquerPaye(${reservation.id})">
            Marquer comme PAYÉ
        </button>

        <a href="/recu.html?id=${reservation.id}">
            🧾 Voir le reçu
        </a>
      `
    : `
        <span>✅ PAYÉ</span>

        <br><br>

        <a href="/recu.html?id=${reservation.id}">
            🧾 Voir le reçu
        </a>
      `
        }
    </td>
`;
            reservationsList.appendChild(ligne);
        });

        totalReservations.textContent =
            reservations.length;

        totalTickets.textContent =
            nombreTickets;

        totalMontant.textContent =
            `${montant.toLocaleString("fr-FR")} FCFA`;

    } catch (error) {

        console.error(error);

        reservationsList.innerHTML = `
            <tr>
                <td colspan="7">
                    Impossible de charger les réservations.
                </td>
            </tr>
        `;
    }
}
// Marquer une réservation comme PAYÉ
async function marquerPaye(id) {

    const confirmation = confirm(
        "Confirmer que ce client a payé ?"
    );

    if (!confirmation) {
        return;
    }

    try {

        const response = await fetch(
            `/api/reservations/${id}/payer`,
            {
                method: "PUT"
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {

            alert(
                result.message ||
                "Impossible de confirmer le paiement."
            );

            return;
        }

        alert("Paiement confirmé avec succès !");

        // Actualiser la liste
        chargerReservations();

    } catch (error) {

        console.error(error);

        alert("Impossible de contacter le serveur.");
    }
}

// Déconnexion
logoutBtn.addEventListener("click", async () => {

    try {

        await fetch("/api/admin/logout", {
            method: "POST"
        });

        window.location.href =
            "/admin/login.html";

    } catch (error) {

        console.error(error);

        alert("Impossible de se déconnecter.");
    }
});


// Démarrage du dashboard
async function demarrerDashboard() {

    const connecte = await verifierConnexion();

    if (connecte) {
        chargerReservations();
    }
}

demarrerDashboard();