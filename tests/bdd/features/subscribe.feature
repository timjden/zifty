Feature: Subscribing to Zifty

  Scenario: Subscribe to Zifty
    Given I am signed in to Zifty
    And I click the subscribe button
    Then I am redirected to the Lemon Squeezy payment page
    When I enter my payment details
    And I click the pay button
    Then I see a success message
    And I get an email confirming my subscription
    When I open the Zifty popup
    Then I see a message "You are subscribed to Zifty"
    And there are toggles for Google and Bing

  Scenario: Access premium features
    Given I am subscribed to Zifty
    And I have toggled on Google
    When I search for something in Google like "buy shoes"
    Then I see a Zifty overlay