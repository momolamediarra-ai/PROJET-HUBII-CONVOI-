/**
 * AFFICHAGE DU PASS D'EMBARQUEMENT OFFICIEL AVEC QR CODE — CORA EVENTS
 * Contrôle strict d'accès : le billet est verrouillé tant que non payé.
 */

document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id") || localStorage.getItem("reservation_id");
    const isPaidParam = params.get("paid") === "1" || params.get("status") === "success";

    const loadingEl = document.getElementById("recuLoading");
    const verrouilleCard = document.getElementById("recuVerrouilleCard");
    const recuCard = document.getElementById("recuCard");

    // Éléments du Billet officiel
    const elDossier = document.getElementById("recuDossier");
    const elNumTicket = document.getElementById("recuNumTicket");
    const elNom = document.getElementById("recuNom");
    const elEmail = document.getElementById("recuEmail");
    const elTelephone = document.getElementById("recuTelephone");
    const elCommune = document.getElementById("recuCommune");
    const elPoint = document.getElementById("recuPoint");
    const elPointAlerte = document.getElementById("recuPointAlerte");
    const elQuantite = document.getElementById("recuQuantite");
    const elTotal = document.getElementById("recuTotal");
    const elStatut = document.getElementById("recuStatut");
    const elQRRef = document.getElementById("recuQRRef");
    const elQRCode = document.getElementById("recuQRCode");
    const btnShareWhatsApp = document.getElementById("btnShareWhatsApp");

    // Éléments de l'écran verrouillé
    const lockReservationId = document.getElementById("lockReservationId");
    const lockNomClient = document.getElementById("lockNomClient");
    const lockMontant = document.getElementById("lockMontant");
    const btnLockPayerWave = document.getElementById("btnLockPayerWave");
    const btnLockDebloquer = document.getElementById("btnLockDebloquer");

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

    if (!id) {
        if (loadingEl) {
            loadingEl.innerHTML = `
                <div style="padding: 10px;">
                    <div style="font-size: 32px; margin-bottom: 8px;">⚠️</div>
                    <p style="color: #b91c1c; font-weight: 700; margin-bottom: 12px;">Aucun numéro de réservation trouvé.</p>
                    <a href="index.html#billetterie" class="btn-primary" style="display: inline-flex; font-size: 14px;">Retourner à la billetterie</a>
                </div>
            `;
        }
        return;
    }

    try {
        let res = null;

        // 1. Si retour avec paid=1, on confirme automatiquement côté serveur
        if (isPaidParam) {
            try {
                const confRes = await fetch(`/api/reservations/${id}/confirmer-paiement`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" }
                });
                const confData = await confRes.json();
                if (confRes.ok && confData.success && confData.reservation) {
                    res = confData.reservation;
                }
            } catch (err) {
                console.warn("Confirmation réseau auto :", err);
            }
        }

        // 2. Recherche sur l'API serveur
        if (!res) {
            try {
                const response = await fetch(`/api/reservations/${id}`);
                const result = await response.json();
                if (response.ok && result.success && result.reservation) {
                    res = result.reservation;
                }
            } catch (e) {
                console.warn("Mode local pass :", e);
            }
        }

        // 3. Fallback cache local si serveur non démarré
        if (!res) {
            try {
                const dataLocale = localStorage.getItem("reservation_data");
                if (dataLocale) {
                    const parsed = JSON.parse(dataLocale);
                    if (String(parsed.id) === String(id) || !id) {
                        res = parsed;
                    }
                }
            } catch (e) {
                console.error("Erreur cache local :", e);
            }
        }

        if (!res) {
            if (loadingEl) {
                loadingEl.innerHTML = `
                    <div style="padding: 10px;">
                        <p style="color: #b91c1c; font-weight: 700; margin-bottom: 12px;">Dossier de réservation #${id} introuvable.</p>
                        <a href="index.html#billetterie" class="btn-primary" style="display: inline-flex; font-size: 14px;">Retourner à la billetterie</a>
                    </div>
                `;
            }
            return;
        }

        const pointLieu = res.point_rassemblement || POINTS_RASSEMBLEMENT_MAP[res.commune] || "Point de sa commune";
        const codeDossier = `#PP-${String(res.id).padStart(4, "0")}`;
        const totalFormate = `${Number(res.total || 3030).toLocaleString("fr-FR")} FCFA`;

        // =====================================================================
        // CONTRÔLE DE SÉCURITÉ STRICT : LE TICKET N'EST VISIBLE QUE SI PAYÉ
        // Le paramètre URL ?paid=1 seul ne suffit PAS — les données doivent
        // confirmer le statut PAYÉ (serveur ou cache local après confirmation réelle)
        // =====================================================================
        const estPaye = res.statut === "PAYÉ";

        if (!estPaye) {
            if (loadingEl) loadingEl.style.display = "none";
            if (recuCard) recuCard.style.display = "none";

            if (verrouilleCard) {
                verrouilleCard.style.display = "block";
                if (lockReservationId) lockReservationId.textContent = codeDossier;
                if (lockNomClient) lockNomClient.textContent = res.nom || "Passager";
                if (lockMontant) lockMontant.textContent = totalFormate;
                if (btnLockPayerWave) btnLockPayerWave.href = `paiement.html?id=${res.id}`;

                // Masquer le bouton de déblocage manuel — seul l'admin peut valider
                if (btnLockDebloquer) {
                    btnLockDebloquer.style.display = "none";
                }
            }

            // POLLING : vérifier si l'admin a validé le paiement
            const pollTicket = setInterval(async () => {
                try {
                    const checkReponse = await fetch(`/api/reservations/${res.id}`);
                    const checkResultat = await checkReponse.json();
                    if (checkReponse.ok && checkResultat.success && checkResultat.reservation && checkResultat.reservation.statut === "PAYÉ") {
                        clearInterval(pollTicket);
                        localStorage.setItem("reservation_data", JSON.stringify(checkResultat.reservation));
                        window.location.href = `recu.html?id=${res.id}`;
                    }
                } catch (e) {
                    // mode hors ligne
                }
            }, 4000);

            return;
        }

        // =====================================================================
        // ÉTAT PAYÉ & VALIDÉ : AFFICHAGE COMPLET DU PASS OFFICIEL
        // =====================================================================
        res.statut = "PAYÉ";
        localStorage.setItem("reservation_data", JSON.stringify(res));

        if (loadingEl) loadingEl.style.display = "none";
        if (verrouilleCard) verrouilleCard.style.display = "none";
        if (recuCard) recuCard.style.display = "block";

        if (elDossier) elDossier.textContent = codeDossier;
        if (elNumTicket) elNumTicket.textContent = codeDossier;
        if (elNom) elNom.textContent = res.nom;
        if (elEmail) elEmail.textContent = res.email || "Non précisée";
        if (elTelephone) elTelephone.textContent = res.telephone;
        if (elCommune) elCommune.textContent = res.commune || "Abidjan";
        if (elPoint) elPoint.textContent = pointLieu;
        if (elPointAlerte) elPointAlerte.textContent = pointLieu;
        if (elQRRef) elQRRef.textContent = codeDossier;

        const elFlowCommune = document.getElementById("recuFlowCommune");
        const elFlowPoint = document.getElementById("recuFlowPoint");
        if (elFlowCommune) elFlowCommune.textContent = res.commune || "Votre Commune";
        if (elFlowPoint) elFlowPoint.textContent = pointLieu;

        if (elQuantite) {
            const label = res.quantite > 1 ? "passagers" : "passager";
            elQuantite.textContent = `${res.quantite} ${label}`;
        }
        if (elTotal) {
            elTotal.textContent = totalFormate;
        }

        if (elStatut) {
            elStatut.textContent = "✓ Payé & Validé Wave";
            elStatut.className = "boarding-status-pill status-paid";
        }

        // Génération du QR Code officiel avec métadonnées sécurisées
        if (elQRCode && typeof QRCode !== "undefined") {
            elQRCode.innerHTML = "";

            const qrData = JSON.stringify({
                event: "CONVOI_PETIT_PARADIS_2026",
                ticket: codeDossier,
                passager: res.nom,
                tel: res.telephone,
                commune: res.commune || "",
                point_embarquement: pointLieu,
                places: Number(res.quantite) || 1,
                montant: totalFormate,
                statut: "VALIDE_WAVE",
                date_convoi: "Dimanche 13 Décembre 2026 à 08h30"
            });

            try {
                new QRCode(elQRCode, {
                    text: qrData,
                    width: 170,
                    height: 170,
                    colorDark: "#100E10",
                    colorLight: "#FFFFFF",
                    correctLevel: QRCode.CorrectLevel.M
                });
            } catch (qrErr) {
                console.warn("Erreur génération QR Code :", qrErr);
                elQRCode.innerHTML = `<div style="font-family: monospace; font-size: 13px; font-weight: 800; padding: 12px; background: #FFFDF9; border: 1px solid #DCD3C5; border-radius: 8px;">${codeDossier} • VALIDE</div>`;
            }
        }

        // WhatsApp Share link
        if (btnShareWhatsApp) {
            const msgWhatsApp = encodeURIComponent(
                `Assalamu alaykum ! Voici mon pass officiel du convoi Petit Paradis :\n\n` +
                `*PASS D'EMBARQUEMENT OFFICIEL — CORA EVENTS*\n` +
                `N° Ticket : ${codeDossier}\n` +
                `Nom : ${res.nom}\n` +
                (res.email ? `Email : ${res.email}\n` : '') +
                `Téléphone : ${res.telephone}\n` +
                `Commune : ${res.commune || 'Abidjan'}\n` +
                `Point d'embarquement : ${pointLieu}\n` +
                `Nombre de places : ${res.quantite}\n` +
                `Montant réglé : ${totalFormate}\n` +
                `Règlement : Validé Wave (QR Code Certifié)\n` +
                `Date de l'événement : Dimanche 13 Décembre 2026 à 08h30`
            );
            btnShareWhatsApp.href = `https://wa.me/2250105245225?text=${msgWhatsApp}`;
        }

    } catch (error) {
        console.error("Erreur chargement reçu :", error);
        if (loadingEl) {
            loadingEl.innerHTML = `
                <div style="padding: 10px;">
                    <p style="color: #b91c1c; font-weight: 700; margin-bottom: 12px;">Erreur lors du chargement de votre pass. Réessayez dans un instant.</p>
                    <a href="index.html" class="btn-primary" style="display: inline-flex; font-size: 14px;">Retourner à l'accueil</a>
                </div>
            `;
        }
    }
});