package com.wtbuddy.wtbuddy.service;

import com.wtbuddy.wtbuddy.dto.request.feedback.CreateFeedbackRequest;
import com.wtbuddy.wtbuddy.dto.response.feedback.FeedbackResponse;
import com.wtbuddy.wtbuddy.entity.Feedback;
import com.wtbuddy.wtbuddy.entity.User;
import com.wtbuddy.wtbuddy.exception.ResourceNotFoundException;
import com.wtbuddy.wtbuddy.repository.FeedbackRepository;
import com.wtbuddy.wtbuddy.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final UserRepository userRepository;

    @Transactional
    public FeedbackResponse submit(CreateFeedbackRequest request, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Feedback feedback = Feedback.builder()
                .user(user)
                .category(request.getCategory())
                .rating(request.getRating())
                .topics(request.getTopics())
                .message(request.getMessage())
                .build();

        feedbackRepository.save(feedback);
        return mapToResponse(feedback);
    }

    public Page<FeedbackResponse> getMyFeedback(String email, int page, int size) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return feedbackRepository.findByUserId(user.getId(),
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public Page<FeedbackResponse> getAllFeedback(int page, int size) {
        return feedbackRepository.findAllWithDetails(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public List<FeedbackResponse> getPublicTestimonials() {
        return feedbackRepository.findRecentWithMessage(
                PageRequest.of(0, 9, Sort.by(Sort.Direction.DESC, "createdAt")))
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    private FeedbackResponse mapToResponse(Feedback f) {
        return FeedbackResponse.builder()
                .id(f.getId())
                .userId(f.getUser().getId())
                .username(f.getUser().getUsername())
                .category(f.getCategory())
                .rating(f.getRating())
                .topics(f.getTopics())
                .message(f.getMessage())
                .createdAt(f.getCreatedAt())
                .build();
    }
}
