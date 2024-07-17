Feature: Zifty popup
  Scenario: User clicks "Load More" button on Takealot
    Given I have searched for "tent" on Takealot
    Then Zifty popup is diplayed
    When I close the Zifty popup
    Then the Zifty popup is hidden
    When I scroll to the bottom of the search results
    Then there is a Load More button
    When I click the Load More button
    Then Zifty does not display the popup