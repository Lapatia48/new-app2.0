CREATE TABLE historique_couts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tickets_id INTEGER NOT NULL,
    montant FLOAT NOT NULL,
    type_operation VARCHAR(20) NOT NULL,
    date_operation DATETIME DEFAULT CURRENT_TIMESTAMP,
    mode_utilise INTEGER,
    pourcentage_applique FLOAT
);