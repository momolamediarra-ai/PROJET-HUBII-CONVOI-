const { createClient } = require("@libsql/client");

async function main() {
    const db = createClient({ url: "file:c:/Users/Unknow/Desktop/lamte/PROJET-HUBII-CONVOI-/database.db" });

    const before = await db.execute("PRAGMA journal_mode;");
    console.log("Mode actuel :", before.rows[0][0]);

    await db.execute("PRAGMA journal_mode=WAL;");
    await db.execute("PRAGMA wal_checkpoint(TRUNCATE);");

    const after = await db.execute("PRAGMA journal_mode;");
    console.log("Nouveau mode :", after.rows[0][0]);

    const reservations = await db.execute("SELECT count(*) AS total FROM reservations");
    console.log("Réservations dans le fichier :", reservations.rows[0].total);

    const admins = await db.execute("SELECT count(*) AS total FROM admins");
    console.log("Admins dans le fichier (ignoré par le nouveau serveur) :", admins.rows[0].total);
}

main().catch((err) => {
    console.error("Erreur de conversion :", err.message);
    process.exit(1);
});
