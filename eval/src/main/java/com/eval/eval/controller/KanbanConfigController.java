package com.eval.eval.controller;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.eval.eval.entity.KanbanConfig;
import com.eval.eval.service.KanbanConfigService;

// ============================================================================
// KanbanConfigController.java   (package "controller" = les routes web)
// ----------------------------------------------------------------------------
// Le controleur expose la configuration du Kanban sur le web (en JSON) :
//
//   GET  /api/kanban-config       -> la config actuelle (couleurs + noms + langue)
//   GET  /api/kanban-config/all   -> toutes les lignes (classique debutant getAll)
//   POST /api/kanban-config       -> enregistre une nouvelle config (envoyee en JSON)
//
// La page de configuration (kanban-config.html) ET le tableau Kanban du
// frontoffice Vue appellent ces adresses.
//
// Le controleur ne parle PAS a la base directement : il passe par le service.
//
// @CrossOrigin(origins = "*") : autorise le site Vue (qui tourne sur un autre
// port, ex: http://localhost:5173) a appeler ce backend sans erreur CORS.
// ============================================================================
@RestController
@RequestMapping("/api/kanban-config")
@CrossOrigin(origins = "*")
public class KanbanConfigController {

    private final KanbanConfigService service;

    // Spring fournit automatiquement le service ici (injection de dependance).
    public KanbanConfigController(KanbanConfigService service) {
        this.service = service;
    }

    // Lecture de LA configuration utilisee par le tableau Kanban.
    @GetMapping
    public KanbanConfig getConfig() {
        return service.getConfig();
    }

    // Lecture de toutes les lignes (classique debutant).
    @GetMapping("/all")
    public List<KanbanConfig> getAll() {
        return service.getAll();
    }

    // Enregistrement : @RequestBody transforme le JSON recu en objet KanbanConfig,
    // puis on le sauvegarde et on renvoie la version enregistree.
    @PostMapping
    public KanbanConfig enregistrer(@RequestBody KanbanConfig config) {
        return service.enregistrer(config);
    }
}
