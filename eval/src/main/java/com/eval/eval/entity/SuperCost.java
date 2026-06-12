package com.eval.eval.entity;

public class SuperCost {

    private Integer ticketsId;
    private Double supercost;

    public SuperCost() {
    }

    public SuperCost(Integer ticketsId, Double supercost) {
        this.ticketsId = ticketsId;
        this.supercost = supercost;
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
}
