package com.planner.security;

import com.planner.model.entity.MembershipStatus;
import com.planner.model.entity.ProjectEntity;
import com.planner.model.entity.ProjectMembershipEntity;
import com.planner.model.entity.Role;
import com.planner.model.entity.UserEntity;
import com.planner.model.repository.ProjectMembershipRepository;
import com.planner.model.repository.ProjectRepository;
import com.planner.model.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CurrentUserService {

    private static final UUID GENERAL_PROJECT_ID = UUID.fromString("00000000-0000-4000-a000-000000000001");

    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMembershipRepository membershipRepository;

    @Transactional
    public UserEntity resolveCurrentUser(Jwt jwt) {
        String googleSub = jwt.getSubject();
        String email = jwt.getClaimAsString("email");
        String displayName = jwt.getClaimAsString("name");
        String pictureUrl = jwt.getClaimAsString("picture");

        UserEntity user = userRepository.findByGoogleSub(googleSub).orElse(null);

        if (user == null) {
            try {
                user = userRepository.save(UserEntity.builder()
                        .googleSub(googleSub)
                        .email(email != null ? email.toLowerCase() : null)
                        .displayName(displayName)
                        .pictureUrl(pictureUrl)
                        .build());
                onNewUserRegistered(user);
            } catch (DataIntegrityViolationException e) {
                user = userRepository.findByGoogleSub(googleSub)
                        .orElseThrow(() -> new IllegalStateException("User not found after conflict", e));
            }
        } else {
            user.setEmail(email != null ? email.toLowerCase() : user.getEmail());
            user.setDisplayName(displayName);
            user.setPictureUrl(pictureUrl);
            user = userRepository.save(user);
        }

        activatePendingInvites(user);

        return user;
    }

    private void onNewUserRegistered(UserEntity user) {
        // Create personal default project
        ProjectEntity personal = projectRepository.save(ProjectEntity.builder()
                .name("My Calendar")
                .startDate(LocalDate.now())
                .color("Sky Cyan")
                .status("in progress")
                .build());

        membershipRepository.save(ProjectMembershipEntity.builder()
                .projectId(personal.getId())
                .userId(user.getId())
                .role(Role.OWNER)
                .status(MembershipStatus.ACTIVE)
                .build());

        // Adopt General project as OWNER if it has no OWNER yet
        if (!membershipRepository.existsByProjectIdAndRole(GENERAL_PROJECT_ID, Role.OWNER)) {
            membershipRepository.save(ProjectMembershipEntity.builder()
                    .projectId(GENERAL_PROJECT_ID)
                    .userId(user.getId())
                    .role(Role.OWNER)
                    .status(MembershipStatus.ACTIVE)
                    .build());
        }
    }

    private void activatePendingInvites(UserEntity user) {
        String email = user.getEmail();
        if (email == null) return;

        List<ProjectMembershipEntity> pending = membershipRepository.findByInvitedEmailIgnoreCase(email);
        for (ProjectMembershipEntity invite : pending) {
            if (invite.getStatus() != MembershipStatus.PENDING) continue;
            // Skip if already an active member of this project
            boolean alreadyMember = membershipRepository
                    .findByProjectIdAndUserId(invite.getProjectId(), user.getId())
                    .isPresent();
            if (alreadyMember) continue;

            invite.setUserId(user.getId());
            invite.setStatus(MembershipStatus.ACTIVE);
            invite.setInvitedEmail(null);
            membershipRepository.save(invite);
        }
    }
}
