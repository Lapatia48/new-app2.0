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
                     "tickets_id INTEGER PRIMARY KEY, supercost REAL)";
        try (Connection cnx = connexionBdd.ouvrir(); Statement st = cnx.createStatement()) {
            st.execute(sql);
        } catch (SQLException e) {
            throw new RuntimeException("Table supercost : " + e.getMessage(), e);
        }
    }

    public List<SuperCost> getAll() {
        String sql = "SELECT tickets_id, supercost FROM ticket_supercost ORDER BY tickets_id";
        List<SuperCost> liste = new ArrayList<>();
        try (Connection cnx = connexionBdd.ouvrir();
             PreparedStatement ps = cnx.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                liste.add(new SuperCost(rs.getInt("tickets_id"), rs.getDouble("supercost")));
            }
            return liste;
        } catch (SQLException e) {
            throw new RuntimeException("Lecture supercosts : " + e.getMessage(), e);
        }
    }

    public SuperCost getByTicket(int ticketsId) {
        String sql = "SELECT tickets_id, supercost FROM ticket_supercost WHERE tickets_id = ?";
        try (Connection cnx = connexionBdd.ouvrir(); PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setInt(1, ticketsId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return new SuperCost(rs.getInt("tickets_id"), rs.getDouble("supercost"));
                }
                return null;
            }
        } catch (SQLException e) {
            throw new RuntimeException("Lecture supercost : " + e.getMessage(), e);
        }
    }

    public void enregistrer(SuperCost superCost) {
        String sql = "INSERT OR REPLACE INTO ticket_supercost (tickets_id, supercost) VALUES (?, ?)";
        try (Connection cnx = connexionBdd.ouvrir(); PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setInt(1, superCost.getTicketsId());
            ps.setDouble(2, superCost.getSupercost());
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Enregistrement supercost : " + e.getMessage(), e);
        }
    }
}
