package com.planner.domain;

import com.planner.model.entity.MembershipStatus;
import com.planner.model.entity.Role;

import java.util.UUID;

public record MembershipResponse(
        UUID id,
        UUID userId,
        String email,
        String displayName,
        Role role,
        MembershipStatus status
) {
}
