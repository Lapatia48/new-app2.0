package com.eval.eval.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "historique_couts")
public class HistoriqueCout {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tickets_id", nullable = false)
    private Integer ticketsId;

    @Column(name = "montant", nullable = false)
    private Double montant;

    @Column(name = "type_operation", nullable = false)
    private String typeOperation; // "CLOTURE", "REOUVERTURE"

    @Column(name = "date_operation")
    private LocalDateTime dateOperation;

    @Column(name = "mode_utilise")
    private Integer modeUtilise; // 1,2,3,4 pour les réouvertures

    @Column(name = "pourcentage_applique")
    private Double pourcentageApplique;

    // Constructeurs
    public HistoriqueCout() {
    }

    public HistoriqueCout(Integer ticketsId, Double montant, String typeOperation) {
        this.ticketsId = ticketsId;
        this.montant = montant;
        this.typeOperation = typeOperation;
        this.dateOperation = LocalDateTime.now();
    }

    // Getters et Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Integer getTicketsId() {
        return ticketsId;
    }

    public void setTicketsId(Integer ticketsId) {
        this.ticketsId = ticketsId;
    }

    public Double getMontant() {
        return montant;
    }

    public void setMontant(Double montant) {
        this.montant = montant;
    }

    public String getTypeOperation() {
        return typeOperation;
    }

    public void setTypeOperation(String typeOperation) {
        this.typeOperation = typeOperation;
    }

    public LocalDateTime getDateOperation() {
        return dateOperation;
    }

    public void setDateOperation(LocalDateTime dateOperation) {
        this.dateOperation = dateOperation;
    }

    public Integer getModeUtilise() {
        return modeUtilise;
    }

    public void setModeUtilise(Integer modeUtilise) {
        this.modeUtilise = modeUtilise;
    }

    public Double getPourcentageApplique() {
        return pourcentageApplique;
    }

    public void setPourcentageApplique(Double pourcentageApplique) {
        this.pourcentageApplique = pourcentageApplique;
    }
}