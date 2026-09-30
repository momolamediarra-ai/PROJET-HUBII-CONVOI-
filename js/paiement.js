/**
 * GESTION DU PAIEMENT — CORA EVENTS
 */

document.addEventListener("DOMContentLoaded", async () => {
    // Récupération de l'identifiant depuis l'URL ou le localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const reservationId = urlParams.get("id") || localStorage.getItem("reservation_id");

    const clientReservationId = document.getElementById("clientReservationId");
    const clientNom = document.getElementById("clientNom");
    const clientTelephone = document.getElementById("clientTelephone");
    const clientCommune = document.getElementById("clientCommune");
    const clientPointRassemblement = document.getElementById("clientPointRassemblement");
    const clientTicket = document.getElementById("clientTicket");
    const clientQuantite = document.getElementById("clientQuantite");
    const clientTotal = document.getElementById("clientTotal");
    const btnSaspayPaiement = document.getElementById("btnSaspayPaiement");
    const btnSaspayMontant = document.getElementById("btnSaspayMontant");
    const saspayNotice = document.getElementById("saspayNotice");
    const btnVoirRecu = document.getElementById("btnVoirRecu");

    // Lien officiel de paiement SASPay (menu "Liens de paiement" du tableau de bord SASPay)
    const LIEN_PAIEMENT_SASPAY = "https://link.saspay.me/7sdjyxq84sg";

    const POINTS_RASSEMBLEMENT_MAP = {
        "Anyama": "Gare d'Anyama",
        "Bingerville": "Feu de Khesse",
        "Cocody": "Université Félix Houphouët-Boigny (UFHB)",
        "Marcory": "Gare de Bassam",
        "Treichville": "Gare de Bassam",
        "Koumassi": "Grand Carrefour de Koumassi",
        "Port-Bouët": "Grand Carrefour de Koumassi",
        "Gonzagueville": "Grand Carrefour de Koumassi",
        "Yopougon": "Siporex",
        "Adjamé": "Mairie d'Adjamé",
        "Abobo": "Gendarmerie d'Abobo",
        "Songon": "Examiné selon effectif (contact par les délégués)"
    };

    if (!reservationId) {
        alert("Aucun dossier de réservation en cours. Vous allez être redirigé vers la billetterie.");
        window.location.href = "index.html#billetterie";
        return;
    }

    let reservation = null;

    try {
        const reponse = await fetch(`/api/reservations/${reservationId}`);
        const resultat = await reponse.json();

        if (reponse.ok && resultat.success) {
            reservation = resultat.reservation;
        }
    } catch (err) {
        console.warn("Mode local paiement :", err);
    }

    // Récupération locale si le serveur n'est pas démarré
    if (!reservation) {
        try {
            const dataLocale = localStorage.getItem("reservation_data");
            if (dataLocale) {
                reservation = JSON.parse(dataLocale);
            }
        } catch (e) {
            console.error("Erreur lecture cache local :", e);
        }
    }

    if (!reservation) {
        alert("Dossier de réservation introuvable. Redirection vers la billetterie.");
        window.location.href = "index.html#billetterie";
        return;
    }

    const lieuPoint = reservation.point_rassemblement || POINTS_RASSEMBLEMENT_MAP[reservation.commune] || "Point de sa commune";

    if (clientReservationId) clientReservationId.textContent = `#PP-${String(reservation.id).padStart(4, "0")}`;
    if (clientNom) clientNom.textContent = reservation.nom;
    if (clientTelephone) clientTelephone.textContent = reservation.telephone;
    if (clientCommune) clientCommune.textContent = reservation.commune || "Non précisée";
    if (clientPointRassemblement) clientPointRassemblement.textContent = lieuPoint;

    const elPayFlowCommune = document.getElementById("paymentFlowCommune");
    const elPayFlowPoint = document.getElementById("paymentFlowPoint");
    if (elPayFlowCommune) elPayFlowCommune.textContent = reservation.commune || "Votre Commune";
    if (elPayFlowPoint) elPayFlowPoint.textContent = lieuPoint;

    if (clientTicket) clientTicket.textContent = reservation.ticket || "Pass Convoi Petit Paradis";
    if (clientQuantite) {
        const label = reservation.quantite > 1 ? "passagers" : "passager";
        clientQuantite.textContent = `${reservation.quantite} ${label}`;
    }

    const totalFormate = `${Number(reservation.total).toLocaleString("fr-FR")} FCFA`;
    if (clientTotal) clientTotal.textContent = totalFormate;
    if (btnSaspayMontant) btnSaspayMontant.textContent = totalFormate;

    // Mettre à jour le lien vers le reçu officiel
    if (btnVoirRecu) {
        btnVoirRecu.href = `recu.html?id=${reservation.id}`;
    }

    // =========================================================================
    // PAIEMENT VIA LIEN OFFICIEL SASPAY
    // =========================================================================
    if (btnSaspayPaiement) {
        btnSaspayPaiement.addEventListener("click", () => {
            if (saspayNotice) {
                saspayNotice.style.display = "block";
                saspayNotice.innerHTML = `↗️ <strong>Redirection vers SASPay :</strong> effectuez votre paiement dans l'onglet qui vient de s'ouvrir, puis revenez ici pour consulter votre Pass d'embarquement.`;
            }
            window.open(LIEN_PAIEMENT_SASPAY, "_blank");
        });
    }
});
