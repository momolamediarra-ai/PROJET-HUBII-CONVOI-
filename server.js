const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { createClient } = require("@libsql/client");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Faire confiance aux proxys d'hébergement (Vercel, Railway, etc.)
app.set("trust proxy", 1);

// Autoriser les requêtes cross-origin
app.use(cors());

// Permettre de recevoir du JSON
app.use(express.json());

// Afficher les fichiers du site
app.use(express.static(__dirname));

// Donner accès aux fichiers JavaScript
app.use("/js", express.static(__dirname + "/js"));

// Connexion à Turso. En local, TURSO_DATABASE_URL peut rester vide pour utiliser database.db.
const db = createClient({
    url: process.env.TURSO_DATABASE_URL || "file:database.db",
    authToken: process.env.TURSO_AUTH_TOKEN
});

let databaseReadyPromise;

async function initDatabase() {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nom TEXT NOT NULL,
            email TEXT,
            telephone TEXT NOT NULL,
            commune TEXT,
            point_rassemblement TEXT,
            ticket TEXT NOT NULL,
            quantite INTEGER NOT NULL,
            prix_unitaire INTEGER NOT NULL,
            total INTEGER NOT NULL,
            statut TEXT DEFAULT 'EN_ATTENTE',
            date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    try {
        await db.execute(`ALTER TABLE reservations ADD COLUMN email TEXT`);
    } catch (e) {
        // Colonne déjà présente
    }

    try {
        await db.execute(`ALTER TABLE reservations ADD COLUMN commune TEXT`);
    } catch (e) {
        // Colonne déjà présente
    }

    try {
        await db.execute(`ALTER TABLE reservations ADD COLUMN point_rassemblement TEXT`);
    } catch (e) {
        // Colonne déjà présente
    }
}

function ensureDatabase() {
    if (!databaseReadyPromise) {
        databaseReadyPromise = initDatabase();
    }

    return databaseReadyPromise;
}

async function runQuery(sql, args = []) {
    await ensureDatabase();
    return db.execute({ sql, args });
}

async function getOne(sql, args = []) {
    const result = await runQuery(sql, args);
    return result.rows[0] || null;
}

function getAll(sql, args = []) {
    return runQuery(sql, args).then((result) => result.rows);
}

function getAdminEmail() {
    return process.env.ADMIN_EMAIL || "admin@coraevents.ci";
}

function getAdminPassword() {
    return process.env.ADMIN_PASSWORD || "CoraEvents2026";
}

function getSessionSecret() {
    return process.env.SESSION_SECRET || "petit-paradis-secret-local";
}

function getPrixUnitaire() {
    // Prix officiel par passager (FCFA). Le serveur reste la seule source de vérité (SEC-04).
    return Number(process.env.PRIX_UNITAIRE) || 3000;
}

function getCapaciteTotale() {
    // Plafond de places du convoi (SEC-05). 0 ou absent = aucune limite.
    return Number(process.env.CAPACITE_TOTALE) || 0;
}

async function getPlacesUtilisees() {
    const row = await getOne(`
        SELECT COALESCE(SUM(quantite), 0) AS total
        FROM reservations
        WHERE statut IS NULL OR statut != 'ANNULÉ'
    `);
    return Number(row ? row.total : 0) || 0;
}

function safeCompare(value, expected) {
    const left = Buffer.from(String(value || ""));
    const right = Buffer.from(String(expected || ""));

    if (left.length !== right.length) {
        return false;
    }

    return crypto.timingSafeEqual(left, right);
}

function createAdminToken() {
    return crypto
        .createHmac("sha256", getSessionSecret())
        .update(getAdminEmail())
        .digest("hex");
}

function parseCookies(req) {
    const header = req.headers.cookie || "";

    return header.split(";").reduce((cookies, item) => {
        const index = item.indexOf("=");
        if (index === -1) return cookies;

        const key = item.slice(0, index).trim();
        const value = item.slice(index + 1).trim();
        cookies[key] = decodeURIComponent(value);
        return cookies;
    }, {});
}

function isAdminAuthenticated(req) {
    const cookies = parseCookies(req);
    return safeCompare(cookies.cora_admin_token, createAdminToken());
}

function adminCookie(value, maxAge) {
    const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
    return `cora_admin_token=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge};${secure}`;
}

function requireAdmin(req, res, next) {
    if (!isAdminAuthenticated(req)) {
        return res.status(401).json({
            success: false,
            message: "Accès administrateur requis."
        });
    }

    next();
}

