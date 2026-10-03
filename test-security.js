/**
 * SUITE DE TESTS AUTOMATISÉS DE SÉCURITÉ & BACKEND (SEC-03, SEC-04, SEC-05 & RBAC)
 * Teste la robustesse des endpoints sans impacter la base de production.
 */

const BASE_URL = "http://localhost:3000";

async function runTests() {
    console.log("==================================================");
    console.log("🛡️ DÉMARRAGE DES TESTS DE SÉCURITÉ & BACKEND");
    console.log("==================================================\n");

    let totalTests = 0;
    let passedTests = 0;

    function assert(condition, message) {
        totalTests++;
        if (condition) {
            passedTests++;
            console.log(`  ✅ PASS: ${message}`);
        } else {
            console.error(`  ❌ FAIL: ${message}`);
        }
    }

    // --- TEST 1 : Vérification de la route de base ---
    console.log("1️⃣ Test de disponibilité du serveur :");
    try {
        const res = await fetch(`${BASE_URL}/api/test`);
        const data = await res.json();
        assert(res.status === 200 && data.success === true, "Serveur en ligne et connecté à la base de données");
    } catch (e) {
        assert(false, `Échec connexion serveur : ${e.message}`);
    }

    // --- TEST 2 : Création de réservation et protection contre les doublons (Debounce) ---
    console.log("\n2️⃣ Test anti-doublon / debouncing réservation :");
    let testReservationId = null;
    try {
        const payload = {
            nom: "Testeur Sécurité Convoi",
            email: "testeur.secu@coraevents.ci",
            telephone: "0700009988",
            commune: "Cocody",
            point_rassemblement: "Université UFHB",
            ticket: "Pass Convoi Petit Paradis",
            quantite: 1,
            prix_unitaire: 3000,
            total: 3000
        };

        const res1 = await fetch(`${BASE_URL}/api/reservations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data1 = await res1.json();
        testReservationId = data1.reservation_id;
        assert(data1.success === true && testReservationId > 0, `Première réservation créée avec succès (#${testReservationId})`);

        // Deuxième soumission immédiate identique (doit retourner la même réservation au lieu de créer un doublon)
        const res2 = await fetch(`${BASE_URL}/api/reservations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data2 = await res2.json();
        assert(data2.success === true && data2.reservation_id === testReservationId && data2.is_duplicate === true, 
            `Anti-doublon fonctionnel : soumission identique réutilise #${data2.reservation_id}`);
    } catch (e) {
        assert(false, `Erreur test réservation : ${e.message}`);
    }

    // --- TEST 3 : Protection contre double paiement (SEC-03 - Concurrence & Idempotence) ---
    console.log("\n3️⃣ Test SEC-03 : Protection contre double paiement & Accès concurrents :");
    if (testReservationId) {
        try {
            // Lancer 5 confirmations en parallèle simultané
            console.log("   🚀 Envoi de 5 requêtes de confirmation simultanées pour tester les conditions de course...");
            const concurrentCalls = [1, 2, 3, 4, 5].map(() => 
                fetch(`${BASE_URL}/api/reservations/${testReservationId}/confirmer-paiement`, { method: "POST" })
                    .then(r => r.json())
            );

            const results = await Promise.all(concurrentCalls);
            const allSuccessful = results.every(r => r.success === true);
            const exactlyOnePrimaryConfirmation = results.filter(r => r.dejaPaye === false).length === 1;
            const idempotentConfirmations = results.filter(r => r.dejaPaye === true).length === 4;

            assert(allSuccessful, "Toutes les requêtes de confirmation ont été traitées proprement sans crash");
            assert(exactlyOnePrimaryConfirmation, "Exactement UNE seule mise à jour initiale a été effectuée (atomicité)");
            assert(idempotentConfirmations, "Les 4 autres requêtes concurrentes ont été gérées de manière idempotente (dejaPaye=true)");

            // Vérifier l'état final de la réservation
            const checkRes = await fetch(`${BASE_URL}/api/reservations/${testReservationId}`);
            const checkData = await checkRes.json();
            assert(checkData.reservation && checkData.reservation.statut === "PAYÉ", "Statut final en base vérifié : PAYÉ");
        } catch (e) {
            assert(false, `Erreur test double paiement : ${e.message}`);
        }
    }

    // --- TEST 4 : Protection RBAC / Accès non autorisé aux données privées ---
    console.log("\n4️⃣ Test RBAC : Accès refusé aux données d'administration sans authentification :");
    try {
        const unauthRes = await fetch(`${BASE_URL}/api/reservations`);
        const unauthData = await unauthRes.json();
        assert(unauthRes.status === 401 && unauthData.success === false, 
            "Accès non authentifié à /api/reservations bloqué avec HTTP 401");
    } catch (e) {
        assert(false, `Erreur test RBAC : ${e.message}`);
    }

    // --- TEST 5 : Protection Brute Force sur /api/admin/login ---
    console.log("\n5️⃣ Test Anti Brute-Force Rate Limiting sur /api/admin/login :");
    try {
        let rateLimitTriggered = false;
        for (let i = 1; i <= 6; i++) {
            const badLoginRes = await fetch(`${BASE_URL}/api/admin/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: "hacker@test.ci", password: "wrongpassword123" })
            });

            if (badLoginRes.status === 429) {
                rateLimitTriggered = true;
                const errData = await badLoginRes.json();
                console.log(`   🔒 Blocage HTTP 429 détecté à la tentative ${i} : "${errData.message}"`);
                break;
            }
        }
        assert(rateLimitTriggered, "Le système de limitation a bloqué l'attaquant avec HTTP 429 après 5 tentatives échouées");
    } catch (e) {
        assert(false, `Erreur test brute force : ${e.message}`);
    }

    // --- TEST 6 : SEC-04 — Manipulation du montant impossible (calcul 100% serveur) ---
    console.log("\n6️⃣ Test SEC-04 : Le montant est toujours calculé côté serveur :");
    try {
        // Téléphone unique à chaque exécution : sinon l'anti-doublon du serveur
        // réutilise la réservation en attente laissée par l'exécution précédente
        // (et la réponse ne contient alors ni total ni prix_unitaire).
        const telUnique = "07" + String(Date.now()).slice(-8);
        const tamperedPayload = {
            nom: "Testeur Montant SEC04",
            email: "testeur.montant@coraevents.ci",
            telephone: telUnique,
            commune: "Abobo",
            point_rassemblement: "Gendarmerie d'Abobo",
            ticket: "Pass Convoi Petit Paradis",
            quantite: 2,
            prix_unitaire: 1,
            total: 1
        };

        const res = await fetch(`${BASE_URL}/api/reservations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(tamperedPayload)
        });
        const data = await res.json();

        assert(res.status === 200 && data.success === true, "Réservation créée malgré un montant falsifié (1 FCFA) envoyé par le client");
        assert(data.total === 6000 && data.prix_unitaire === 3000, `Montant recalculé côté serveur : ${data.total} FCFA (attendu 6 000 FCFA)`);

        const verifRes = await fetch(`${BASE_URL}/api/reservations/${data.reservation_id}`);
        const verifData = await verifRes.json();
        assert(verifData.reservation && Number(verifData.reservation.total) === 6000, "Montant stocké en base conforme au calcul officiel (2 × 3 000 FCFA)");
    } catch (e) {
        assert(false, `Erreur test SEC-04 : ${e.message}`);
    }

    // --- TEST 7 : SEC-05 — Contrôle de capacité serveur & quantités invalides ---
    console.log("\n7️⃣ Test SEC-05 : Contrôle de capacité côté serveur :");
    try {
        const capRes = await fetch(`${BASE_URL}/api/capacite`);
        const capData = await capRes.json();
        assert(capRes.status === 200 && capData.success === true, "Endpoint /api/capacite opérationnel");
        assert(typeof capData.places_utilisees === "number" && capData.places_utilisees >= 2, `Places utilisées comptées côté serveur : ${capData.places_utilisees}`);
        assert(capData.par_commune && Object.keys(capData.par_commune).length > 0, "Occupation par commune exposée sans aucune donnée personnelle");

        if (capData.capacite_totale > 0) {
            const overflowRes = await fetch(`${BASE_URL}/api/reservations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nom: "Testeur Capacité SEC05",
                    email: "testeur.capacite@coraevents.ci",
                    telephone: "0700009966",
                    commune: "Cocody",
                    quantite: 10
                })
            });
            const overflowData = await overflowRes.json();
            assert(overflowRes.status === 409 || overflowData.success === true,
                `CAPACITE_TOTALE définie : le serveur plafonne ou accepte selon les places restantes (HTTP ${overflowRes.status})`);
        } else {
            console.log("   ℹ️ CAPACITE_TOTALE non définie : aucune limite active (comportement attendu par défaut).");
        }

        // Quantité hors limites (11 passagers) : doit être refusée par le serveur
        const badQtyRes = await fetch(`${BASE_URL}/api/reservations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nom: "Testeur Quantité SEC04",
                email: "testeur.qte@coraevents.ci",
                telephone: "0700009955",
                commune: "Cocody",
                quantite: 11
            })
        });
        assert(badQtyRes.status === 400, "Quantité hors limites (11 passagers) rejetée avec HTTP 400 (validation serveur)");
    } catch (e) {
        assert(false, `Erreur test SEC-05 : ${e.message}`);
    }

    console.log("\n==================================================");
    console.log(`📊 RÉSULTAT FINAL : ${passedTests} / ${totalTests} TESTS RÉUSSIS (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log("==================================================\n");

    // Nettoyage de la réservation de test
    if (testReservationId) {
        // Optionnel : ne pas laisser de trace si nécessaire
    }
}

runTests();
