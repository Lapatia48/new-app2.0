package com.eval.eval.controller;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.eval.eval.entity.HistoriqueCout;
import com.eval.eval.entity.SuperCost;
import com.eval.eval.service.SuperCostService;

@RestController
@RequestMapping("/api/supercost")
@CrossOrigin(origins = "*")
public class SuperCostController {

    private final SuperCostService service;

    public SuperCostController(SuperCostService service) {
        this.service = service;
    }

    // ============================================
    // 1. Récupérer tous les supercosts (totaux cumulés par ticket)
    // ============================================
    @GetMapping
    public List<SuperCost> getAll() {
        return service.getAll();
    }

    // ============================================
    // 2. Récupérer un supercost par ticket
    // ============================================
    @GetMapping("/{ticketsId}")
    public SuperCost getByTicket(@PathVariable int ticketsId) {
        return service.getByTicket(ticketsId);
    }

    // ============================================
    // 3. Enregistrer une clôture (supercost)
    // ============================================
    @PostMapping
    public SuperCost enregistrer(@RequestBody SuperCost superCost) {
        return service.enregistrer(superCost);
    }

    // ============================================
    // 4. Réouvrir un ticket avec mode et pourcentage
    // ============================================
    @PostMapping("/{ticketsId}/{mode}/reouverture")
    public SuperCost reouvrir(@PathVariable int ticketsId,
            @PathVariable int mode,
            @RequestBody ReouvertureRequest requete) {
        return service.reouvrirFinal(ticketsId, requete.getPourcentage(), mode);
    }

    // ============================================
    // 5. Annuler le dernier coût d'un ticket
    // ============================================
    @PostMapping("/{ticketsId}/annulation")
    public SuperCost annuler(@PathVariable int ticketsId) {
        return service.annuler(ticketsId);
    }

    // ============================================
    // 6. Récupérer l'historique d'un ticket
    // ============================================
    @GetMapping("/{ticketsId}/historique")
    public List<HistoriqueCout> getHistorique(@PathVariable int ticketsId) {
        return service.getHistoriqueParTicket(ticketsId);
    }

    // ============================================
    // 7. Récupérer TOUTES les clôtures individuelles
    // ============================================
    @GetMapping("/clotures")
    public List<HistoriqueCout> getAllClotures() {
        return service.getAllClotures();
    }

    // ============================================
    // 8. Récupérer TOUTES les réouvertures
    // ============================================
    @GetMapping("/reouvertures")
    public List<HistoriqueCout> getAllReouvertures() {
        return service.getAllReouvertures();
    }

    // ============================================
    // 9. Modifier uniquement le pourcentage d'une réouverture
    // ============================================
    @PutMapping("/reouverture/{id}/pourcentage")
    public HistoriqueCout modifierPourcentageReouverture(
            @PathVariable Long id,
            @RequestBody PourcentageRequest requete) {
        return service.modifierPourcentageReouverture(id, requete.getPourcentage());
    }

    // ============================================
    // 10. Modifier une réouverture (pourcentage ET mode)
    // ============================================
    @PutMapping("/reouverture/{id}")
    public HistoriqueCout modifierReouverture(
            @PathVariable Long id,
            @RequestBody ReouvertureModificationRequest requete) {
        return service.modifierReouverture(id, requete.getPourcentage(), requete.getMode());
    }

    // ============================================
    // 11. Modifier le montant d'un supercost
    // ============================================
    @PutMapping("/{ticketsId}/supercost")
    public SuperCost modifierSuperCost(
            @PathVariable int ticketsId, 
            @RequestBody SuperCostModificationRequest requete) {
        return service.modifierSupercost(ticketsId, requete.getMontant());
    }

    // ============================================
    // CLASSES REQUEST INTERNES
    // ============================================

    // Pour la réouverture (POST)
    public static class ReouvertureRequest {
        private Double pourcentage;

        public Double getPourcentage() {
            return pourcentage == null ? 0.0 : pourcentage;
        }

        public void setPourcentage(Double pourcentage) {
            this.pourcentage = pourcentage;
        }
    }

    // Pour modifier uniquement le pourcentage (PUT)
    public static class PourcentageRequest {
        private Double pourcentage;

        public Double getPourcentage() {
            return pourcentage == null ? 0.0 : pourcentage;
        }

        public void setPourcentage(Double pourcentage) {
            this.pourcentage = pourcentage;
        }
    }

    // Pour modifier une réouverture (pourcentage + mode)
    public static class ReouvertureModificationRequest {
        private Double pourcentage;
        private Integer mode;

        public Double getPourcentage() {
            return pourcentage == null ? 0.0 : pourcentage;
        }

        public void setPourcentage(Double pourcentage) {
            this.pourcentage = pourcentage;
        }

        public Integer getMode() {
            return mode == null ? 1 : mode;
        }

        public void setMode(Integer mode) {
            this.mode = mode;
        }
    }

    // Pour modifier un supercost (montant)
    public static class SuperCostModificationRequest {
        private Double montant;

        public Double getMontant() {
            return montant == null ? 0.0 : montant;
        }

        public void setMontant(Double montant) {
            this.montant = montant;
        }
    }
}