package com.eval.eval.repository;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Repository;

import com.eval.eval.bdd.ConnexionBdd;
import com.eval.eval.entity.KanbanConfig;

// ============================================================================
// KanbanConfigRepository.java   (package "repository" = acces a la base)
// ----------------------------------------------------------------------------
// Le repository est la SEULE couche qui ecrit des requetes SQL. Le service lui
// demande simplement getAll(), getById(1), save(...), update(...) sans savoir
// comment c'est range dans le fichier .db.
//
// Pour se connecter, il ne cree PAS la connexion lui-meme : il demande a
// ConnexionBdd (injecte par Spring) de lui en ouvrir une.
//
// Equivalence PHP / Java pour une requete preparee (les "?") :
//   PHP  : $stmt = $pdo->prepare("... ?"); $stmt->execute([$valeur]);
//   Java : PreparedStatement ps = cnx.prepareStatement("... ?");
//          ps.setString(1, valeur); ps.executeUpdate();
// ============================================================================
@Repository
public class KanbanConfigRepository {

    // Spring fournit automatiquement la connexion ici (injection de dependance).
    private final ConnexionBdd connexionBdd;

    public KanbanConfigRepository(ConnexionBdd connexionBdd) {
        this.connexionBdd = connexionBdd;
    }

    // ------------------------------------------------------------------------
    // creerTableSiBesoin : cree la table et insere une ligne par defaut la
    // toute premiere fois. Appelee automatiquement au demarrage (@PostConstruct),
    // donc la base est prete sans aucune commande manuelle.
    // ------------------------------------------------------------------------
    @jakarta.annotation.PostConstruct
    public void creerTableSiBesoin() {
        String creationTable =
            "CREATE TABLE IF NOT EXISTS kanban_config (" +
            "  id               INTEGER PRIMARY KEY," +
            "  couleur_nouveau  TEXT," +
            "  couleur_encours  TEXT," +
            "  couleur_termine  TEXT," +
            "  nom_mg_nouveau   TEXT," +
            "  nom_mg_encours   TEXT," +
            "  nom_mg_termine   TEXT," +
            "  langue           TEXT" +
            ")";

        try (Connection cnx = connexionBdd.ouvrir();
             Statement st = cnx.createStatement()) {

            // 1) On cree la table si elle n'existe pas encore.
            st.execute(creationTable);

            // 1bis) Migration : si la table existait deja SANS la colonne
            //       "langue" (ancienne version), on l'ajoute. Si elle existe
            //       deja, SQLite renvoie une erreur qu'on ignore volontairement.
            try {
                st.execute("ALTER TABLE kanban_config ADD COLUMN langue TEXT DEFAULT 'mg'");
            } catch (SQLException ignore) {
                // La colonne existe deja : rien a faire.
            }

            // 2) Si la ligne id=1 n'existe pas, on insere des valeurs par
            //    defaut (couleurs proches de l'image + traductions malgaches).
            ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM kanban_config WHERE id = 1");
            rs.next();
            int nb = rs.getInt(1);
            if (nb == 0) {
                st.execute(
                    "INSERT INTO kanban_config " +
                    "(id, couleur_nouveau, couleur_encours, couleur_termine, " +
                    " nom_mg_nouveau, nom_mg_encours, nom_mg_termine, langue) VALUES " +
                    "(1, '#dbeafe', '#fde7c8', '#d7f0dc', 'vaovao', 'efa manao', 'vita', 'mg')"
                );
            }
        } catch (SQLException e) {
            // En cas de probleme on l'affiche pour pouvoir le diagnostiquer
            // (chemin du fichier, droits, etc.).
            throw new RuntimeException("Impossible de preparer la base SQLite : " + e.getMessage(), e);
        }
    }

    // ------------------------------------------------------------------------
    // getAll : renvoie TOUTES les lignes de la table sous forme de liste.
    // (Classique debutant : meme s'il n'y a qu'une ligne ici, c'est la methode
    //  qu'on retrouve dans tous les tutoriels Spring Boot.)
    // ------------------------------------------------------------------------
    public List<KanbanConfig> getAll() {
        String sql = "SELECT id, couleur_nouveau, couleur_encours, couleur_termine, " +
                     "nom_mg_nouveau, nom_mg_encours, nom_mg_termine, langue " +
                     "FROM kanban_config ORDER BY id";

        List<KanbanConfig> liste = new ArrayList<>();

        try (Connection cnx = connexionBdd.ouvrir();
             PreparedStatement ps = cnx.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            // On parcourt chaque ligne et on la transforme en objet KanbanConfig.
            while (rs.next()) {
                liste.add(transformerLigne(rs));
            }
            return liste;
        } catch (SQLException e) {
            throw new RuntimeException("Lecture de la liste impossible : " + e.getMessage(), e);
        }
    }

