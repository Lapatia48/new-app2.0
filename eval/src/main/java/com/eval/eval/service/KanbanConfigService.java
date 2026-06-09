package com.eval.eval.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.eval.eval.entity.KanbanConfig;
import com.eval.eval.repository.KanbanConfigRepository;

// ============================================================================
// KanbanConfigService.java   (package "service" = la logique metier)
// ----------------------------------------------------------------------------
// Le service est "l'intermediaire" entre le controleur (le web) et le
// repository (la base). Le controleur ne parle JAMAIS directement a la base :
// il passe toujours par le service.
//
// Ici la logique est simple (il n'y a qu'une ligne de config, id = 1), mais on
// garde quand meme cette couche car c'est le schema classique de Spring Boot
// (controller -> service -> repository).
// ============================================================================
@Service
public class KanbanConfigService {

    // L'id de la SEULE ligne de configuration (il n'y a qu'un tableau Kanban).
    private static final int ID_CONFIG = 1;

    // Spring fournit automatiquement le repository ici (injection de dependance).
    private final KanbanConfigRepository repository;

    public KanbanConfigService(KanbanConfigRepository repository) {
        this.repository = repository;
    }

    // Renvoie toutes les lignes (classique debutant getAll).
    public List<KanbanConfig> getAll() {
        return repository.getAll();
    }

    // Renvoie LA configuration utilisee par le tableau Kanban (la ligne id = 1).
    public KanbanConfig getConfig() {
        return repository.getById(ID_CONFIG);
    }

    // Enregistre la configuration recue depuis la page de personnalisation.
    // On force l'id a 1 puis on met a jour la ligne existante.
    public KanbanConfig enregistrer(KanbanConfig config) {
        config.setId(ID_CONFIG);
        repository.update(config);
        return repository.getById(ID_CONFIG);
    }
}
