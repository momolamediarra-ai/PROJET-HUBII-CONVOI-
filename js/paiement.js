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
    const waveNotice = document.getElementById("waveNotice");
    const wavePostPaymentBox = document.getElementById("wavePostPaymentBox");
    const btnConfirmerEtRecu = document.getElementById("btnConfirmerEtRecu");
    const dejaPayeBox = document.getElementById("dejaPayeBox");
    const btnVoirRecuDirect = document.getElementById("btnVoirRecuDirect");

    // =========================================================================
    // LIEN OFFICIEL DE PAIEMENT WAVE (Laissé vide — à renseigner ultérieurement)
    // =========================================================================
    const LIEN_PAIEMENT_WAVE = "";

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
        alert("Dossier de réservation introuvable. Redirection vers la billetterie.");
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

    // Fonction pour afficher l'état Payé
    function activerEtatPaye() {
        if (dejaPayeBox) dejaPayeBox.style.display = "block";
        if (btnWavePaiement) btnWavePaiement.style.display = "none";
        if (wavePostPaymentBox) wavePostPaymentBox.style.display = "none";
        if (waveNotice) waveNotice.style.display = "none";
        if (btnVoirRecuDirect) {
            btnVoirRecuDirect.href = `recu.html?id=${reservation.id}`;
        }
    }

    // Si la réservation est déjà PAYÉ
    if (reservation.statut === "PAYÉ") {
        activerEtatPaye();
    }

    // =========================================================================
    // VALIDATION DU PAIEMENT CLIENT & TÉLÉCHARGEMENT DU REÇU
    // =========================================================================
    async function validerPaiementEtRediriger() {
        if (btnConfirmerEtRecu) {
            btnConfirmerEtRecu.disabled = true;
            btnConfirmerEtRecu.innerHTML = `⏳ Validation de votre pass en cours...`;
        }

        try {
            const res = await fetch(`/api/reservations/${reservation.id}/confirmer-paiement`, {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });
            const data = await res.json();
            if (data.success && data.reservation) {
                reservation = data.reservation;
            }
        } catch (e) {
            console.warn("Validation hors ligne locale :", e);
        }

        // Mettre à jour le cache local
        reservation.statut = "PAYÉ";
        localStorage.setItem("reservation_data", JSON.stringify(reservation));
        localStorage.setItem("reservation_id", reservation.id);

        // Redirection directe vers la page de reçu avec paid=1
        window.location.href = `recu.html?id=${reservation.id}&paid=1`;
    }

    // Si le paramètre URL indique un retour de paiement
    if (isPaidParam) {
        await validerPaiementEtRediriger();
        return;
    }

    // Clic sur "Payer avec Wave"
    if (btnWavePaiement) {
        btnWavePaiement.addEventListener("click", () => {
            if (waveNotice) {
                waveNotice.style.display = "block";
            }
            if (wavePostPaymentBox) {
                wavePostPaymentBox.style.display = "block";
            }

            // Si le lien Wave est configuré, on l'ouvre
            if (LIEN_PAIEMENT_WAVE && LIEN_PAIEMENT_WAVE.trim() !== "" && LIEN_PAIEMENT_WAVE !== "#") {
                window.open(LIEN_PAIEMENT_WAVE, "_blank");
            } else {
                console.info("Lien Wave non configuré (en attente de saisie).");
            }
        });
    }

    // Clic sur "J'ai payé sur Wave -> Télécharger mon Reçu & Pass"
    if (btnConfirmerEtRecu) {
        btnConfirmerEtRecu.addEventListener("click", () => {
            validerPaiementEtRediriger();
        });
    }

    // Polling discret : vérifie si le statut devient PAYÉ
    const pollInterval = setInterval(async () => {
        if (reservation && reservation.statut === "PAYÉ") {
            clearInterval(pollInterval);
            return;
        }

        try {
            const reponse = await fetch(`/api/reservations/${reservationId}`);
            const resultat = await reponse.json();

            if (reponse.ok && resultat.success && resultat.reservation && resultat.reservation.statut === "PAYÉ") {
                reservation = resultat.reservation;
                localStorage.setItem("reservation_data", JSON.stringify(reservation));
                activerEtatPaye();
                clearInterval(pollInterval);
            }
        } catch (e) {
            // mode hors ligne
        }
    }, 4000);
});
