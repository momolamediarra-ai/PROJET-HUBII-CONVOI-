/**
 * GESTION DU TABLEAU DE BORD DÉLÉGUÉ — CORA EVENTS
 */

document.addEventListener("DOMContentLoaded", () => {
    let toutesLesReservations = [];
    let refreshTimer = null;
    const REFRESH_INTERVAL_MS = 5000;

    // Éléments DOM
    const loginView = document.getElementById("loginView");
    const dashboardView = document.getElementById("dashboardView");
    const btnLogout = document.getElementById("btnLogout");
    const adminLoginForm = document.getElementById("adminLoginForm");
    const adminEmail = document.getElementById("adminEmail");
    const adminPassword = document.getElementById("adminPassword");
    const btnLoginSubmit = document.getElementById("btnLoginSubmit");

    const kpiTotalPassagers = document.getElementById("kpiTotalPassagers");
    const kpiTotalDossiers = document.getElementById("kpiTotalDossiers");
    const kpiConfirmes = document.getElementById("kpiConfirmes");
    const kpiTotalRecettes = document.getElementById("kpiTotalRecettes");

    const searchInput = document.getElementById("searchInput");
    const filterCommune = document.getElementById("filterCommune");
    const filterStatut = document.getElementById("filterStatut");
    const tableBody = document.getElementById("reservationsTableBody");
    const tableCounter = document.getElementById("tableCounter");

    const toast = document.getElementById("toastNotice");
    const toastMsg = document.getElementById("toastMsg");
    const toastIcon = document.getElementById("toastIcon");

    function notifier(message, type = "info") {
        if (!toast || !toastMsg) return;
        toastMsg.textContent = message;
        toastIcon.textContent = type === "error" ? "⚠️" : (type === "success" ? "✅" : "ℹ️");
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 3500);
    }

    function demarrerActualisationTempsReel() {
        if (refreshTimer) return;

        refreshTimer = setInterval(() => {
            chargerReservations();
        }, REFRESH_INTERVAL_MS);
    }

    function arreterActualisationTempsReel() {
        if (!refreshTimer) return;

        clearInterval(refreshTimer);
        refreshTimer = null;
    }

    // --- 1. VÉRIFIER L'ÉTAT DE CONNEXION ---
    async function verifierSession() {
        try {
            const res = await fetch("/api/admin/me");
            const data = await res.json();

            if (data.success && data.admin) {
                afficherDashboard();
                chargerReservations();
                demarrerActualisationTempsReel();
            } else {
                afficherLogin();
                arreterActualisationTempsReel();
            }
        } catch (err) {
            console.error("Erreur session:", err);
            afficherLogin();
        }
    }

    function afficherLogin() {
        loginView.style.display = "block";
        dashboardView.style.display = "none";
        btnLogout.style.display = "none";
    }

    function afficherDashboard() {
        loginView.style.display = "none";
        dashboardView.style.display = "block";
        btnLogout.style.display = "inline-flex";
    }

    // --- 2. CONNEXION ---
    if (adminLoginForm) {
        adminLoginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            btnLoginSubmit.disabled = true;
            btnLoginSubmit.textContent = "Connexion en cours...";

            try {
                const res = await fetch("/api/admin/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: adminEmail.value.trim(),
                        password: adminPassword.value
                    })
                });

                const data = await res.json();

                if (!res.ok || !data.success) {
                    notifier(data.message || "Identifiants invalides.", "error");
                    btnLoginSubmit.disabled = false;
                    btnLoginSubmit.textContent = "Se connecter à l'espace délégués →";
                    return;
                }

                notifier("Connexion réussie ! Bienvenue.", "success");
                btnLoginSubmit.disabled = false;
                btnLoginSubmit.textContent = "Se connecter à l'espace délégués →";

                afficherDashboard();
                chargerReservations();
                demarrerActualisationTempsReel();

            } catch (err) {
                console.error("Erreur login:", err);
                notifier("Impossible de contacter le serveur.", "error");
                btnLoginSubmit.disabled = false;
                btnLoginSubmit.textContent = "Se connecter à l'espace délégués →";
            }
        });
    }

    // --- 3. DÉCONNEXION ---
    if (btnLogout) {
        btnLogout.addEventListener("click", async () => {
            try {
                await fetch("/api/admin/logout", { method: "POST" });
                notifier("Session clôturée avec succès.", "info");
                arreterActualisationTempsReel();
                afficherLogin();
            } catch (err) {
                console.error("Erreur logout:", err);
            }
        });
    }

    // --- 4. CHARGEMENT DES RÉSERVATIONS ---
    async function chargerReservations() {
        try {
            const res = await fetch("/api/reservations");
            const data = await res.json();

            toutesLesReservations = Array.isArray(data) ? data : [];
            actualiserKPIs(toutesLesReservations);
            appliquerFiltres();
        } catch (err) {
            console.error("Erreur chargement réservations:", err);
            tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: red; padding: 30px;">Erreur de chargement des données.</td></tr>`;
        }
    }

    // --- 5. ACTUALISATION DES KPIS ---
    function actualiserKPIs(reservations) {
        let totalPassagers = 0;
        let passagersConfirmes = 0;
        let recettesConfirmes = 0;

        reservations.forEach((r) => {
            const q = Number(r.quantite) || 1;
            totalPassagers += q;

            if (r.statut === "PAYÉ") {
                passagersConfirmes += q;
                recettesConfirmes += Number(r.total) || 0;
            }
        });

        if (kpiTotalPassagers) kpiTotalPassagers.textContent = totalPassagers;
        if (kpiTotalDossiers) kpiTotalDossiers.textContent = reservations.length;
        if (kpiConfirmes) kpiConfirmes.textContent = `${passagersConfirmes} / ${totalPassagers}`;
        if (kpiTotalRecettes) kpiTotalRecettes.textContent = `${recettesConfirmes.toLocaleString("fr-FR")} FCFA`;
    }

    // --- 6. FILTRAGE ET RENDU DU TABLEAU ---
    function appliquerFiltres() {
        const recherche = (searchInput ? searchInput.value.trim().toLowerCase() : "");
        const commune = (filterCommune ? filterCommune.value : "");
        const statut = (filterStatut ? filterStatut.value : "");

        const resultats = toutesLesReservations.filter((r) => {
            const matchSearch =
                !recherche ||
                (r.nom && r.nom.toLowerCase().includes(recherche)) ||
                (r.telephone && r.telephone.includes(recherche)) ||
                `#pp-${r.id}`.includes(recherche);

            const matchCommune = !commune || r.commune === commune;
            const matchStatut = !statut || r.statut === statut;

            return matchSearch && matchCommune && matchStatut;
        });

        if (tableCounter) {
            tableCounter.textContent = `${resultats.length} réservation(s) affichée(s)`;
        }

        rendreTableau(resultats);
    }

    function rendreTableau(liste) {
        if (!tableBody) return;

        if (liste.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 40px; color: var(--texte-muet);">
                        Aucune réservation ne correspond à vos critères de recherche.
                    </td>
                </tr>
            `;
            return;
        }

        const POINTS_ADMIN_MAP = {
            "Anyama": "Gare d'Anyama",
            "Bingerville": "Feu de Khesse",
            "Cocody": "Université F.H.B (UFHB)",
            "Marcory": "Gare de Bassam",
            "Treichville": "Gare de Bassam",
            "Koumassi": "Grand C. Koumassi",
            "Port-Bouët": "Grand C. Koumassi",
            "Gonzagueville": "Grand C. Koumassi",
            "Yopougon": "Siporex",
            "Adjamé": "Mairie d'Adjamé",
            "Abobo": "Gendarmerie d'Abobo",
            "Songon": "Selon effectif"
        };

        tableBody.innerHTML = liste.map((r) => {
            const estPaye = r.statut === "PAYÉ";
            const dateStr = r.date_creation ? new Date(r.date_creation).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }) : "—";
            const pointLieu = r.point_rassemblement || POINTS_ADMIN_MAP[r.commune] || "";

            return `
                <tr>
                    <td>
                        <strong>#PP-${String(r.id).padStart(4, "0")}</strong>
                    </td>
                    <td>
                        <strong style="color: var(--texte-sombre);">${r.nom}</strong>
                    </td>
                    <td>
                        <a href="tel:${r.telephone}" style="color: var(--or-fonce); font-weight: 600;">${r.telephone}</a>
                    </td>
                    <td>
                        <strong>${r.commune || "Non précisée"}</strong>
                        ${pointLieu ? `<br><small style="color: var(--or-fonce); font-weight: 700;">📍 ${pointLieu}</small>` : ''}
                    </td>
                    <td>
                        <strong>${r.quantite} place(s)</strong>
                    </td>
                    <td>
                        <strong>${(Number(r.total) || 0).toLocaleString("fr-FR")} FCFA</strong>
                    </td>
                    <td>
                        <span class="boarding-status-pill ${estPaye ? 'status-paid' : 'status-pending'}">
                            ${estPaye ? '✓ Payé' : '⏳ En attente'}
                        </span>
                    </td>
                    <td style="font-size: 12.5px; color: var(--texte-muet);">
                        ${dateStr}
                    </td>
                    <td class="btn-print-hide">
                        <div class="action-btn-group">
                            ${!estPaye ? `
                                <button type="button" class="btn-table-action btn-valider" onclick="validerPaiement(${r.id})">
                                    ✓ Valider
                                </button>
                            ` : ''}

                            <a href="recu.html?id=${r.id}" target="_blank" class="btn-table-action btn-recu">
                                🎫 Pass
                            </a>

                            <button type="button" class="btn-table-action btn-supprimer" onclick="supprimerReservation(${r.id}, '${r.nom.replace(/'/g, "\\'")}')">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    // --- 7. ACTIONS DU DÉLÉGUÉ ---
    window.validerPaiement = async (id) => {
        try {
            const res = await fetch(`/api/reservations/${id}/payer`, { method: "PUT" });
            const data = await res.json();

            if (data.success) {
                notifier(`Réservation #${id} validée avec succès !`, "success");
                chargerReservations();
            } else {
                notifier(data.message || "Impossible de valider.", "error");
            }
        } catch (err) {
            notifier("Erreur de connexion au serveur.", "error");
        }
    };

    window.supprimerReservation = async (id, nom) => {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer la réservation de ${nom} (#${id}) ?`)) {
            return;
        }

        try {
            const res = await fetch(`/api/reservations/${id}`, { method: "DELETE" });
            const data = await res.json();

            if (data.success) {
                notifier(`Réservation #${id} supprimée.`, "info");
                chargerReservations();
            } else {
                notifier(data.message || "Erreur de suppression.", "error");
            }
        } catch (err) {
            notifier("Erreur lors de la suppression.", "error");
        }
    };

    // Écouteurs de filtres
    if (searchInput) searchInput.addEventListener("input", appliquerFiltres);
    if (filterCommune) filterCommune.addEventListener("change", appliquerFiltres);
    if (filterStatut) filterStatut.addEventListener("change", appliquerFiltres);

    // Initialisation
    verifierSession();
});
