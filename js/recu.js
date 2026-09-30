/**
 * AFFICHAGE DU PASS D'EMBARQUEMENT OFFICIEL — CORA EVENTS
 */

document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id") || localStorage.getItem("reservation_id");

    const loadingEl = document.getElementById("recuLoading");
    const containerEl = document.getElementById("recuContainer");

    const elDossier = document.getElementById("recuDossier");
    const elNom = document.getElementById("recuNom");
    const elTelephone = document.getElementById("recuTelephone");
    const elCommune = document.getElementById("recuCommune");
    const elPoint = document.getElementById("recuPoint");
    const elPointAlerte = document.getElementById("recuPointAlerte");
    const elQuantite = document.getElementById("recuQuantite");
    const elTotal = document.getElementById("recuTotal");
    const elStatut = document.getElementById("recuStatut");
    const elBarcode = document.getElementById("recuBarcode");

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
                <div style="padding: 20px;">
                    <p style="color: #b91c1c; font-weight: 700; margin-bottom: 12px;">Numéro de réservation introuvable.</p>
                    <a href="index.html#billetterie" class="btn-primary" style="display: inline-flex; font-size: 14px;">Retourner à la billetterie</a>
                </div>
            `;
        }
        return;
    }

    try {
        let res = null;

        try {
            const response = await fetch(`/api/reservations/${id}`);
            const result = await response.json();
            if (response.ok && result.success) {
                res = result.reservation;
            }
        } catch (e) {
            console.warn("Mode local pour le pass :", e);
        }

        if (!res) {
            if (loadingEl) {
                loadingEl.innerHTML = `
                    <div style="padding: 20px;">
                        <p style="color: #b91c1c; font-weight: 700; margin-bottom: 12px;">Dossier de réservation #${id} introuvable.</p>
                        <a href="index.html#billetterie" class="btn-primary" style="display: inline-flex; font-size: 14px;">Retourner à la billetterie</a>
                    </div>
                `;
            }
            return;
        }

        // Le Pass d'embarquement n'est délivré qu'après confirmation du paiement
        if (res.statut !== "PAYÉ") {
            if (loadingEl) {
                loadingEl.innerHTML = `
                    <div style="padding: 20px;">
                        <p style="color: #b91c1c; font-weight: 700; margin-bottom: 8px;">⏳ Paiement non confirmé</p>
                        <p style="margin-bottom: 16px;">Votre réservation <strong>#PP-${String(res.id).padStart(4, "0")}</strong> est bien enregistrée, mais le Pass d'embarquement n'est délivré qu'après validation de votre paiement SASPay.</p>
                        <a href="paiement.html?id=${res.id}" class="btn-primary" style="display: inline-flex; font-size: 14px; margin-bottom: 10px;">Finaliser mon paiement →</a><br>
                        <a href="recu.html?id=${res.id}" style="font-size: 13px; color: var(--or-fonce); font-weight: 600;">J'ai déjà payé — vérifier à nouveau</a>
                    </div>
                `;
            }
            return;
        }

        const pointLieu = res.point_rassemblement || POINTS_RASSEMBLEMENT_MAP[res.commune] || "Point de sa commune";

        if (elDossier) elDossier.textContent = `#PP-${String(res.id).padStart(4, "0")}`;
        if (elNom) elNom.textContent = res.nom;
        if (elTelephone) elTelephone.textContent = res.telephone;
        if (elCommune) elCommune.textContent = res.commune || "Abidjan";
        if (elPoint) elPoint.textContent = pointLieu;
        if (elPointAlerte) elPointAlerte.textContent = pointLieu;

        const elFlowCommune = document.getElementById("recuFlowCommune");
        const elFlowPoint = document.getElementById("recuFlowPoint");
        if (elFlowCommune) elFlowCommune.textContent = res.commune || "Votre Commune";
        if (elFlowPoint) elFlowPoint.textContent = pointLieu;

        if (elQuantite) {
            const label = res.quantite > 1 ? "passagers" : "passager";
            elQuantite.textContent = `${res.quantite} ${label}`;
        }
        if (elTotal) {
            elTotal.textContent = `${Number(res.total).toLocaleString("fr-FR")} FCFA`;
        }

        if (elStatut) {
            if (res.statut === "PAYÉ") {
                elStatut.textContent = "Payé & Validé";
                elStatut.className = "boarding-status-pill status-paid";
            } else {
                elStatut.textContent = "En attente de paiement";
                elStatut.className = "boarding-status-pill status-pending";
            }
        }

        if (elBarcode) {
            elBarcode.textContent = `||| ${String(res.id).padStart(4, "0")} || 2026-PP |||||`;
        }

        if (loadingEl) loadingEl.style.display = "none";
        if (containerEl) containerEl.style.display = "block";

    } catch (error) {
        console.error("Erreur chargement reçu :", error);
        if (loadingEl) {
            loadingEl.innerHTML = `
                <div style="padding: 20px;">
                    <p style="color: #b91c1c; font-weight: 700; margin-bottom: 12px;">Erreur lors de la récupération de votre pass.</p>
                    <a href="index.html" class="btn-primary" style="display: inline-flex; font-size: 14px;">Retourner à l'accueil</a>
                </div>
            `;
        }
    }
});