package com.eval.eval.controller;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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

    // Reouverture : facture un frais valant "pourcentage" % du supercost.
    // Corps attendu : { "pourcentage": 10 }.
    // @PostMapping("/{ticketsId}/reouverture")
    // public SuperCost reouvrir(@PathVariable int ticketsId, @RequestBody ReouvertureRequest requete) {
    //     return service.reouvrir(ticketsId, requete.getPourcentage());
    // }

    @PostMapping("/{ticketsId}/{mode}/reouverture")
    public SuperCost reouvrir(@PathVariable int ticketsId, 
                              @PathVariable int mode, 
                              @RequestBody ReouvertureRequest requete) {
        return service.reouvrirFinal(ticketsId, requete.getPourcentage(), mode);
    }

    // Annulation : retire le dernier cout de cloture du ticket.
    @PostMapping("/{ticketsId}/annulation")
    public SuperCost annuler(@PathVariable int ticketsId) {
        return service.annuler(ticketsId);
    }

    @GetMapping("/{ticketsId}/historique")
    public List<HistoriqueCout> getHistorique(@PathVariable int ticketsId) {
        return service.getHistoriqueParTicket(ticketsId);
    }

    public static class ReouvertureRequest {
        private Double pourcentage;

        public Double getPourcentage() {
            return pourcentage == null ? 0.0 : pourcentage;
        }

        public void setPourcentage(Double pourcentage) {
            this.pourcentage = pourcentage;
        }
    }
}
