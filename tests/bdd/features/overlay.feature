Feature: Zifty overlay

  Scenario: User navigates to an unsupported site
    Given I have navigate to example.com
    Then Zifty overlay is not displayed
  
  Scenario: User searches for a product on Takealot
    Given I have searched for "tent" on Takealot
    Then Zifty overlay is displayed
    When I navigate to example.com
    Then Zifty overlay is hidden
  
  Scenario: User clicks on suggested search term on Takealot
    Given I have searched for "tent" on Takealot
    Then Zifty overlay is displayed
    When I click on one of the suggested search terms
    Then Zifty reloads and displays new listings

  Scenario: User reloads the page on Takealot
    Given I have searched for "tent" on Takealot
    Then Zifty overlay is displayed
    When I click the close button on the Zifty overlay
    Then Zifty overlay is hidden
    When I reload the page
    Then Zifty overlay is displayed

  Scenario: User searches for a product on Amazon
    Given I have searched for "tent" on Amazon
    Then Zifty overlay is displayed

  Scenario: User clicks Load More button on Takealot
    Given I have searched for "tent" on Takealot
    Then Zifty overlay is diplayed
    When I close the Zifty overlay
    Then the Zifty overlay is hidden
    When I scroll to the bottom of the search results
    Then there is a Load More button
    When I click the Load More button
    Then Zifty does not display the overlay

Scenario: User searches for a product on Google
    Given I have searched for "buy tent near me" on Google
    And Google shows some products for sale with prices
    Then Zifty overlay is diplayed

Scenario: User searches Google for something other than a product to buy
    Given I have searched for "how to pitch a tent" on Google
    Then Zifty overlay is not displayed

Scenario Outline: Zifty can't find any products to display
    Given I have searched for "<search_term>" on Takealot
    Then Zifty overlay is displayed with a message saying no products were found
    Examples:
      | search_term           |
      | asdfghjkl             |
      | lavalier microphone   |