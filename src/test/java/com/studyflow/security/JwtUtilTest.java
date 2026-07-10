package com.studyflow.security;

import com.studyflow.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class JwtUtilTest {

    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secret", "test-secret-for-studyflow-jwt-token-signing-2026");
        ReflectionTestUtils.setField(jwtUtil, "expiration", 60_000L);
    }

    @Test
    void generatedTokenCarriesUserIdentity() {
        User user = new User();
        user.setId(42L);
        user.setUsername("demo");
        user.setPassword("encoded");
        user.setRole("USER");

        String token = jwtUtil.generateToken(user);

        assertThat(jwtUtil.getUsername(token)).isEqualTo("demo");
        assertThat(jwtUtil.getUserId(token)).isEqualTo(42L);
        assertThat(jwtUtil.validateToken(token, new LoginUser(user))).isTrue();
    }
}
