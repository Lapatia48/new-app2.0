package com.eval.eval.service;

import java.util.List;
import java.util.ArrayList;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.eval.eval.entity.SuperCost;
import com.eval.eval.entity.HistoriqueCout;
import com.eval.eval.repository.SuperCostRepository;
import com.eval.eval.repository.HistoriqueCoutRepository;

@Service
public class SuperCostService {

    private final SuperCostRepository repository;
    private final HistoriqueCoutRepository historiqueRepository;

    public SuperCostService(SuperCostRepository repository, HistoriqueCoutRepository historiqueRepository) {
        this.repository = repository;
        this.historiqueRepository = historiqueRepository;
    }

    public List<SuperCost> getAll() {
        return repository.findAll();
    }

    public SuperCost getByTicket(int ticketsId) {
        return repository.findById(ticketsId).orElse(null);
    }

    // Cloture : on AJOUTE le cout saisi au supercost cumule du ticket
    @Transactional
    public SuperCost enregistrer(SuperCost entree) {
        if (entree.getTicketsId() == null) {
            throw new IllegalArgumentException("L'ID du ticket est obligatoire");
        }
        if (entree.getSupercost() == null || entree.getSupercost() < 0) {
            throw new IllegalArgumentException("Le coût doit être positif");
        }
        
        SuperCost sc = repository.findById(entree.getTicketsId())
            .orElse(new SuperCost(entree.getTicketsId()));
        
        sc.setSupercost(sc.getSupercost() + entree.getSupercost());
        sc.setLastClose(entree.getSupercost());
        
        // Sauvegarder dans l'historique
        HistoriqueCout historique = new HistoriqueCout(
            entree.getTicketsId(), 
            entree.getSupercost(), 
            "CLOTURE"
        );
        historiqueRepository.save(historique);
        
        return repository.save(sc);
    }

    // Reouverture avec les 4 modes
    @Transactional
    public SuperCost reouvrirFinal(int ticketsId, double pourcentage, int mode) {
        // Validation
        if (pourcentage < 0 || pourcentage > 100) {
            throw new IllegalArgumentException("Le pourcentage doit être entre 0 et 100");
        }
        if (mode < 1 || mode > 4) {
            throw new IllegalArgumentException("Le mode doit être 1, 2, 3 ou 4");
        }
        
        SuperCost sc = repository.findById(ticketsId)
            .orElseThrow(() -> new RuntimeException("Ticket non trouvé: " + ticketsId));
        
        // Récupérer tous les coûts de clôture
        List<HistoriqueCout> clotures = historiqueRepository.findCloturesByTicketId(ticketsId);
        
        if (clotures.isEmpty()) {
            throw new IllegalStateException("Aucun coût de clôture trouvé pour ce ticket");
        }
        
        // Extraire les montants
        List<Double> couts = clotures.stream()
            .map(HistoriqueCout::getMontant)
            .toList();
        
        double base = 0.0;
        String descriptionMode = "";
        
        switch (mode) {
            case 1: // Dernier coût
                base = couts.get(couts.size() - 1);
                descriptionMode = "Dernier coût";
                break;
            case 2: // Premier coût
                base = couts.get(0);
                descriptionMode = "Premier coût";
                break;
            case 3: // Moyenne
                base = couts.stream().mapToDouble(Double::doubleValue).average()
                    .orElseThrow(() -> new IllegalStateException("Erreur de calcul de moyenne"));
                descriptionMode = "Moyenne des coûts";
                break;
            case 4: // Somme
                base = couts.stream().mapToDouble(Double::doubleValue).sum();
                descriptionMode = "Somme des coûts";
                break;
        }
        
        double frais = base * pourcentage / 100.0;
        sc.setFraisReouverture(sc.getFraisReouverture() + frais);
        sc.setNombreReouvertures(sc.getNombreReouvertures() + 1);
        
        // Sauvegarder dans l'historique
        HistoriqueCout historique = new HistoriqueCout(ticketsId, frais, "REOUVERTURE");
        historique.setModeUtilise(mode);
        historique.setPourcentageApplique(pourcentage);
        historiqueRepository.save(historique);
        
        return repository.save(sc);
    }

    // Annulation : on retire du supercost le dernier cout de cloture
    @Transactional
    public SuperCost annuler(int ticketsId) {
        SuperCost sc = repository.findById(ticketsId).orElse(null);
        if (sc == null) return null;
        
        sc.setSupercost(sc.getSupercost() - sc.getLastClose());
        sc.setLastClose(0.0);
        
        // Ajouter à l'historique
        HistoriqueCout historique = new HistoriqueCout(ticketsId, -sc.getLastClose(), "ANNULATION");
        historiqueRepository.save(historique);
        
        return repository.save(sc);
    }
    
    // Méthode pour consulter l'historique d'un ticket
    public List<HistoriqueCout> getHistoriqueParTicket(int ticketsId) {
        return historiqueRepository.findByTicketsIdOrderByDateOperationAsc(ticketsId);
    }

    @Transactional
    public SuperCost modifierHistorique(Long id, Double montant, Integer mode, Double pourcentage){
        HistoriqueCout h = historiqueRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Non trouve"));
        
        if (h.getTypeOperation().equals("CLOTURE")) {
            h.setMontant(montant);
        } else if (h.getTypeOperation().equals("REOUVERTURE")){
            h.setModeUtilise(mode);
            h.setPourcentageApplique(pourcentage);
        }
        historiqueRepository.save(h);

        return recalculer(h.getTicketsId());
    }

    @Transactional
    public SuperCost recalculer(int ticketsId){
        SuperCost sc = repository.findById(ticketsId).orElse(null);
        if (sc == null) return null;

        List<HistoriqueCout> historique = historiqueRepository.findByTicketsIdOrderByDateOperationAsc(ticketsId);
        List<Double> clotures = new ArrayList<>();
        double supercost= 0.0;
        double lastClose = 0.0;
        double totalFrais = 0.0;

        for (HistoriqueCout h : historique){
            if (h.getTypeOperation().equals("CLOTURE")) {
                clotures.add(h.getMontant());
                supercost = supercost + h.getMontant();
                lastClose = h.getMontant();
            } else if (h.getTypeOperation().equals("REOUVERTURE")){
                double base = 0.0;
                if(!clotures.isEmpty()){
                    int mode = h.getModeUtilise() == null ? 1:h.getModeUtilise();
                    if (mode == 1) base = clotures.get(clotures.size() - 1);
                    else if (mode == 2 ) base = clotures.get(0);
                    else if (mode == 3 ) base = clotures.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
                    else if (mode == 4) base = clotures.stream().mapToDouble(Double::doubleValue).sum();
                }
                double pct = h.getPourcentageApplique() == null ? 0.0 : h.getPourcentageApplique();
                double frais = base * pct / 100.0;
                h.setMontant(frais);
                historiqueRepository.save(h);
                totalFrais=totalFrais+frais;
            }
        }
        sc.setSupercost(supercost);
        sc.setLastClose(lastClose);
        sc.setFraisReouverture(totalFrais);
        return repository.save(sc);
    }

}