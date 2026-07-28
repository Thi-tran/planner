package com.planner.model.entity;

import com.fasterxml.jackson.annotation.JsonValue;

public enum TaskStatus {
    TODO("todo"),
    DONE("done");
    
    private final String dbValue;
    
    TaskStatus(String dbValue) {
        this.dbValue = dbValue;
    }
    
    @JsonValue
    public String getDbValue() {
        return dbValue;
    }
    
    public static TaskStatus fromDbValue(String dbValue) {
        for (TaskStatus status : values()) {
            if (status.dbValue.equals(dbValue)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown TaskStatus: " + dbValue);
    }
}
