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
        return repository.findAll();
    }

    public SuperCost getByTicket(int ticketsId) {
        return repository.findById(ticketsId).orElse(null);
    }

    // Cloture : on AJOUTE le cout saisi au supercost cumule du ticket et on
    // memorise ce dernier cout (pour pouvoir l'annuler lors d'une reouverture).
    public SuperCost enregistrer(SuperCost entree) {
        SuperCost sc = repository.findById(entree.getTicketsId()).orElse(new SuperCost(entree.getTicketsId()));
        sc.setSupercost(sc.getSupercost() + entree.getSupercost());
        sc.setLastClose(entree.getSupercost());
        return repository.save(sc);
    }

    // Reouverture : on ajoute un frais valant pourcentage % du DERNIER cout de
    // cloture (lastClose), et non du supercost cumule. Reouvrir un ticket ne
    // refacture que le dernier travail de cloture, pas tout l'historique.
    public SuperCost reouvrir(int ticketsId, double pourcentage) {
        SuperCost sc = repository.findById(ticketsId).orElse(new SuperCost(ticketsId));
        sc.setFraisReouverture(sc.getFraisReouverture() + sc.getLastClose() * pourcentage / 100.0);
        return repository.save(sc);
    }

    // Annulation : on retire du supercost le dernier cout de cloture (sans frais).
    public SuperCost annuler(int ticketsId) {
        SuperCost sc = repository.findById(ticketsId).orElse(null);
        if (sc == null) return null;
        sc.setSupercost(sc.getSupercost() - sc.getLastClose());
        sc.setLastClose(0.0);
        return repository.save(sc);
    }
}
