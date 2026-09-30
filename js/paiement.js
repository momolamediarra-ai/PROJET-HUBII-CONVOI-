/**
 * GESTION DU PAIEMENT — CORA EVENTS
 */

document.addEventListener("DOMContentLoaded", async () => {
    // Récupération de l'identifiant depuis l'URL ou le localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const reservationId = urlParams.get("id") || localStorage.getItem("reservation_id");
    const isPaidParam = urlParams.get("paid") === "1" || urlParams.get("status") === "success";

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
    const saspayPostPaymentBox = document.getElementById("saspayPostPaymentBox");
    const btnConfirmerEtRecu = document.getElementById("btnConfirmerEtRecu");
    const dejaPayeBox = document.getElementById("dejaPayeBox");
    const btnVoirRecuDirect = document.getElementById("btnVoirRecuDirect");

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

    // Fonction pour afficher l'état Payé
    function activerEtatPaye() {
        if (dejaPayeBox) dejaPayeBox.style.display = "block";
        if (btnSaspayPaiement) btnSaspayPaiement.style.display = "none";
        if (saspayPostPaymentBox) saspayPostPaymentBox.style.display = "none";
        if (saspayNotice) saspayNotice.style.display = "none";
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

        // Redirection directe vers la page de reçu
        window.location.href = `recu.html?id=${reservation.id}&paid=1`;
    }

    // Si le paramètre URL indique un retour de paiement
    if (isPaidParam) {
        await validerPaiementEtRediriger();
        return;
    }

    // Clic sur "Payer avec SASPay"
    if (btnSaspayPaiement) {
        btnSaspayPaiement.addEventListener("click", () => {
            if (saspayNotice) {
                saspayNotice.style.display = "block";
            }
            if (saspayPostPaymentBox) {
                saspayPostPaymentBox.style.display = "block";
            }

            // Ouverture de la page SASPay officielle
            window.open(LIEN_PAIEMENT_SASPAY, "_blank");
        });
    }

    // Clic sur "J'ai payé -> Télécharger mon Reçu & Pass"
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
