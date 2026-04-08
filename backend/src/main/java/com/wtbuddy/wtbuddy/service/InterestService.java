package com.wtbuddy.wtbuddy.service;

import com.wtbuddy.wtbuddy.dto.request.interest.AddUserInterestRequest;
import com.wtbuddy.wtbuddy.dto.request.interest.CreateInterestRequest;
import com.wtbuddy.wtbuddy.dto.response.interest.InterestResponse;
import com.wtbuddy.wtbuddy.entity.Interest;
import com.wtbuddy.wtbuddy.entity.User;
import com.wtbuddy.wtbuddy.entity.UserInterest;
import com.wtbuddy.wtbuddy.exception.AlreadyExistsException;
import com.wtbuddy.wtbuddy.exception.ResourceNotFoundException;
import com.wtbuddy.wtbuddy.repository.InterestRepository;
import com.wtbuddy.wtbuddy.repository.UserInterestRepository;
import com.wtbuddy.wtbuddy.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class InterestService {

    private final InterestRepository interestRepository;
    private final UserInterestRepository userInterestRepository;
    private final UserRepository userRepository;

    public List<InterestResponse> getAllInterests() {
        return interestRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<InterestResponse> getInterestsByCategory(String category) {
        return interestRepository.findByCategory(category)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<InterestResponse> getUserInterests(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return userInterestRepository.findByUserId(user.getId())
                .stream()
                .map(ui -> mapToResponse(ui.getInterest()))
                .toList();
    }

    @Transactional
    public InterestResponse createInterest(CreateInterestRequest request) {
        if (interestRepository.findAll().stream()
                .anyMatch(i -> i.getName().equalsIgnoreCase(request.getName()))) {
            throw new AlreadyExistsException("Interest already exists: " + request.getName());
        }

        Interest interest = Interest.builder()
                .name(request.getName())
                .category(request.getCategory())
                .build();

        interestRepository.save(interest);
        return mapToResponse(interest);
    }

    @Transactional
    public void addUserInterest(AddUserInterestRequest request, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Interest interest = interestRepository.findById(request.getInterestId())
                .orElseThrow(() -> new ResourceNotFoundException("Interest not found"));

        if (userInterestRepository.existsByUserIdAndInterestId(user.getId(), interest.getId())) {
            throw new AlreadyExistsException("Interest already added to profile");
        }

        UserInterest userInterest = UserInterest.builder()
                .user(user)
                .interest(interest)
                .build();

        userInterestRepository.save(userInterest);
    }

    @Transactional
    public void removeUserInterest(Long interestId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!userInterestRepository.existsByUserIdAndInterestId(user.getId(), interestId)) {
            throw new ResourceNotFoundException("Interest not found in profile");
        }

        userInterestRepository.deleteByUserIdAndInterestId(user.getId(), interestId);
    }

    private InterestResponse mapToResponse(Interest interest) {
        return InterestResponse.builder()
                .id(interest.getId())
                .name(interest.getName())
                .category(interest.getCategory())
                .build();
    }
}