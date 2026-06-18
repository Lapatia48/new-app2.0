// package com.eval.eval.service;

// import java.util.ArrayList;
// import java.util.List;

// import org.springframework.stereotype.Service;

// import com.eval.eval.entity.SuperCost;
// import com.eval.eval.repository.SuperCostRepository;

// @Service
// public class SuperCostService {

//     private final SuperCostRepository repository;

//     public SuperCostService(SuperCostRepository repository) {
//         this.repository = repository;
//     }

//     public List<SuperCost> getAll() {
//         return repository.findAll();
//     }

//     public SuperCost getByTicket(int ticketsId) {
//         return repository.findById(ticketsId).orElse(null);
//     }

//     // Cloture : on AJOUTE le cout saisi au supercost cumule du ticket et on
//     // memorise ce dernier cout (pour pouvoir l'annuler lors d'une reouverture).
//     public SuperCost enregistrer(SuperCost entree) {
//         SuperCost sc = repository.findById(entree.getTicketsId()).orElse(new SuperCost(entree.getTicketsId()));
//         sc.setSupercost(sc.getSupercost() + entree.getSupercost());
//         sc.setLastClose(entree.getSupercost());
//         return repository.save(sc);
//     }

//     // Reouverture : on ajoute un frais valant pourcentage % du DERNIER cout de
//     // cloture (lastClose), et non du supercost cumule. Reouvrir un ticket ne
//     // refacture que le dernier travail de cloture, pas tout l'historique.
//     public SuperCost reouvrir(int ticketsId, double pourcentage) {
//         SuperCost sc = repository.findById(ticketsId).orElse(new SuperCost(ticketsId));
//         sc.setFraisReouverture(sc.getFraisReouverture() + sc.getLastClose() * pourcentage / 100.0);
//         return repository.save(sc);
//     }

//     // public SuperCost reouvrir1(int ticketsId, double pourcentage, int mode){
//     // SuperCost sc = repository.findById(ticketsId).orElse(new
//     // SuperCost(ticketsId));
//     // List<Double> couts = listCloses(sc);
//     // double base = 0.0;
//     // if(!couts.isEmpty()){
//     // if(mode == 2){
//     // base = couts.get(0);
//     // }else if (mode == 3){
//     // double somme = 0.0;
//     // for(double c: couts) somme += c;
//     // base = somme / couts.size();
//     // }else if(mode == 4){
//     // double somme = 0.0;
//     // for (double c: couts) somme += c ;
//     // base = somme;
//     // }
//     // else if(mode == 1){
//     // sc.setFraisReouverture(sc.getFraisReouverture() + sc.getLastClose() *
//     // pourcentage / 100.0);
//     // }
//     // }
//     // }

//     private List<Double> getHistoriqueCouts(SuperCost sc) {
//         // Si vous avez un historique dans une table séparée
//         // Sinon, vous pouvez stocker un champ JSON ou une liste sérialisée
//         List<Double> historique = new ArrayList<>();
        
//         // Exemple si vous stockez les coûts dans un champ séparé
//         if (sc.getHistoriqueCouts() != null && !sc.getHistoriqueCouts().isEmpty()) {
//             historique.addAll(sc.getHistoriqueCouts());
//         } else {
//             // Fallback: utiliser lastClose et supercost pour reconstruire
//             historique.add(sc.getLastClose());
//         }
        
//         return historique;
//     }

//     public SuperCost reouvrirFinal(int ticketsId, double pourcentage, int mode) {
//         if (pourcentage < 0 || pourcentage > 100) {
//             throw new IllegalArgumentException("Le pourcentage doit être entre 0 et 100");
//         }

//         SuperCost sc = repository.findById(ticketsId);

//         List<Double> historiqueCouts = getHistoriqueCouts(sc);

//         double base=0.0;

//         switch(mode){
//             case 1:
//                 base = historiqueCouts.get(historiqueCouts.size() - 1);
//                 break;
//             case 2:
//                 base = historiqueCouts.get(0);
//                 break;
//             case 3:
//                 base = historiqueCouts.stream().mapToDouble(Double::doubleValue).average();
//                 break;
//             case 4:
//                 base = historiqueCouts.stream().mapToDouble(Double::doubleValue).sum();
//                 break;
//             default:
//                 throw new IllegalArgumentException("Mode invalide: " + mode + " (doit être 1-4)");
//         }

//         double frais = base * pourcentage / 100.0;
//         sc.setFraisReouverture(sc.getFraisReouverture() + frais);
        
//         return repository.save(sc);
//     }

//     // Annulation : on retire du supercost le dernier cout de cloture (sans frais).
//     public SuperCost annuler(int ticketsId) {
//         SuperCost sc = repository.findById(ticketsId).orElse(null);
//         if (sc == null)
//             return null;
//         sc.setSupercost(sc.getSupercost() - sc.getLastClose());
//         sc.setLastClose(0.0);
//         return repository.save(sc);
//     }
// }

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
}