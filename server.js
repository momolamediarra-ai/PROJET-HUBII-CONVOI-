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

// Connexion administrateur
app.post("/api/admin/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Veuillez remplir tous les champs."
        });
    }

    const emailCorrect = safeCompare(email.trim(), getAdminEmail());
    const passwordCorrect = safeCompare(password, getAdminPassword());

    if (!emailCorrect || !passwordCorrect) {
        return res.status(401).json({
            success: false,
            message: "Email ou mot de passe incorrect."
        });
    }

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

// Enregistrer une réservation
app.post("/api/reservations", async (req, res) => {
    try {
        const {
            nom,
            telephone,
            commune,
            point_rassemblement,
            ticket,
            quantite,
            prix_unitaire,
            total
        } = req.body;

        if (!nom || !telephone) {
            return res.status(400).json({
                success: false,
                message: "Veuillez renseigner votre nom et votre numéro de téléphone."
            });
        }

        const safeTicket = ticket || "Pass Convoi Petit Paradis";
        const safeQuantite = Number(quantite) || 1;
        const safePrix = Number(prix_unitaire) || 3000;
        const safeTotal = Number(total) || (safeQuantite * safePrix);
        const safeCommune = commune || "Non précisée";
        const safePoint = point_rassemblement || "Point de sa commune";

        const result = await runQuery(`
            INSERT INTO reservations
            (nom, telephone, commune, point_rassemblement, ticket, quantite, prix_unitaire, total)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            nom,
            telephone,
            safeCommune,
            safePoint,
            safeTicket,
            safeQuantite,
            safePrix,
            safeTotal
        ]);

        res.json({
            success: true,
            reservation_id: Number(result.lastInsertRowid),
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

// Marquer une réservation comme PAYÉ (Validation client après SASPay)
app.post("/api/reservations/:id/confirmer-paiement", async (req, res) => {
    try {
        const id = Number(req.params.id);
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
            WHERE id = ?
        `, [id]);

        const updated = await getOne(`
            SELECT * FROM reservations
            WHERE id = ?
        `, [id]);

        res.json({
            success: true,
            message: "Paiement SASPay validé avec succès !",
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

// Webhook / Callback SASPay
app.all(["/api/webhook/saspay", "/api/saspay/callback"], async (req, res) => {
    try {
        const data = req.body || req.query || {};
        console.log("Notification reçue de SASPay :", data);

        const reservationId = data.custom_data || data.reservation_id || data.reference || data.id;

        if (reservationId) {
            const cleanId = Number(String(reservationId).replace(/[^0-9]/g, ""));
            if (cleanId) {
                await runQuery(`
                    UPDATE reservations
                    SET statut = 'PAYÉ'
                    WHERE id = ?
                `, [cleanId]);
            }
        }

        res.json({ success: true, message: "Webhook SASPay traité avec succès" });
    } catch (err) {
        console.error("Erreur Webhook SASPay :", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Marquer une réservation comme PAYÉ (par l'administrateur / délégué)
app.put("/api/reservations/:id/payer", requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
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
            WHERE id = ?
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
