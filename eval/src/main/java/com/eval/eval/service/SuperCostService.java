package com.eval.eval.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.eval.eval.entity.SuperCost;
import com.eval.eval.repository.SuperCostRepository;

@Service
public class SuperCostService {

    private final SuperCostRepository repository;

    public SuperCostService(SuperCostRepository repository) {
        this.repository = repository;
    }

    public List<SuperCost> getAll() {
        return repository.getAll();
    }

    public SuperCost getByTicket(int ticketsId) {
        return repository.getByTicket(ticketsId);
    }

    public SuperCost enregistrer(SuperCost superCost) {
        repository.enregistrer(superCost);
        return repository.getByTicket(superCost.getTicketsId());
    }
}
