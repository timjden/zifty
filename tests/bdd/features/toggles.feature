Feature: Toggling on/off supported sites

  Scenario: User has all sites toggled on
      Given I have toggled on all supported sites
      And I search for something on amazon.*
      Then Zifty overlay is displayed