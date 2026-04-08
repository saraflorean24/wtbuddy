package com.wtbuddy.wtbuddy.service;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    public void sendFriendRequestEmail(String toEmail, String requesterUsername) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("New Friend Request - WTBuddy");
        message.setText("Hello! " + requesterUsername + " sent you a friend request on WTBuddy. " +
                "Log in to accept or decline.");
        mailSender.send(message);
    }

    public void sendFriendAcceptedEmail(String toEmail, String addresseeUsername) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("Friend Request Accepted - WTBuddy");
        message.setText("Hello! " + addresseeUsername + " accepted your friend request on WTBuddy. " +
                "Log in to see your new friend!");
        mailSender.send(message);
    }

    public void sendEventJoinEmail(String toEmail, String username, String eventTitle) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("New Participant - WTBuddy");
        message.setText("Hello! " + username + " joined your event '" + eventTitle + "' on WTBuddy.");
        mailSender.send(message);
    }

    public void sendTripJoinRequestEmail(String toEmail, String requesterUsername, String tripTitle) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("New Trip Join Request - WTBuddy");
        message.setText("Hello! " + requesterUsername + " wants to join your trip '" + tripTitle + "' on WTBuddy. " +
                "Log in to accept or decline.");
        mailSender.send(message);
    }

    public void sendTripJoinAcceptedEmail(String toEmail, String tripTitle) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("Trip Join Request Accepted - WTBuddy");
        message.setText("Great news! Your request to join the trip '" + tripTitle + "' has been accepted on WTBuddy.");
        mailSender.send(message);
    }

    public void sendTripJoinDeclinedEmail(String toEmail, String tripTitle) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("Trip Join Request Declined - WTBuddy");
        message.setText("Your request to join the trip '" + tripTitle + "' has been declined on WTBuddy.");
        mailSender.send(message);
    }
}