Feature: Installing Zifty
  
    Scenario: Finding the Zifty extension in the Chrome Web Store
        Given I have opened the Google Chrome browser
        When I go to the Chrome Web Store
        And I search for Zifty
        And I click on the Zifty extension
        Then I should see the Zifty extension page
  
    Scenario: Installing Zifty on Google Chrome
        Given I am on the Zifty extension page
        When I click on the "Add to Chrome" button
        Then I should see the installation confirmation dialog
        And I should see requested permissions: "Read and change all your data on the websites you visit" and "Detect your physical location"
        When I click on the "Add extension" button
        Then I should see a popup with the message "Zifty has been added to Chrome"
        When I click on the Extensions icon in the Chrome toolbar
        Then I should see the Zifty extension in the list of installed extensions
        When I click the pin icon next to the Zifty extension
        Then I should see the Zifty extension icon in the Chrome toolbar
        And the Zifty icon should be a grey box with a "Z" in the middle