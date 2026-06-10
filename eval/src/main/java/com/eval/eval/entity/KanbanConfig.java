package com.eval.eval.entity;

// ============================================================================
// KanbanConfig.java   (package "entity" = les objets metier)
// ----------------------------------------------------------------------------
// Une "entity" represente UNE ligne de la table "kanban_config". Ici il n'y a
// qu'une seule ligne (id = 1) car il n'y a qu'un seul tableau Kanban a
// personnaliser. Elle contient :
//   - id              : l'identifiant de la ligne (toujours 1) ;
//   - les 3 couleurs de fond des colonnes (en hexadecimal, ex: "#dbeafe") ;
//   - les 3 noms de statut traduits en malgache (ex: "vaovao", "vita") ;
//   - langue          : "mg" (malgache) ou "en" (anglais) pour l'entete.
//
// Style "classique" Spring Boot : les champs sont PRIVES et on y accede par des
// getters/setters. C'est ce que Spring (Jackson) utilise pour transformer
// l'objet en JSON et inversement.
// ============================================================================
public class KanbanConfig {

    // Identifiant de la ligne (toujours 1 dans ce projet).
    // On utilise Integer (objet) et non int (primitif) : ainsi, si la page de
    // configuration envoie un JSON SANS "id" (ce qui est le cas normal), Jackson
    // le laisse a "null" sans erreur. Le service force ensuite l'id a 1.
    private Integer id;

    // --- Couleurs de fond des 3 colonnes (format hexadecimal "#rrggbb") ---
    private String couleurNouveau;   // colonne "Nouveau"
    private String couleurEncours;   // colonne "In progress"
    private String couleurTermine;   // colonne "Termine"

    // --- Noms des 3 statuts traduits en malgache ---
    private String nomMgNouveau;     // ex: "vaovao"
    private String nomMgEncours;     // ex: "efa manao"
    private String nomMgTermine;     // ex: "vita"

    // --- Langue choisie pour l'entete des colonnes ("mg" ou "en") ---
    private String langue;

    // Constructeur vide : obligatoire pour que Jackson puisse creer l'objet
    // quand il lit le JSON envoye par la page de configuration.
    public KanbanConfig() {
    }

    // Constructeur pratique pour creer un objet deja rempli (utilise par le
    // repository quand il lit la ligne dans SQLite).
    public KanbanConfig(Integer id, String couleurNouveau, String couleurEncours, String couleurTermine,
                        String nomMgNouveau, String nomMgEncours, String nomMgTermine,
                        String langue) {
        this.id = id;
        this.couleurNouveau = couleurNouveau;
        this.couleurEncours = couleurEncours;
        this.couleurTermine = couleurTermine;
        this.nomMgNouveau = nomMgNouveau;
        this.nomMgEncours = nomMgEncours;
        this.nomMgTermine = nomMgTermine;
        this.langue = langue;
    }

    // ------------------------------------------------------------------------
    // Getters / setters : un "get..." pour lire un champ, un "set..." pour le
    // modifier. Spring s'en sert tout seul (lecture/ecriture du JSON).
    // ------------------------------------------------------------------------
    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getCouleurNouveau() {
        return couleurNouveau;
    }

    public void setCouleurNouveau(String couleurNouveau) {
        this.couleurNouveau = couleurNouveau;
    }

    public String getCouleurEncours() {
        return couleurEncours;
    }

    public void setCouleurEncours(String couleurEncours) {
        this.couleurEncours = couleurEncours;
    }

    public String getCouleurTermine() {
        return couleurTermine;
    }

    public void setCouleurTermine(String couleurTermine) {
        this.couleurTermine = couleurTermine;
    }

    public String getNomMgNouveau() {
        return nomMgNouveau;
    }

    public void setNomMgNouveau(String nomMgNouveau) {
        this.nomMgNouveau = nomMgNouveau;
    }

    public String getNomMgEncours() {
        return nomMgEncours;
    }

    public void setNomMgEncours(String nomMgEncours) {
        this.nomMgEncours = nomMgEncours;
    }

    public String getNomMgTermine() {
        return nomMgTermine;
    }

    public void setNomMgTermine(String nomMgTermine) {
        this.nomMgTermine = nomMgTermine;
    }

    public String getLangue() {
        return langue;
    }

    public void setLangue(String langue) {
        this.langue = langue;
    }
}
