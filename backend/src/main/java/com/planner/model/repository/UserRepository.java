package com.planner.model.repository;

import com.planner.model.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, UUID> {

    Optional<UserEntity> findByGoogleSub(String googleSub);

    Optional<UserEntity> findByEmailIgnoreCase(String email);
}
