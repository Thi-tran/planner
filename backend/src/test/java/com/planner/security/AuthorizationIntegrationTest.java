package com.planner.security;

import com.planner.controller.EventController;
import com.planner.controller.CategoryController;
import com.planner.controller.ProjectController;
import com.planner.model.entity.UserEntity;
import com.planner.service.EventService;
import com.planner.service.CategoryService;
import com.planner.service.ProjectService;
import com.planner.service.ProjectMembershipService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web-layer security tests. Uses {@code @WebMvcTest} (no database required) so
 * that only the Spring MVC stack and Security filter chain are loaded.
 * {@code SecurityMockMvcRequestPostProcessors.jwt()} injects a pre-built
 * {@link org.springframework.security.oauth2.jwt.Jwt} directly into the
 * security context, bypassing the Google JWKS call entirely.
 */
@WebMvcTest(controllers = {EventController.class, CategoryController.class, ProjectController.class})
class AuthorizationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    // All service dependencies must be stubbed so the web slice starts cleanly.
    @MockitoBean
    private EventService eventService;
    @MockitoBean
    private CategoryService categoryService;
    @MockitoBean
    private ProjectService projectService;
    @MockitoBean
    private ProjectMembershipService projectMembershipService;
    @MockitoBean
    private CurrentUserService currentUserService;

    @BeforeEach
    void setUp() {
        // Mock CurrentUserService to return a test user
        UserEntity testUser = UserEntity.builder()
                .id(UUID.randomUUID())
                .googleSub("test-google-sub")
                .email("test@example.com")
                .displayName("Test User")
                .build();
        
        when(currentUserService.resolveCurrentUser(any())).thenReturn(testUser);
    }

    // ── Unauthenticated requests should be rejected with 401 ──────────────────

    @Test
    void eventsEndpoint_withoutAuth_returns401() throws Exception {
        mockMvc.perform(get("/api/events").param("projectId", "00000000-0000-0000-0000-000000000001"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void categoriesEndpoint_withoutAuth_returns401() throws Exception {
        mockMvc.perform(get("/api/categories").param("projectId", "00000000-0000-0000-0000-000000000001"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void projectsEndpoint_withoutAuth_returns401() throws Exception {
        mockMvc.perform(get("/api/projects"))
                .andExpect(status().isUnauthorized());
    }

    // ── Authenticated request with a valid JWT passes the security layer ──────
    // The mock service returns null so the controller will produce some 4xx/5xx
    // from business logic — we only assert it is NOT a 401 (Unauthorized).

    @Test
    void eventsEndpoint_withValidJwt_passesSecurity() throws Exception {
        mockMvc.perform(
                get("/api/events")
                        .param("projectId", "00000000-0000-0000-0000-000000000001")
                        .with(jwt().jwt(b -> b
                                .subject("test-google-sub")
                                .claim("email", "test@example.com")
                                .claim("name", "Test User"))))
                .andExpect(status().is(not(equalTo(401))));
    }

    @Test
    void projectsEndpoint_withValidJwt_passesSecurity() throws Exception {
        mockMvc.perform(
                get("/api/projects")
                        .with(jwt().jwt(b -> b
                                .subject("test-google-sub")
                                .claim("email", "test@example.com")
                                .claim("name", "Test User"))))
                .andExpect(status().is(not(equalTo(401))));
    }
}