// Route de test
app.get("/api/test", async (req, res) => {
    try {
        await ensureDatabase();
        res.json({
            success: true,
            message: "Serveur Petit Paradis opérationnel avec Turso 🚀"
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Erreur de connexion à la base de données : " + err.message
        });
    }
});

// --- SÉCURITÉ & RATE LIMITING ADMIN ---
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_PERIOD_MS = 15 * 60 * 1000; // 15 minutes

function checkLoginRateLimit(ip) {
    const record = loginAttempts.get(ip);
    if (!record) return { allowed: true };

    const now = Date.now();
    if (record.lockedUntil && record.lockedUntil > now) {
        const remainingMinutes = Math.ceil((record.lockedUntil - now) / 60000);
        return {
            allowed: false,
            message: `Trop de tentatives échouées. Accès temporairement verrouillé pour des raisons de sécurité. Réessayez dans ${remainingMinutes} minute(s).`
        };
    }

    if (record.lockedUntil && record.lockedUntil <= now) {
        loginAttempts.delete(ip);
        return { allowed: true };
    }

    return { allowed: true };
}

function recordLoginFailure(ip) {
    const now = Date.now();
    const record = loginAttempts.get(ip) || { count: 0, firstAttempt: now };
    record.count += 1;
    record.lastAttempt = now;

    if (record.count >= MAX_LOGIN_ATTEMPTS) {
        record.lockedUntil = now + LOCKOUT_PERIOD_MS;
    }

    loginAttempts.set(ip, record);
}

function resetLoginAttempts(ip) {
    loginAttempts.delete(ip);
}

// Connexion administrateur avec protection brute-force
app.post("/api/admin/login", (req, res) => {
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "local";
    const rateCheck = checkLoginRateLimit(clientIp);
    if (!rateCheck.allowed) {
        return res.status(429).json({
            success: false,
            message: rateCheck.message
        });
    }

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Remplissez tous les champs, s'il vous plaît."
        });
    }

    const emailCorrect = safeCompare(email.trim(), getAdminEmail());
    const passwordCorrect = safeCompare(password, getAdminPassword());

    if (!emailCorrect || !passwordCorrect) {
        recordLoginFailure(clientIp);
        const record = loginAttempts.get(clientIp);
        const remainingAttempts = MAX_LOGIN_ATTEMPTS - (record ? record.count : 1);

        return res.status(401).json({
            success: false,
            message: remainingAttempts > 0
                ? `Identifiants incorrects. (${remainingAttempts} tentative(s) restante(s))`
                : "Identifiants incorrects. Accès verrouillé pendant 15 minutes."
        });
    }

    resetLoginAttempts(clientIp);
    res.setHeader("Set-Cookie", adminCookie(createAdminToken(), 60 * 60 * 24 * 7));
    res.json({
        success: true,
        message: "Connexion réussie !"
    });
});

// Vérifier si l'administrateur est connecté
app.get("/api/admin/me", (req, res) => {
    if (!isAdminAuthenticated(req)) {
        return res.status(401).json({
            success: false,
            message: "Non connecté."
        });
    }

    res.json({
        success: true,
        admin: {
            id: 1,
            email: getAdminEmail()
        }
    });
});

// Déconnexion administrateur
app.post("/api/admin/logout", (req, res) => {
    res.setHeader("Set-Cookie", adminCookie("", 0));
    res.json({
        success: true,
        message: "Déconnexion réussie."
    });
});

