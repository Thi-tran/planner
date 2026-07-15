package com.planner.domain;

import com.planner.model.entity.Role;
import jakarta.validation.constraints.NotNull;

public record UpdateMemberRoleRequest(
        @NotNull Role role
) {
}
