package com.planner.model.entity;

public enum Role {
    VIEWER,
    EDITOR,
    OWNER;

    public boolean atLeast(Role minRole) {
        return this.ordinal() >= minRole.ordinal();
    }
}
