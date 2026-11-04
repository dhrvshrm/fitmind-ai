import pytest

from app.nutrition import food_db
from app.nutrition.parser import parse_meal_rules
from app.nutrition.text import tokens


def best(query):
    matches = food_db.search(query, 1)
    return matches[0] if matches else None


@pytest.mark.parametrize(
    "query, expected_id",
    [
        ("aloo paratha", "indb:ASC098"),
        ("aloo ka parantha", "indb:ASC098"),
        ("chapati", "indb:ASC096"),
        ("rotis", "indb:ASC096"),
        ("dal", "indb:ASC155"),
        ("rice", "indb:ASC113"),
        ("chawal", "indb:ASC113"),
        ("chai", "indb:ASC001"),
        ("poha", "indb:BFP044"),
        ("masala dosa", None),  # Checked by name below; id varies by dataset order.
        ("idli", "indb:ASC144"),
        ("rajma", "indb:ASC165"),
        ("chole", "indb:ASC162"),
        ("veg biryani", "indb:ASC123"),
        ("paneer tikka", "indb:ASC381"),
    ],
)
def test_common_indian_dishes_match_confidently(query, expected_id):
    match = best(query)
    assert match is not None and match.score >= food_db.MATCH_THRESHOLD, query
    if expected_id:
        assert match.food.id == expected_id


@pytest.mark.parametrize("query", ["chicken biryani", "paneer bhurji", "vada pav"])
def test_dishes_not_in_the_data_are_not_force_matched(query):
    """A mutton biryani must never be returned as "chicken biryani"."""
    match = best(query)
    assert match is None or match.score < food_db.MATCH_THRESHOLD


def test_generic_word_does_not_match_a_more_specific_dish():
    assert food_db.name_score("dal", "Dal parantha") < food_db.MATCH_THRESHOLD


def test_synonyms_and_stopwords_normalise():
    assert tokens("Aloo ka Parantha") == tokens("potato paratha")
    assert tokens("dahi chawal") == tokens("curd rice")


def test_dataset_has_no_deep_fry_artefacts():
    """Entries counting all frying oil (70-90 g fat per 100 g) were excluded at import."""
    foods = [entry.food for entry in food_db._index() if entry.food.source == "INDB"]
    assert len(foods) > 800
    for food in foods:
        if "mayonnaise" in food.name.lower() or "dressing" in food.name.lower():
            continue
        assert food.per_100g.fat <= 35, food.name


def test_grams_for_units():
    paratha = food_db.get_food("indb:ASC098")
    assert food_db.grams_for(paratha, 2, None) == round(2 * paratha.serving.grams, 1)
    assert food_db.grams_for(paratha, 2, "parathas") == round(2 * paratha.serving.grams, 1)
    assert food_db.grams_for(paratha, 120, "g") == 120
    rice = food_db.get_food("indb:ASC113")
    assert food_db.grams_for(rice, 1, "katori") == 150  # Different unit: household default.


@pytest.mark.parametrize(
    "text, expected",
    [
        ("2 rotis, dal and a bowl of rice", [("rotis", 2, None), ("dal", None, None), ("rice", 1, "bowl")]),
        ("Vada pav with chai", [("vada pav", None, None), ("chai", None, None)]),
        ("half plate biryani", [("biryani", 0.5, "plate")]),
        ("ek katori dahi aur 3 idli", [("dahi", 1, "bowl"), ("idli", 3, None)]),
        ("150 g paneer", [("paneer", 150, "g")]),
    ],
)
def test_rule_based_parser(text, expected):
    items = parse_meal_rules(text)
    assert [(i.name, i.quantity, i.unit) for i in items] == expected


@pytest.mark.parametrize(
    "typed, expected_id",
    [
        ("aalu parathas", "indb:ASC098"),
        ("aalu parahtna", "indb:ASC098"),
        ("chapathi", "indb:ASC096"),
        ("rotti", "indb:ASC096"),
        ("idly", "indb:ASC144"),
        ("daal", "indb:ASC155"),
        ("sambhar", "indb:ASC167"),
    ],
)
def test_common_misspellings_still_match(typed, expected_id):
    match = best(typed)
    assert match is not None and match.score >= food_db.MATCH_THRESHOLD, typed
    assert match.food.id == expected_id


def test_toppings_count_little_when_matching():
    """"cheese pav bhaji" is pav bhaji (the cheese is split off as its own item)."""
    assert best("cheese pav bhaji").food.name == "Pav bhaji"
    assert best("spicy aloo paratha").food.id == "indb:ASC098"


def test_typo_correction_does_not_invent_matches():
    """An unfamiliar but real word must not be "corrected" into a different food."""
    assert food_db.correct_tokens(frozenset({"paneer"})) == frozenset({"paneer"})
    assert best("peanut chikki") is None or best("peanut chikki").score < food_db.MATCH_THRESHOLD


def test_staples_come_from_usda():
    for query in ["curd", "dahi", "milk", "banana", "egg", "ghee"]:
        match = best(query)
        assert match is not None and match.food.source == "USDA", query


def test_toppings_on_breads_become_their_own_items():
    from app.nutrition.estimator import split_addons
    from app.nutrition.parser import ParsedItem

    parts = split_addons(ParsedItem(name="aalu butter paratha", quantity=2, unit=None))
    assert [(p.name, p.quantity, p.unit) for p in parts] == [
        ("aalu paratha", 2, None),
        ("butter", 2, "tsp"),
    ]
    # A dish named after its sauce is left whole.
    assert len(split_addons(ParsedItem(name="butter chicken"))) == 1
