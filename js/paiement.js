/**
 * GESTION DU PAIEMENT WAVE — CORA EVENTS
 */

document.addEventListener("DOMContentLoaded", async () => {
    // Récupération de l'identifiant depuis l'URL ou le localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const reservationId = urlParams.get("id") || localStorage.getItem("reservation_id");
    const isPaidParam = urlParams.get("paid") === "1" || urlParams.get("status") === "success";

    const clientReservationId = document.getElementById("clientReservationId");
    const clientNom = document.getElementById("clientNom");
    const clientEmail = document.getElementById("clientEmail");
    const clientTelephone = document.getElementById("clientTelephone");
    const clientCommune = document.getElementById("clientCommune");
    const clientPointRassemblement = document.getElementById("clientPointRassemblement");
    const clientTicket = document.getElementById("clientTicket");
    const clientQuantite = document.getElementById("clientQuantite");
    const clientTotal = document.getElementById("clientTotal");
    const btnWavePaiement = document.getElementById("btnWavePaiement");
    const btnWaveMontant = document.getElementById("btnWaveMontant");
    const waveRedirectNotice = document.getElementById("waveRedirectNotice");

    // =========================================================================
    // LIEN OFFICIEL DE PAIEMENT WAVE
    // =========================================================================
    const LIEN_PAIEMENT_WAVE = "https://pay.wave.com/m/M_ci_h9hZMaHf2uuM/c/ci/?amount=3030";
    const LIEN_PAIEMENT_WAVE_BASE = "https://pay.wave.com/m/M_ci_h9hZMaHf2uuM/c/ci/";

    function obtenirLienPaiementWave() {
        if (reservation && reservation.total && Number(reservation.total) > 0) {
            return `${LIEN_PAIEMENT_WAVE_BASE}?amount=${encodeURIComponent(reservation.total)}`;
        }
        return LIEN_PAIEMENT_WAVE;
    }

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
        alert("On ne trouve pas votre dossier de réservation. Pas de panique : on vous ramène à la billetterie.");
        window.location.href = "index.html#billetterie";
        return;
    }

    let reservation = null;

    async function chargerDonneesReservation() {
        try {
            const reponse = await fetch(`/api/reservations/${reservationId}`);
            const resultat = await reponse.json();

            if (reponse.ok && resultat.success) {
                reservation = resultat.reservation;
                return reservation;
            }
        } catch (err) {
            console.warn("Mode local paiement :", err);
        }

        // Récupération locale si le serveur n'est pas démarré
        try {
            const dataLocale = localStorage.getItem("reservation_data");
            if (dataLocale) {
                reservation = JSON.parse(dataLocale);
            }
        } catch (e) {
            console.error("Erreur lecture cache local :", e);
        }

        return reservation;
    }

    await chargerDonneesReservation();

    if (!reservation) {
        alert("Dossier de réservation introuvable. On vous ramène à la billetterie.");
        window.location.href = "index.html#billetterie";
        return;
    }

    const lieuPoint = reservation.point_rassemblement || POINTS_RASSEMBLEMENT_MAP[reservation.commune] || "Point de sa commune";

    if (clientReservationId) clientReservationId.textContent = `#PP-${String(reservation.id).padStart(4, "0")}`;
    if (clientNom) clientNom.textContent = reservation.nom;
    if (clientEmail) clientEmail.textContent = reservation.email || "Non précisée";
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
    if (btnWaveMontant) btnWaveMontant.textContent = totalFormate;

    // Si la réservation est déjà PAYÉ → rediriger directement
    if (reservation.statut === "PAYÉ") {
        window.location.href = `recu.html?id=${reservation.id}&paid=1`;
        return;
    }

    // =========================================================================
    // FLUX SIMPLIFIÉ : CLIC WAVE → OUVRE WAVE → REDIRIGE VERS TICKET
    // =========================================================================
    function redirectVersTicket() {
        // Marque le paiement en local
        reservation.statut = "PAYÉ";
        localStorage.setItem("reservation_data", JSON.stringify(reservation));
        localStorage.setItem("reservation_id", reservation.id);

        // Appel serveur silencieux (ne bloque pas la redirection)
        fetch(`/api/reservations/${reservation.id}/confirmer-paiement`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }).catch(() => {});

        // Redirection directe vers le ticket officiel
        window.location.href = `recu.html?id=${reservation.id}&paid=1`;
    }

    // Si l'URL contient ?paid=1 (retour direct)
    if (isPaidParam) {
        redirectVersTicket();
        return;
    }

    // Clic sur "Payer avec Wave"
    if (btnWavePaiement) {
        btnWavePaiement.addEventListener("click", () => {
            // Afficher le spinner de redirection
            if (waveRedirectNotice) waveRedirectNotice.style.display = "block";

            // Désactiver le bouton pour éviter double-clic
            btnWavePaiement.disabled = true;
            btnWavePaiement.style.opacity = "0.6";

            // Ouvrir Wave sur le téléphone / navigateur
            const urlWave = obtenirLienPaiementWave();
            window.open(urlWave, "_blank");

            // Redirection automatique vers le ticket après 2 secondes
            setTimeout(() => {
                redirectVersTicket();
            }, 2000);
        });
    }

    // Polling discret : si le serveur confirme le paiement, rediriger vers le ticket
    const pollInterval = setInterval(async () => {
        if (reservation && reservation.statut === "PAYÉ") {
            clearInterval(pollInterval);
            return;
        }

        try {
            const reponse = await fetch(`/api/reservations/${reservationId}`);
            const resultat = await reponse.json();

            if (reponse.ok && resultat.success && resultat.reservation && resultat.reservation.statut === "PAYÉ") {
                clearInterval(pollInterval);
                window.location.href = `recu.html?id=${reservationId}&paid=1`;
            }
        } catch (e) {
            // mode hors ligne
        }
    }, 4000);
});
