Feature: Zifty popup

  Scenario: User clicks extension icon
    Given I have clicked the extension icon
    Then Zifty popup is displayed
    When I click the link to try Zifty
    Then A new tab is opened with a Takealot search for "tent"
    And Zifty popup is diplayed