package com.eval.eval.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eval.eval.entity.HistoriqueCout;
import com.eval.eval.entity.SuperCost;
import com.eval.eval.repository.HistoriqueCoutRepository;
import com.eval.eval.repository.SuperCostRepository;

@Service
public class SuperCostService {

    private final SuperCostRepository repository;
    private final HistoriqueCoutRepository historiqueRepository;

    public SuperCostService(SuperCostRepository repository, HistoriqueCoutRepository historiqueRepository) {
        this.repository = repository;
        this.historiqueRepository = historiqueRepository;
    }

    // ============================================
    // 1. Récupérer tous les supercosts (totaux)
    // ============================================
    public List<SuperCost> getAll() {
        return repository.findAll();
    }

    // ============================================
    // 2. Récupérer un supercost par ticket
    // ============================================
    public SuperCost getByTicket(int ticketsId) {
        return repository.findById(ticketsId).orElse(null);
    }

    // ============================================
    // 3. Enregistrer une clôture
    // ============================================
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
                "CLOTURE");
        historiqueRepository.save(historique);

        return repository.save(sc);
    }

    // ============================================
    // 4. Réouverture avec les 4 modes
    // ============================================
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

        switch (mode) {
            case 1: // Dernier coût
                base = couts.get(couts.size() - 1);
                break;
            case 2: // Premier coût
                base = couts.get(0);
                break;
            case 3: // Moyenne
                base = couts.stream().mapToDouble(Double::doubleValue).average()
                        .orElseThrow(() -> new IllegalStateException("Erreur de calcul de moyenne"));
                break;
            case 4: // Somme
                base = couts.stream().mapToDouble(Double::doubleValue).sum();
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

    @Transactional
    public SuperCost annuler(int ticketsId) {
        SuperCost sc = repository.findById(ticketsId).orElse(null);
        if (sc == null)
            return null;

        sc.setSupercost(sc.getSupercost() - sc.getLastClose());
        sc.setLastClose(0.0);

        HistoriqueCout historique = new HistoriqueCout(ticketsId, -sc.getLastClose(), "ANNULATION");
        historiqueRepository.save(historique);

        return repository.save(sc);
    }

    public List<HistoriqueCout> getAllClotures() {
        return historiqueRepository.findAllClotures();
    }

    public List<HistoriqueCout> getAllReouvertures() {
        return historiqueRepository.findAllReouvertures();
    }

    @Transactional
    public HistoriqueCout modifierPourcentageReouverture(Long historiqueId, double nouveauPourcentage) {
        if (nouveauPourcentage < 0 || nouveauPourcentage > 100) {
            throw new IllegalArgumentException("Le pourcentage doit être entre 0 et 100");
        }

        HistoriqueCout historique = historiqueRepository.findById(historiqueId)
                .orElseThrow(() -> new RuntimeException("Réouverture non trouvée: " + historiqueId));

        if (!"REOUVERTURE".equals(historique.getTypeOperation())) {
            throw new IllegalArgumentException("Cet historique n'est pas une réouverture");
        }

        List<HistoriqueCout> clotures = historiqueRepository.findCloturesByTicketId(historique.getTicketsId());
        if (!clotures.isEmpty()) {
            List<Double> couts = clotures.stream()
                    .map(HistoriqueCout::getMontant)
                    .toList();

            double base = 0.0;
            int mode = historique.getModeUtilise() != null ? historique.getModeUtilise() : 1;

            switch (mode) {
                case 1:
                    base = couts.get(couts.size() - 1);
                    break;
                case 2:
                    base = couts.get(0);
                    break;
                case 3:
                    base = couts.stream().mapToDouble(Double::doubleValue).average().orElse(0);
                    break;
                case 4:
                    base = couts.stream().mapToDouble(Double::doubleValue).sum();
                    break;
            }

            double nouveauMontant = base * nouveauPourcentage / 100.0;
            historique.setMontant(nouveauMontant);
        }

        historique.setPourcentageApplique(nouveauPourcentage);

        return historiqueRepository.save(historique);
    }

    @Transactional
    public HistoriqueCout modifierReouverture(Long historiqueId, double nouveauPourcentage, int nouveauMode) {
        if (nouveauPourcentage < 0 || nouveauPourcentage > 100) {
            throw new IllegalArgumentException("Le pourcentage doit être entre 0 et 100");
        }
        if (nouveauMode < 1 || nouveauMode > 4) {
            throw new IllegalArgumentException("Le mode doit être 1, 2, 3 ou 4");
        }

        HistoriqueCout historique = historiqueRepository.findById(historiqueId)
                .orElseThrow(() -> new RuntimeException("Réouverture non trouvée: " + historiqueId));

        if (!"REOUVERTURE".equals(historique.getTypeOperation())) {
            throw new IllegalArgumentException("Cet historique n'est pas une réouverture");
        }

        int ticketsId = historique.getTicketsId();

        SuperCost sc = repository.findById(ticketsId)
                .orElseThrow(() -> new RuntimeException("Ticket non trouvé: " + ticketsId));

        List<HistoriqueCout> clotures = historiqueRepository.findCloturesByTicketId(ticketsId);
        if (clotures.isEmpty()) {
            throw new IllegalStateException("Aucun coût de clôture trouvé pour ce ticket");
        }

        List<Double> couts = clotures.stream()
                .map(HistoriqueCout::getMontant)
                .toList();

        double base;
        switch (nouveauMode) {
            case 1:
                base = couts.get(couts.size() - 1);
                break;
            case 2:
                base = couts.get(0);
                break;
            case 3:
                base = couts.stream().mapToDouble(Double::doubleValue).average()
                        .orElseThrow(() -> new IllegalStateException("Erreur de calcul de moyenne"));
                break;
            case 4:
                base = couts.stream().mapToDouble(Double::doubleValue).sum();
                break;
            default:
                throw new IllegalArgumentException("Mode invalide: " + nouveauMode);
        }

        double ancienFrais = historique.getMontant() != null ? historique.getMontant() : 0.0;
        double nouveauFrais = base * nouveauPourcentage / 100.0;

        sc.setFraisReouverture(sc.getFraisReouverture() - ancienFrais + nouveauFrais);
        repository.save(sc);

        historique.setMontant(nouveauFrais);
        historique.setPourcentageApplique(nouveauPourcentage);
        historique.setModeUtilise(nouveauMode);

        return historiqueRepository.save(historique);
    }

    @Transactional
    public SuperCost modifierSupercost(int ticketsId, double nouveauMontant) {
        if (nouveauMontant < 0) {
            throw new IllegalArgumentException("Le montant ne peut pas être négatif");
        }

        SuperCost sc = repository.findById(ticketsId)
                .orElseThrow(() -> new RuntimeException("Ticket non trouvé: " + ticketsId));

        double ancienMontant = sc.getSupercost();
        double difference = nouveauMontant - ancienMontant;

        sc.setSupercost(nouveauMontant);

        HistoriqueCout historique = new HistoriqueCout(ticketsId, difference, "MODIFICATION_SUPERCOST");
        historiqueRepository.save(historique);

        return repository.save(sc);
    }

    public List<HistoriqueCout> getHistoriqueParTicket(int ticketsId) {
        return historiqueRepository.findByTicketsIdOrderByDateOperationAsc(ticketsId);
    }

    @Transactional
    public List<HistoriqueCout> getAllReouverture() {
        return historiqueRepository.findReouverture();
    }
}