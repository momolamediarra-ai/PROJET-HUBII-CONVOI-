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
    // INITIALISATION DU PAIEMENT SASPAY (Emplacement prêt à être configuré)
    // =========================================================================
    if (btnSaspayPaiement) {
        btnSaspayPaiement.addEventListener("click", async () => {
            btnSaspayPaiement.disabled = true;
            if (saspayNotice) {
                saspayNotice.style.display = "block";
                saspayNotice.innerHTML = `⏳ Connexion à la passerelle SASPay en cours pour le dossier <strong>#PP-${String(reservation.id).padStart(4, "0")}</strong>...`;
            }

            try {
                // Appel vers l'endpoint backend SASPay configuré dans server.js
                const reponse = await fetch(`/api/paiement/saspay/${reservation.id}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        reservation_id: reservation.id,
                        montant: reservation.total,
                        nom: reservation.nom,
                        telephone: reservation.telephone,
                        commune: reservation.commune
                    })
                });

                const data = await reponse.json();

                if (reponse.ok && data.success && data.payment_url) {
                    // Redirection vers le lien de checkout SASPay
                    window.location.href = data.payment_url;
                    return;
                } else {
                    // Si SASPay n'est pas encore configuré sur le serveur (clés en attente)
                    if (saspayNotice) {
                        saspayNotice.innerHTML = `ℹ️ <strong>Passerelle SASPay prête :</strong> ${data.message || "Veuillez renseigner vos identifiants SASPay dans le fichier .env / server.js pour activer le paiement automatique."}`;
                    }
                }
            } catch (err) {
                console.warn("Connexion serveur SASPay :", err);
                if (saspayNotice) {
                    saspayNotice.innerHTML = `ℹ️ <strong>Mode Prêt SASPay :</strong> Passerelle en attente de vos clés API dans le fichier <code>.env</code>.`;
                }
            } finally {
                btnSaspayPaiement.disabled = false;
            }
        });
    }
});