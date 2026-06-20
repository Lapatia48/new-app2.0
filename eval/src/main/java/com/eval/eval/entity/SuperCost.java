package com.eval.eval.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "ticket_supercost")
public class SuperCost {
    @Id
    @Column(name = "tickets_id")
    private Integer ticketsId;

    @Column(name = "supercost")
    private Double supercost = 0.0;

    @Column(name = "last_close")
    private Double lastClose = 0.0;

    @Column(name = "frais_reouverture")
    private Double fraisReouverture = 0.0;

    @Column(name = "nombre_reeouvertures")
    private Integer nombreReouvertures = 0;

    // Constructeurs
    public SuperCost() {
    }

    public SuperCost(Integer ticketsId) {
        this.ticketsId = ticketsId;
        this.supercost = 0.0;
        this.lastClose = 0.0;
        this.fraisReouverture = 0.0;
        this.nombreReouvertures = 0;
    }

    // Getters et Setters
    public Integer getTicketsId() {
        return ticketsId;
    }

    public void setTicketsId(Integer ticketsId) {
        this.ticketsId = ticketsId;
    }

    public Double getSupercost() {
        return supercost;
    }

    public void setSupercost(Double supercost) {
        this.supercost = supercost;
    }

    public Double getLastClose() {
        return lastClose;
    }

    public void setLastClose(Double lastClose) {
        this.lastClose = lastClose;
    }

    public Double getFraisReouverture() {
        return fraisReouverture;
    }

    public void setFraisReouverture(Double fraisReouverture) {
        this.fraisReouverture = fraisReouverture;
    }

    public Integer getNombreReouvertures() {
        return nombreReouvertures;
    }

    public void setNombreReouvertures(Integer nombreReouvertures) {
        this.nombreReouvertures = nombreReouvertures;
    }
}
