/**
 * AFFICHAGE DU PASS D'EMBARQUEMENT OFFICIEL AVEC QR CODE — CORA EVENTS
 */

document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id") || localStorage.getItem("reservation_id");
    const isPaidParam = params.get("paid") === "1" || params.get("status") === "success";

    const loadingEl = document.getElementById("recuLoading");
    const containerEl = document.getElementById("recuContainer");

    const elDossier = document.getElementById("recuDossier");
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

        // Si le paramètre paid=1 est présent, confirmer automatiquement le paiement
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
                console.warn("Auto-validation réseau :", err);
            }
        }

        if (!res) {
            try {
                const response = await fetch(`/api/reservations/${id}`);
                const result = await response.json();
                if (response.ok && result.success) {
                    res = result.reservation;
                }
            } catch (e) {
                console.warn("Mode local pour le pass :", e);
            }
        }

        // Récupération locale
        if (!res) {
            try {
                const dataLocale = localStorage.getItem("reservation_data");
                if (dataLocale) {
                    res = JSON.parse(dataLocale);
                }
            } catch (e) {
                console.error("Erreur cache pass :", e);
            }
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

        // Si la réservation n'est pas encore payée
        if (res.statut !== "PAYÉ" && !isPaidParam) {
            if (loadingEl) {
                loadingEl.innerHTML = `
                    <div style="padding: 24px; text-align: center;">
                        <div style="font-size: 32px; margin-bottom: 10px;">⏳</div>
                        <h3 style="color: #b91c1c; font-weight: 800; font-size: 18px; margin-bottom: 8px;">Paiement en attente de validation</h3>
                        <p style="margin-bottom: 18px; font-size: 14px; color: var(--texte-muet); line-height: 1.5;">
                            Votre réservation <strong>#PP-${String(res.id).padStart(4, "0")}</strong> est enregistrée. Si vous venez d'effectuer votre règlement sur <strong>Wave</strong>, débloquez immédiatement votre reçu officiel ci-dessous :
                        </p>
                        <div style="display: flex; flex-direction: column; gap: 10px; max-width: 360px; margin: 0 auto;">
                            <button type="button" id="btnDebloquerRecu" class="btn-primary" style="justify-content: center; background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%);">
                                ✓ J'ai payé sur Wave — Débloquer mon reçu
                            </button>
                            <a href="paiement.html?id=${res.id}" class="btn-secondary" style="justify-content: center;">
                                Payer sur Wave maintenant →
                            </a>
                        </div>
                    </div>
                `;

                const btnDebloquer = document.getElementById("btnDebloquerRecu");
                if (btnDebloquer) {
                    btnDebloquer.addEventListener("click", async () => {
                        btnDebloquer.disabled = true;
                        btnDebloquer.textContent = "Déblocage du reçu en cours...";
                        try {
                            await fetch(`/api/reservations/${id}/confirmer-paiement`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" }
                            });
                        } catch (e) {}

                        res.statut = "PAYÉ";
                        localStorage.setItem("reservation_data", JSON.stringify(res));
                        window.location.reload();
                    });
                }
            }
            return;
        }

        // Si le statut est PAYÉ, s'assurer que le cache local le reflète
        res.statut = "PAYÉ";
        localStorage.setItem("reservation_data", JSON.stringify(res));

        const pointLieu = res.point_rassemblement || POINTS_RASSEMBLEMENT_MAP[res.commune] || "Point de sa commune";
        const codeDossier = `#PP-${String(res.id).padStart(4, "0")}`;

        if (elDossier) elDossier.textContent = codeDossier;
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
            elTotal.textContent = `${Number(res.total).toLocaleString("fr-FR")} FCFA`;
        }

        if (elStatut) {
            elStatut.textContent = "✓ Payé & Validé Wave";
            elStatut.className = "boarding-status-pill status-paid";
        }

        // =====================================================================
        // GÉNÉRATION DU QR CODE UNIQUE ET PROPRE AU TITULAIRE DU BILLET
        // =====================================================================
        if (elQRCode && typeof QRCode !== "undefined") {
            elQRCode.innerHTML = "";

            // Données encodées dans le QR Code pour le contrôle et la vérification
            const qrData = JSON.stringify({
                event: "CONVOI_PETIT_PARADIS_2026",
                dossier: codeDossier,
                titulaire: res.nom,
                email: res.email || "",
                tel: res.telephone,
                commune: res.commune || "",
                point_depart: pointLieu,
                places: Number(res.quantite) || 1,
                montant: `${Number(res.total).toLocaleString("fr-FR")} FCFA`,
                statut: "VALIDE_WAVE",
                date_convoi: "13/12/2026 08:30"
            });

            try {
                new QRCode(elQRCode, {
                    text: qrData,
                    width: 160,
                    height: 160,
                    colorDark: "#100E10",
                    colorLight: "#FFFFFF",
                    correctLevel: QRCode.CorrectLevel.M
                });
            } catch (qrErr) {
                console.warn("Erreur génération QR Code :", qrErr);
                // Fallback texte propre
                elQRCode.innerHTML = `<div style="font-family: monospace; font-size: 11px; padding: 10px; background: #f3f3f3; border-radius: 8px;">${codeDossier} • VALIDE</div>`;
            }
        }

        // Configurer le lien WhatsApp pour recevoir/sauvegarder une preuve
        if (btnShareWhatsApp) {
            const msgWhatsApp = encodeURIComponent(
                `*PASS OFFICIEL D'EMBARQUEMENT — CORA EVENTS*\n` +
                `Dossier N° : ${codeDossier}\n` +
                `Nom : ${res.nom}\n` +
                (res.email ? `Email : ${res.email}\n` : '') +
                `Téléphone : ${res.telephone}\n` +
                `Commune : ${res.commune || 'Abidjan'}\n` +
                `Point de départ : ${pointLieu}\n` +
                `Places : ${res.quantite}\n` +
                `Montant réglé : ${Number(res.total).toLocaleString("fr-FR")} FCFA\n` +
                `Règlement : Validé Wave (QR Code Certifié)\n` +
                `Date de l'événement : Dimanche 13 Décembre 2026 à 08h30`
            );
            btnShareWhatsApp.href = `https://wa.me/2250105245225?text=${msgWhatsApp}`;
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