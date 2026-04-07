package com.wtbuddy.wtbuddy.repository;

import com.wtbuddy.wtbuddy.entity.UserInterest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface UserInterestRepository extends JpaRepository<UserInterest, Long> {
    List<UserInterest> findByUserId(Long userId);
    void deleteByUserIdAndInterestId(Long userId, Long interestId);
    boolean existsByUserIdAndInterestId(Long userId, Long interestId);
}