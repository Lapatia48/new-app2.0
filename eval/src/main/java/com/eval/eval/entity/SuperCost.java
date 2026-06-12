package com.eval.eval.entity;

public class SuperCost {

    private Integer ticketsId;
    private Double supercost;
    // Frais de reouverture : montant facture quand un ticket termine est
    // "reouvert" (= un pourcentage de l'ancien supercost). 0 si jamais reouvert.
    private Double fraisReouverture;

    public SuperCost() {
    }

    public SuperCost(Integer ticketsId, Double supercost) {
        this.ticketsId = ticketsId;
        this.supercost = supercost;
        this.fraisReouverture = 0.0;
    }

    public SuperCost(Integer ticketsId, Double supercost, Double fraisReouverture) {
        this.ticketsId = ticketsId;
        this.supercost = supercost;
        this.fraisReouverture = fraisReouverture;
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
}
