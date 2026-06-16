package com.eval.eval.service;

import java.util.ArrayList;
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

    // Cloture : on AJOUTE le cout saisi au supercost cumule du ticket, on
    // memorise ce dernier cout (pour pouvoir l'annuler) et on l'ajoute a
    // l'historique "closes" (utile pour les modes de calcul a la reouverture).
    public SuperCost enregistrer(SuperCost entree) {
        SuperCost sc = repository.findById(entree.getTicketsId()).orElse(new SuperCost(entree.getTicketsId()));
        sc.setSupercost(sc.getSupercost() + entree.getSupercost());
        sc.setLastClose(entree.getSupercost());
        String closes = (sc.getCloses() == null || sc.getCloses().isEmpty()) ? "" : sc.getCloses() + ",";
        sc.setCloses(closes + entree.getSupercost());
        return repository.save(sc);
    }

    // Transforme la chaine "10,20,30" en liste de nombres.
    private List<Double> listeCloses(SuperCost sc) {
        List<Double> liste = new ArrayList<>();
        if (sc.getCloses() == null || sc.getCloses().isEmpty()) return liste;
        for (String morceau : sc.getCloses().split(",")) {
            liste.add(Double.parseDouble(morceau));
        }
        return liste;
    }

    // Reouverture : on ajoute un frais valant pourcentage % d'un cout de base.
    // Le cout de base depend du mode :
    //   1 = dernier cout, 2 = premier cout, 3 = moyenne, 4 = somme de tous.
    public SuperCost reouvrir(int ticketsId, double pourcentage, int mode) {
        SuperCost sc = repository.findById(ticketsId).orElse(new SuperCost(ticketsId));
        List<Double> couts = listeCloses(sc);
        double base = 0.0;
        if (!couts.isEmpty()) {
            if (mode == 2) {
                base = couts.get(0);
            } else if (mode == 3) {
                double somme = 0.0;
                for (double c : couts) somme += c;
                base = somme / couts.size();
            } else if (mode == 4) {
                for (double c : couts) base += c;
            } else {
                base = couts.get(couts.size() - 1);
            }
        }
        sc.setFraisReouverture(sc.getFraisReouverture() + base * pourcentage / 100.0);
        return repository.save(sc);
    }

    // Annulation : on retire du supercost le dernier cout de cloture (sans frais)
    // et on l'enleve aussi de l'historique "closes".
    public SuperCost annuler(int ticketsId) {
        SuperCost sc = repository.findById(ticketsId).orElse(null);
        if (sc == null) return null;
        sc.setSupercost(sc.getSupercost() - sc.getLastClose());
        sc.setLastClose(0.0);
        int virgule = sc.getCloses() == null ? -1 : sc.getCloses().lastIndexOf(",");
        sc.setCloses(virgule >= 0 ? sc.getCloses().substring(0, virgule) : "");
        return repository.save(sc);
    }
}