    // ------------------------------------------------------------------------
    // getById : renvoie UNE ligne d'apres son id (ou null si introuvable).
    // ------------------------------------------------------------------------
    public KanbanConfig getById(int id) {
        String sql = "SELECT id, couleur_nouveau, couleur_encours, couleur_termine, " +
                     "nom_mg_nouveau, nom_mg_encours, nom_mg_termine, langue " +
                     "FROM kanban_config WHERE id = ?";

        try (Connection cnx = connexionBdd.ouvrir();
             PreparedStatement ps = cnx.prepareStatement(sql)) {

            ps.setInt(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return transformerLigne(rs);
                }
                return null; // aucune ligne avec cet id
            }
        } catch (SQLException e) {
            throw new RuntimeException("Lecture de la config impossible : " + e.getMessage(), e);
        }
    }

    // ------------------------------------------------------------------------
    // save : INSERE une nouvelle ligne. (Classique debutant.)
    // ------------------------------------------------------------------------
    public void save(KanbanConfig config) {
        String sql = "INSERT INTO kanban_config " +
                     "(id, couleur_nouveau, couleur_encours, couleur_termine, " +
                     " nom_mg_nouveau, nom_mg_encours, nom_mg_termine, langue) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

        try (Connection cnx = connexionBdd.ouvrir();
             PreparedStatement ps = cnx.prepareStatement(sql)) {

            ps.setInt(1, config.getId());
            ps.setString(2, config.getCouleurNouveau());
            ps.setString(3, config.getCouleurEncours());
            ps.setString(4, config.getCouleurTermine());
            ps.setString(5, config.getNomMgNouveau());
            ps.setString(6, config.getNomMgEncours());
            ps.setString(7, config.getNomMgTermine());
            ps.setString(8, config.getLangue());
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Insertion de la config impossible : " + e.getMessage(), e);
        }
    }

    // ------------------------------------------------------------------------
    // update : MET A JOUR la ligne qui a l'id de l'objet recu.
    // On utilise une requete preparee (les "?") pour eviter les injections SQL.
    // ------------------------------------------------------------------------
    public void update(KanbanConfig config) {
        String sql = "UPDATE kanban_config SET " +
                     "couleur_nouveau = ?, couleur_encours = ?, couleur_termine = ?, " +
                     "nom_mg_nouveau = ?, nom_mg_encours = ?, nom_mg_termine = ?, langue = ? " +
                     "WHERE id = ?";

        try (Connection cnx = connexionBdd.ouvrir();
             PreparedStatement ps = cnx.prepareStatement(sql)) {

            // On remplit les "?" dans l'ordre (le 1er ? = position 1, etc.).
            ps.setString(1, config.getCouleurNouveau());
            ps.setString(2, config.getCouleurEncours());
            ps.setString(3, config.getCouleurTermine());
            ps.setString(4, config.getNomMgNouveau());
            ps.setString(5, config.getNomMgEncours());
            ps.setString(6, config.getNomMgTermine());
            ps.setString(7, config.getLangue());
            ps.setInt(8, config.getId());
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Mise a jour de la config impossible : " + e.getMessage(), e);
        }
    }

    // ------------------------------------------------------------------------
    // delete : SUPPRIME la ligne d'apres son id. (Classique debutant.)
    // ------------------------------------------------------------------------
    public void delete(int id) {
        String sql = "DELETE FROM kanban_config WHERE id = ?";

        try (Connection cnx = connexionBdd.ouvrir();
             PreparedStatement ps = cnx.prepareStatement(sql)) {

            ps.setInt(1, id);
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Suppression de la config impossible : " + e.getMessage(), e);
        }
    }

    // ------------------------------------------------------------------------
    // transformerLigne : petit outil prive qui transforme la ligne courante du
    // ResultSet en objet KanbanConfig. Evite de repeter le meme code dans
    // getAll() et getById().
    // ------------------------------------------------------------------------
    private KanbanConfig transformerLigne(ResultSet rs) throws SQLException {
        return new KanbanConfig(
            rs.getInt("id"),
            rs.getString("couleur_nouveau"),
            rs.getString("couleur_encours"),
            rs.getString("couleur_termine"),
            rs.getString("nom_mg_nouveau"),
            rs.getString("nom_mg_encours"),
            rs.getString("nom_mg_termine"),
            rs.getString("langue")
        );
    }
}
