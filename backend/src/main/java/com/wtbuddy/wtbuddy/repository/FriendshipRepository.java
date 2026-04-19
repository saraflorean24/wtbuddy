package com.wtbuddy.wtbuddy.repository;

import com.wtbuddy.wtbuddy.entity.Friendship;
import com.wtbuddy.wtbuddy.enums.FriendshipStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface FriendshipRepository extends JpaRepository<Friendship, Long> {

    @Query("SELECT f FROM Friendship f WHERE " +
            "(f.requester.id = :userId OR f.addressee.id = :userId) " +
            "AND f.status = :status")
    List<Friendship> findByUserIdAndStatus(@Param("userId") Long userId,
                                           @Param("status") FriendshipStatus status);

    @Query("SELECT f FROM Friendship f WHERE " +
            "(f.requester.id = :user1Id AND f.addressee.id = :user2Id) OR " +
            "(f.requester.id = :user2Id AND f.addressee.id = :user1Id)")
    Optional<Friendship> findBetweenUsers(@Param("user1Id") Long user1Id,
                                          @Param("user2Id") Long user2Id);

    @Query("SELECT CASE WHEN COUNT(f) > 0 THEN true ELSE false END FROM Friendship f WHERE " +
            "((f.requester.id = :user1Id AND f.addressee.id = :user2Id) OR " +
            "(f.requester.id = :user2Id AND f.addressee.id = :user1Id)) " +
            "AND f.status IN (com.wtbuddy.wtbuddy.enums.FriendshipStatus.PENDING, com.wtbuddy.wtbuddy.enums.FriendshipStatus.ACCEPTED)")
    boolean existsBetweenUsers(@Param("user1Id") Long user1Id,
                               @Param("user2Id") Long user2Id);

    @Query("SELECT CASE WHEN COUNT(f) > 0 THEN true ELSE false END FROM Friendship f WHERE " +
            "((f.requester.id = :user1Id AND f.addressee.id = :user2Id) OR " +
            "(f.requester.id = :user2Id AND f.addressee.id = :user1Id)) " +
            "AND f.status = com.wtbuddy.wtbuddy.enums.FriendshipStatus.ACCEPTED")
    boolean existsAcceptedBetweenUsers(@Param("user1Id") Long user1Id,
                                       @Param("user2Id") Long user2Id);
}