// Enregistrer une réservation — montants calculés côté serveur (SEC-04) & plafond de places atomique (SEC-05)
app.post("/api/reservations", async (req, res) => {
    try {
        const {
            nom,
            email,
            telephone,
            commune,
            point_rassemblement,
            ticket,
            quantite
        } = req.body;

        if (!nom || !telephone) {
            return res.status(400).json({
                success: false,
                message: "Il nous faut votre nom et votre numéro de téléphone, s'il vous plaît."
            });
        }

        const safeNom = String(nom).trim().slice(0, 120);
        const safeTelephone = String(telephone).replace(/[^0-9+]/g, "").trim();
        const safeEmail = String(email || "").trim().slice(0, 160);
        const safeTicket = ticket ? String(ticket).slice(0, 80) : "Pass Convoi Petit Paradis";
        const safeCommune = String(commune || "Non précisée").slice(0, 60);
        const safePoint = String(point_rassemblement || "Point de sa commune").slice(0, 120);

        if (safeNom.length < 2) {
            return res.status(400).json({
                success: false,
                message: "Votre nom semble trop court — écrivez-le en entier, s'il vous plaît."
            });
        }

        if (safeTelephone.length < 8 || safeTelephone.length > 15) {
            return res.status(400).json({
                success: false,
                message: "Ce numéro de téléphone n'est pas valide (8 à 15 chiffres). Vérifiez, s'il vous plaît."
            });
        }

        if (safeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail)) {
            return res.status(400).json({
                success: false,
                message: "L'adresse email ne semble pas bonne — vérifiez-la, s'il vous plaît."
            });
        }

        const quantiteNum = Number(quantite);
        if (!Number.isInteger(quantiteNum) || quantiteNum < 1 || quantiteNum > 10) {
            return res.status(400).json({
                success: false,
                message: "Quantité invalide : de 1 à 10 passagers par réservation. Pour un groupe plus grand, appelez-nous directement."
            });
        }

        // SEC-04 : le prix et le total sont calculés ici — jamais depuis les valeurs envoyées par le client
        const prixUnitaire = getPrixUnitaire();
        const totalCalcule = quantiteNum * prixUnitaire;

        // Anti-doublon : réutiliser une réservation identique déjà en attente
        const recentPending = await getOne(`
            SELECT id, statut FROM reservations
            WHERE telephone = ? AND nom = ? AND statut = 'EN_ATTENTE'
            ORDER BY id DESC LIMIT 1
        `, [safeTelephone, safeNom]);

        if (recentPending) {
            return res.json({
                success: true,
                reservation_id: Number(recentPending.id),
                message: "Réservation en attente existante réutilisée.",
                is_duplicate: true
            });
        }

        const capacite = getCapaciteTotale();
        let result;

        if (capacite > 0) {
            // SEC-05 : insertion conditionnelle atomique — refusée si le plafond de places serait dépassé
            result = await runQuery(`
                INSERT INTO reservations
                (nom, email, telephone, commune, point_rassemblement, ticket, quantite, prix_unitaire, total)
                SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
                WHERE (SELECT COALESCE(SUM(quantite), 0) FROM reservations WHERE statut IS NULL OR statut != 'ANNULÉ') + ? <= ?
            `, [
                safeNom,
                safeEmail,
                safeTelephone,
                safeCommune,
                safePoint,
                safeTicket,
                quantiteNum,
                prixUnitaire,
                totalCalcule,
                quantiteNum,
                capacite
            ]);

            if (Number(result.rowsAffected) === 0) {
                const restantes = Math.max(capacite - await getPlacesUtilisees(), 0);
                return res.status(409).json({
                    success: false,
                    message: restantes > 0
                        ? `Il ne reste que ${restantes} place(s) pour ${quantiteNum} passager(s) demandé(s). Réduisez la quantité ou appelez-nous vite.`
                        : "Le convoi est complet : toutes les places sont déjà prises. Merci de votre compréhension !",
                    places_restantes: restantes
                });
            }
        } else {
            result = await runQuery(`
                INSERT INTO reservations
                (nom, email, telephone, commune, point_rassemblement, ticket, quantite, prix_unitaire, total)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                safeNom,
                safeEmail,
                safeTelephone,
                safeCommune,
                safePoint,
                safeTicket,
                quantiteNum,
                prixUnitaire,
                totalCalcule
            ]);
        }

        res.json({
            success: true,
            reservation_id: Number(result.lastInsertRowid),
            prix_unitaire: prixUnitaire,
            total: totalCalcule,
            message: "Réservation enregistrée avec succès."
        });
    } catch (err) {
        console.error("Erreur enregistrement réservation :", err);
        res.status(500).json({
            success: false,
            message: "Erreur lors de l'enregistrement : " + err.message
        });
    }
});

// Occupation des places (agrégats publics, aucune donnée personnelle) — SEC-05
app.get("/api/capacite", async (req, res) => {
    try {
        const capacite = getCapaciteTotale();
        const utilisees = await getPlacesUtilisees();

        const rows = await getAll(`
            SELECT commune, COALESCE(SUM(quantite), 0) AS passagers
            FROM reservations
            WHERE statut IS NULL OR statut != 'ANNULÉ'
            GROUP BY commune
        `);

        const parCommune = {};
        rows.forEach((row) => {
            parCommune[row.commune || "Non précisée"] = Number(row.passagers) || 0;
        });

        res.json({
            success: true,
            capacite_totale: capacite,
            places_utilisees: utilisees,
            places_restantes: capacite > 0 ? Math.max(capacite - utilisees, 0) : null,
            par_commune: parCommune
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Erreur lors du calcul de l'occupation des places : " + err.message
        });
    }
});

// Récupérer toutes les réservations
app.get("/api/reservations", requireAdmin, async (req, res) => {
    try {
        const reservations = await getAll(`
            SELECT *
            FROM reservations
            ORDER BY id DESC
        `);

        res.json(reservations);
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Erreur lors du chargement des réservations : " + err.message
        });
    }
});

// Récupérer une réservation par son ID
app.get("/api/reservations/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const reservation = await getOne(`
            SELECT *
            FROM reservations
            WHERE id = ?
        `, [id]);

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: "Réservation introuvable."
            });
        }

        res.json({
            success: true,
            reservation: reservation
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Erreur lors du chargement de la réservation : " + err.message
        });
    }
});

// Marquer une réservation comme PAYÉ (Validation client après Wave - SEC-03 Idempotent & Atomique)
app.post("/api/reservations/:id/confirmer-paiement", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!id || isNaN(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Identifiant de réservation invalide."
            });
        }

        const reservation = await getOne(`
            SELECT * FROM reservations
            WHERE id = ?
        `, [id]);

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: "Réservation introuvable."
            });
        }

        // Idempotence : si déjà payé, on renvoie un statut positif sans effet de bord doublon
        if (reservation.statut === "PAYÉ") {
            return res.json({
                success: true,
                message: "Paiement déjà validé et sécurisé.",
                dejaPaye: true,
                reservation: reservation
            });
        }

        // Mise à jour atomique sécurisée contre les accès concurrents
        await runQuery(`
            UPDATE reservations
            SET statut = 'PAYÉ'
            WHERE id = ? AND (statut != 'PAYÉ' OR statut IS NULL)
        `, [id]);

        const updated = await getOne(`
            SELECT * FROM reservations
            WHERE id = ?
        `, [id]);

        res.json({
            success: true,
            message: "Paiement Wave validé avec succès !",
            dejaPaye: false,
            reservation: updated
        });
    } catch (err) {
        console.error("Erreur confirmation paiement client :", err);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la confirmation du paiement : " + err.message
        });
    }
});

// Webhook / Callback Wave & Passerelles (Atomique)
app.all(["/api/webhook/wave", "/api/wave/callback", "/api/webhook/saspay", "/api/saspay/callback"], async (req, res) => {
    try {
        const data = req.body || req.query || {};
        console.log("Notification de paiement reçue :", data);

        const reservationId = data.custom_data || data.reservation_id || data.reference || data.id;

        if (reservationId) {
            const cleanId = Number(String(reservationId).replace(/[^0-9]/g, ""));
            if (cleanId) {
                await runQuery(`
                    UPDATE reservations
                    SET statut = 'PAYÉ'
                    WHERE id = ? AND (statut != 'PAYÉ' OR statut IS NULL)
                `, [cleanId]);
            }
        }

        res.json({ success: true, message: "Webhook de paiement traité avec succès" });
    } catch (err) {
        console.error("Erreur Webhook paiement :", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Marquer une réservation comme PAYÉ (par l'administrateur / délégué - Idempotent)
app.put("/api/reservations/:id/payer", requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!id || isNaN(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Identifiant de réservation invalide."
            });
        }

        const reservation = await getOne(`
            SELECT * FROM reservations
            WHERE id = ?
        `, [id]);

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: "Réservation introuvable."
            });
        }

        await runQuery(`
            UPDATE reservations
            SET statut = 'PAYÉ'
            WHERE id = ? AND (statut != 'PAYÉ' OR statut IS NULL)
        `, [id]);

        res.json({
            success: true,
            message: "Paiement confirmé avec succès."
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Erreur lors de la validation du paiement : " + err.message
        });
    }
});

// Supprimer une réservation (gestion délégué/admin)
app.delete("/api/reservations/:id", requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        await runQuery(`DELETE FROM reservations WHERE id = ?`, [id]);

        res.json({
            success: true,
            message: "Réservation supprimée avec succès."
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Erreur lors de la suppression : " + err.message
        });
    }
});

module.exports = app;

// Lancer le serveur en local uniquement. Sur Vercel, l'app Express est exportée.
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Petit Paradis lancé sur http://localhost:${PORT}`);
    });
}
