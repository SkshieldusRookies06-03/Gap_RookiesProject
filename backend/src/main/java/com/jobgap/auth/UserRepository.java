package com.jobgap.auth;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** User persistence for T-015 and follow-up T-058. */
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUuid(String uuid);
    Optional<User> findByRefreshTokenHash(String refreshTokenHash);
    boolean existsByEmail(String email);
}
