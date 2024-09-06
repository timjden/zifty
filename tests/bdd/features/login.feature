Feature: Logging in to Zifty

  Scenario: User opens popup when not signed in to Zifty
    Given I have installed Zifty on Google Chrome for the first time
    When I click the Zifty icon
    Then I should see the Zifty popup
    And I should see no toggles
    And I should see a Sign in with Google button
    And I should see a message that says "Sign in and subscribe to access premium features!"
  
  Scenario: User signs in to Zifty
    Given I am not signed in to Google Chrome
    And I have installed Zifty on Google Chrome for the first time
    When I click the Zifty icon
    And I click the Sign in with Google button
    Then a popup should appear asking me to sign in to Google
    When I complete the sign in process
    And I open the Zifty popup
    Then I should see the Zifty popup
    And I should see toggles
    And I should see Logout and Subscribe buttons
