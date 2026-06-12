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
}
