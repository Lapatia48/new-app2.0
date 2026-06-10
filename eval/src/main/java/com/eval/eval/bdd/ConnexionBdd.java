package com.eval.eval.bdd;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

// ============================================================================
// ConnexionBdd.java   (package "bdd" = base de donnees)
// ----------------------------------------------------------------------------
// UN SEUL endroit dans tout le projet qui sait comment se connecter a la base
// SQLite. Les autres classes (le repository) demandent juste une connexion
// avec ouvrir(), sans savoir ou se trouve le fichier ni comment on s'y branche.
//
// Equivalence avec PHP, pour s'y retrouver :
//   PHP  : $pdo = new PDO("sqlite:kanban.db");
//   Java : Connection cnx = DriverManager.getConnection("jdbc:sqlite:kanban.db");
//
// @Component : Spring cree automatiquement UN exemplaire de cette classe au
// demarrage et le "prete" (injecte) a ceux qui en ont besoin.
// ============================================================================
@Component
public class ConnexionBdd {

    // Chemin du fichier base de donnees, lu depuis application.properties
    // (cle "kanban.db.path"). Valeur par defaut : "kanban.db" a la racine du
    // projet eval.
    @Value("${kanban.db.path:kanban.db}")
    private String cheminBase;

    // ------------------------------------------------------------------------
    // ouvrir : renvoie une NOUVELLE connexion vers le fichier SQLite.
    // L'appelant doit la refermer (le mieux : un try-with-resources, qui ferme
    // tout seul a la fin du bloc).
    // ------------------------------------------------------------------------
    public Connection ouvrir() throws SQLException {
        return DriverManager.getConnection("jdbc:sqlite:" + cheminBase);
    }
}
