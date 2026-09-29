require("dotenv").config();

const email = process.env.ADMIN_EMAIL || "admin@coraevents.ci";
const password = process.env.ADMIN_PASSWORD || "CoraEvents2026";

console.log("Compte administrateur configuré pour Vercel/Turso.");
console.log("Email :", email);
console.log("Mot de passe :", password ? "défini" : "non défini");
console.log("La connexion admin utilise maintenant ADMIN_EMAIL et ADMIN_PASSWORD, sans table SQLite admins.");
