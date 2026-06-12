package com.eval.eval.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.eval.eval.entity.SuperCost;
import com.eval.eval.repository.SuperCostRepository;

@Service
public class SuperCostService {

    private final SuperCostRepository repository;

    public SuperCostService(SuperCostRepository repository) {
        this.repository = repository;
    }

    public List<SuperCost> getAll() {
        return repository.getAll();
    }

    public SuperCost getByTicket(int ticketsId) {
        return repository.getByTicket(ticketsId);
    }

    public SuperCost enregistrer(SuperCost superCost) {
        repository.enregistrer(superCost);
        return repository.getByTicket(superCost.getTicketsId());
    }

    // Reouverture : le frais facture vaut (pourcentage %) de l'ancien supercost.
    // Si aucun supercost n'existe, le frais vaut 0.
    public SuperCost reouvrir(int ticketsId, double pourcentage) {
        SuperCost existant = repository.getByTicket(ticketsId);
        double ancienSupercost = (existant != null && existant.getSupercost() != null)
                ? existant.getSupercost() : 0.0;
        double frais = ancienSupercost * pourcentage / 100.0;
        repository.enregistrerFraisReouverture(ticketsId, frais);
        return repository.getByTicket(ticketsId);
    }

    // Annulation de la cloture : on supprime le supercost saisi a la cloture.
    public void supprimer(int ticketsId) {
        repository.supprimer(ticketsId);
    }
}
