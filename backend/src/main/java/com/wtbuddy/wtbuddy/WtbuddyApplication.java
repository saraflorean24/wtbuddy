package com.wtbuddy.wtbuddy;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import com.wtbuddy.wtbuddy.security.JwtProperties;

@SpringBootApplication
@EnableConfigurationProperties(JwtProperties.class)
public class WtbuddyApplication {
	public static void main(String[] args) {
		SpringApplication.run(WtbuddyApplication.class, args);
	}
}