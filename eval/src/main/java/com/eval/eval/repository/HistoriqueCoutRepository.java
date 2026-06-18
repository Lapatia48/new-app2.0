package com.eval.eval.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.eval.eval.entity.HistoriqueCout;
import java.util.List;

public interface HistoriqueCoutRepository extends JpaRepository<HistoriqueCout, Long> {

    List<HistoriqueCout> findByTicketsIdOrderByDateOperationAsc(Integer ticketsId);

    List<HistoriqueCout> findByTicketsIdAndTypeOperationOrderByDateOperationAsc(Integer ticketsId,
            String typeOperation);

    @Query("SELECT h FROM HistoriqueCout h WHERE h.ticketsId = :ticketsId AND h.typeOperation = 'CLOTURE' ORDER BY h.dateOperation ASC")
    List<HistoriqueCout> findCloturesByTicketId(@Param("ticketsId") Integer ticketsId);
}