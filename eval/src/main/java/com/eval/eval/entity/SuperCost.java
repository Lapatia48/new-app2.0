package com.eval.eval.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "ticket_supercost")
public class SuperCost {

    @Id
    @Column(name = "tickets_id")
    private Integer ticketsId;

    private Double supercost = 0.0;

    @Column(name = "frais_reouverture")
    private Double fraisReouverture = 0.0;

    // Dernier cout de cloture saisi : sert a l'annuler lors d'une reouverture.
    @Column(name = "last_close")
    private Double lastClose = 0.0;

    public SuperCost() {
    }

    public SuperCost(Integer ticketsId) {
        this.ticketsId = ticketsId;
    }

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

    public Double getFraisReouverture() {
        return fraisReouverture;
    }

    public void setFraisReouverture(Double fraisReouverture) {
        this.fraisReouverture = fraisReouverture;
    }

    public Double getLastClose() {
        return lastClose;
    }

    public void setLastClose(Double lastClose) {
        this.lastClose = lastClose;
    }
}
