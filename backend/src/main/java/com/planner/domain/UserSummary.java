package com.planner.domain;

import java.util.UUID;

public record UserSummary(
        UUID id,
        String displayName,
        String email,
        String pictureUrl
) {
}
