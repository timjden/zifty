Feature: Zifty overlay

  Scenario: User navigates to an unsupported site
    Given I have navigate to example.com
    Then Zifty overlay is not displayed

  Scenario: User searches for a product on Amazon
    Given I have searched for "tent" on Amazon
    Then Zifty overlay is displayed

Scenario: User searches for a product on Google
    Given I have searched for "buy tent near me" on Google
    And Google shows some products for sale with prices
    Then Zifty overlay is diplayed

Scenario: User searches Google for something other than a product to buy
    Given I have searched for "how to pitch a tent" on Google
    Then Zifty overlay is not displayed

Scenario: Zifty can't find any products to display
    Given I have searched for "asdfghjkl" on Amazon
    Then Zifty overlay is displayed with a message saying no products were found

Scenario: User navigates to a country-specific Amazon site
    Given I have navigated to amazon.de
    And I have searched for "tent" on Amazon
    Then Zifty overlay is displayed