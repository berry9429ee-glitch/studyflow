package com.studyflow.dto.mapper;

import com.studyflow.dto.response.PlanDetailResponse;
import com.studyflow.dto.response.PlanItemResponse;
import com.studyflow.dto.response.PlanLogResponse;
import com.studyflow.dto.response.PlanResponse;
import com.studyflow.dto.response.NotificationResponse;
import com.studyflow.dto.response.UserResponse;
import com.studyflow.entity.Notification;
import com.studyflow.entity.Plan;
import com.studyflow.entity.PlanItem;
import com.studyflow.entity.PlanLog;
import com.studyflow.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface StudyFlowMapper {

    UserResponse toUserResponse(User user);

    PlanResponse toPlanResponse(Plan plan);

    List<PlanResponse> toPlanResponses(List<Plan> plans);

    PlanItemResponse toPlanItemResponse(PlanItem item);

    List<PlanItemResponse> toPlanItemResponses(List<PlanItem> items);

    PlanLogResponse toPlanLogResponse(PlanLog log);

    List<PlanLogResponse> toPlanLogResponses(List<PlanLog> logs);

    @Mapping(source = "readStatus", target = "read")
    NotificationResponse toNotificationResponse(Notification notification);

    List<NotificationResponse> toNotificationResponses(List<Notification> notifications);

    default PlanDetailResponse toPlanDetailResponse(Plan plan, List<PlanItem> items, List<PlanLog> logs) {
        if (plan == null) {
            return null;
        }
        PlanDetailResponse response = new PlanDetailResponse();
        response.setId(plan.getId());
        response.setTitle(plan.getTitle());
        response.setDescription(plan.getDescription());
        response.setCategory(plan.getCategory());
        response.setStatus(plan.getStatus());
        response.setPriority(plan.getPriority());
        response.setDueDate(plan.getDueDate());
        response.setProgress(plan.getProgress());
        response.setCreatedAt(plan.getCreatedAt());
        response.setUpdatedAt(plan.getUpdatedAt());
        response.setItems(toPlanItemResponses(items));
        response.setLogs(toPlanLogResponses(logs));
        return response;
    }
}
