package com.planner.model.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class TaskStatusConverter implements AttributeConverter<TaskStatus, String> {
    
    @Override
    public String convertToDatabaseColumn(TaskStatus status) {
        if (status == null) {
            return null;
        }
        return status.getDbValue();
    }
    
    @Override
    public TaskStatus convertToEntityAttribute(String dbValue) {
        if (dbValue == null) {
            return null;
        }
        return TaskStatus.fromDbValue(dbValue);
    }
}
