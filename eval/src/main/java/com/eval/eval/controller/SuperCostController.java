package com.eval.eval.controller;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

    @GetMapping
    public List<SuperCost> getAll() {
        return service.getAll();
    }

    @GetMapping("/{ticketsId}")
    public SuperCost getByTicket(@PathVariable int ticketsId) {
        return service.getByTicket(ticketsId);
    }

    @PostMapping
    public SuperCost enregistrer(@RequestBody SuperCost superCost) {
        return service.enregistrer(superCost);
    }

    // Reouverture : facture un frais valant "pourcentage" % d'un cout de base.
    // Corps attendu : { "pourcentage": 10, "mode": 1 }.
    @PostMapping("/{ticketsId}/reouverture")
    public SuperCost reouvrir(@PathVariable int ticketsId, @RequestBody ReouvertureRequest requete) {
        return service.reouvrir(ticketsId, requete.getPourcentage(), requete.getMode());
    }

    // Annulation : retire le dernier cout de cloture du ticket.
    @PostMapping("/{ticketsId}/annulation")
    public SuperCost annuler(@PathVariable int ticketsId) {
        return service.annuler(ticketsId);
    }

    public static class ReouvertureRequest {
        private Double pourcentage;
        private Integer mode;

        public Double getPourcentage() {
            return pourcentage == null ? 0.0 : pourcentage;
        }

        public void setPourcentage(Double pourcentage) {
            this.pourcentage = pourcentage;
        }

        // Mode de calcul (1 a 4). Defaut 1 (dernier cout) si absent.
        public int getMode() {
            return mode == null ? 1 : mode;
        }

        public void setMode(Integer mode) {
            this.mode = mode;
        }
    }
}
