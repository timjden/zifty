Feature: Zifty popup

  Scenario: User navigates to an unsupported site
    Given I have navigate to example.com
    Then Zifty popup is not displayed
  
  Scenario: User searches for a product on Takealot
    Given I have searched for "tent" on Takealot
    Then Zifty popup is displayed
    When I navigate to example.com
    Then Zifty popup is hidden
  
  Scenario: User clicks on suggested search term on Takealot
    Given I have searched for "tent" on Takealot
    Then Zifty popup is displayed
    When I click on one of the suggested search terms
    Then Zifty reloads and displays new listings

  Scenario: User reloads the page on Takealot
    Given I have searched for "tent" on Takealot
    Then Zifty popup is displayed
    When I click the close button on the Zifty popup
    Then Zifty popup is hidden
    When I reload the page
    Then Zifty popup is displayed

  Scenario: User searches for a product on Amazon
    Given I have searched for "tent" on Amazon
    Then Zifty popup is displayed

  Scenario: User clicks Load More button on Takealot
    Given I have searched for "tent" on Takealot
    Then Zifty popup is diplayed
    When I close the Zifty popup
    Then the Zifty popup is hidden
    When I scroll to the bottom of the search results
    Then there is a Load More button
    When I click the Load More button
    Then Zifty does not display the popup