Feature: Toggling on/off supported sites

  Scenario Outline: All sites toggled on
    Given I am not subscribed to Zifty
    Given I have toggled on all supported sites
    And I search for something on <site>
    Then Zifty overlay is displayed
    Examples:
      | site         |
      | amazon.*     |
      | walmart.*    |
      | takealot.*   |
      | bol.*        |
      | temu.*       |
      | aliexpress.* |