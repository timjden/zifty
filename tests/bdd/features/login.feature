Feature: Logging in to Zifty

  Scenario: User signs up for Zifty (not signed in to Google Chrome)
      Given I am not signed in to Google Chrome
      And I have installed Zifty on Google Chrome
      And I have not signed up for Zifty before
      When I click the Zifty icon
      Then I should see the Zifty popup
      And I click the Sign in with Google button
      Then a new tab should open asking me to sign in to Google Chrome
      When I complete the sign in process
      Then a popup should appear asking me to connect Zifty with Google
      When I complete the process
      And I open the Zifty popup
      And I should see toggles
      And I should see Logout and Subscribe buttons

  Scenario: User signs up for Zifty (signed in to Google Chrome)
      Given I am signed in to Google Chrome
      And I have installed Zifty on Google Chrome
      And I have not signed up for Zifty before
      When I click the Zifty icon
      And I click the Sign in with Google button
      Then a popup should appear asking me to sign in to Google
      When I complete the sign in process
      And I open the Zifty popup
      Then I should see the Zifty popup
      And I should see toggles
      And I should see Logout and Subscribe buttons

    Scenario: User signs in to Zifty (not signed in to Google Chrome)
      Given I am not signed in to Google Chrome
      And I have installed Zifty on Google Chrome
      And I have signed up for Zifty before
      And I am not signed in to Zifty
      When I click the Zifty icon
      Then I should see the Zifty popup
      And I should see no toggles
      And I should see a Sign in with Google button
      And I should see a message that says "Sign in and subscribe to access premium features!"
      When I click the Sign in with Google button
      Then A new tab opens asking me to sign in to Chrome
      When I complete the sign in process
      Then a popup should appear asking me to connect Zifty with Google
      When I complete the process
      And I open the Zifty popup
      And I should see toggles
      And I should see Logout and Subscribe buttons
  
  Scenario: User signs in to Zifty (signed in to Google Chrome)
      Given I am signed in to Google Chrome
      And I have installed Zifty on Google Chrome
      And I have signed up for Zifty before
      And I am not signed in to Zifty
      When I click the Zifty icon
      Then I should see the Zifty popup
      And I should see no toggles
      And I should see a Sign in with Google button
      And I should see a message that says "Sign in and subscribe to access premium features!"
      When I click the Sign in with Google button
      Then I should automatically be signed in to Zifty
      And I should see toggles
      And I should see Logout and Subscribe buttons
  
