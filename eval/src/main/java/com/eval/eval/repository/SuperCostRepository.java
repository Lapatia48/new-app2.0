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
import com.eval.eval.entity.SuperCost;

@Repository
public class SuperCostRepository {

    private final ConnexionBdd connexionBdd;

    public SuperCostRepository(ConnexionBdd connexionBdd) {
        this.connexionBdd = connexionBdd;
    }

    @jakarta.annotation.PostConstruct
    public void creerTableSiBesoin() {
        String sql = "CREATE TABLE IF NOT EXISTS ticket_supercost (" +
                     "tickets_id INTEGER PRIMARY KEY, supercost REAL, frais_reouverture REAL DEFAULT 0)";
        try (Connection cnx = connexionBdd.ouvrir(); Statement st = cnx.createStatement()) {
            st.execute(sql);
            // Migration : ajoute la colonne frais_reouverture aux bases existantes
            // (creees avant l'ajout de cette colonne). SQLite leve une erreur
            // "duplicate column" si elle existe deja : on l'ignore alors.
            try {
                st.execute("ALTER TABLE ticket_supercost ADD COLUMN frais_reouverture REAL DEFAULT 0");
            } catch (SQLException dejaPresente) {
                // colonne deja presente : rien a faire
            }
        } catch (SQLException e) {
            throw new RuntimeException("Table supercost : " + e.getMessage(), e);
        }
    }

    public List<SuperCost> getAll() {
        String sql = "SELECT tickets_id, supercost, frais_reouverture FROM ticket_supercost ORDER BY tickets_id";
        List<SuperCost> liste = new ArrayList<>();
        try (Connection cnx = connexionBdd.ouvrir();
             PreparedStatement ps = cnx.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                liste.add(new SuperCost(rs.getInt("tickets_id"), rs.getDouble("supercost"),
                        rs.getDouble("frais_reouverture")));
            }
            return liste;
        } catch (SQLException e) {
            throw new RuntimeException("Lecture supercosts : " + e.getMessage(), e);
        }
    }

    public SuperCost getByTicket(int ticketsId) {
        String sql = "SELECT tickets_id, supercost, frais_reouverture FROM ticket_supercost WHERE tickets_id = ?";
        try (Connection cnx = connexionBdd.ouvrir(); PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setInt(1, ticketsId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return new SuperCost(rs.getInt("tickets_id"), rs.getDouble("supercost"),
                            rs.getDouble("frais_reouverture"));
                }
                return null;
            }
        } catch (SQLException e) {
            throw new RuntimeException("Lecture supercost : " + e.getMessage(), e);
        }
    }

    // Enregistre le supercost (saisi a la cloture du ticket) SANS ecraser un
    // eventuel frais de reouverture deja present (ON CONFLICT ne touche qu'au
    // supercost).
    public void enregistrer(SuperCost superCost) {
        String sql = "INSERT INTO ticket_supercost (tickets_id, supercost, frais_reouverture) " +
                     "VALUES (?, ?, 0) " +
                     "ON CONFLICT(tickets_id) DO UPDATE SET supercost = excluded.supercost";
        try (Connection cnx = connexionBdd.ouvrir(); PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setInt(1, superCost.getTicketsId());
            ps.setDouble(2, superCost.getSupercost());
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Enregistrement supercost : " + e.getMessage(), e);
        }
    }

    // Enregistre le frais de reouverture SANS toucher au supercost existant.
    public void enregistrerFraisReouverture(int ticketsId, double fraisReouverture) {
        String sql = "INSERT INTO ticket_supercost (tickets_id, supercost, frais_reouverture) " +
                     "VALUES (?, 0, ?) " +
                     "ON CONFLICT(tickets_id) DO UPDATE SET frais_reouverture = excluded.frais_reouverture";
        try (Connection cnx = connexionBdd.ouvrir(); PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setInt(1, ticketsId);
            ps.setDouble(2, fraisReouverture);
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Enregistrement frais de reouverture : " + e.getMessage(), e);
        }
    }

    // Supprime la ligne supercost d'un ticket (utilise lors de l'annulation
    // de la cloture).
    public void supprimer(int ticketsId) {
        String sql = "DELETE FROM ticket_supercost WHERE tickets_id = ?";
        try (Connection cnx = connexionBdd.ouvrir(); PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setInt(1, ticketsId);
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Suppression supercost : " + e.getMessage(), e);
        }
    }
}
