# portfolios.py
# ----------------------------------------------------------------------
# Beheert MEERDERE paper-portefeuilles (één per munt) in één statusbestand.
# Elke munt is een los experiment met zijn eigen START_CASH.
# ----------------------------------------------------------------------

import json
import os

import config
from portfolio import Portfolio


# Data uit het statusbestand die niet bij de huidige munten hoort (bv. een munt
# die je uit SYMBOLS haalde) bewaren we hier, zodat save_all die niet weggooit.
_extra_state = {}


def load_all(path, symbols=None):
    """
    Laad een portemonnee per munt. Ontbrekende/beschadigde data -> verse
    portemonnee voor die munt (nooit crashen).
    - Een OUD single-coin bestand ({"cash": ...}) wordt automatisch gemigreerd
      naar de eerste munt in plaats van stilletjes gewist.
    - Data van munten die niet (meer) in SYMBOLS staan blijft bewaard (zie
      save_all) en er wordt een waarschuwing getoond.
    Geeft een dict terug: {symbool: Portfolio}.
    """
    global _extra_state
    symbols = symbols or config.SYMBOLS
    data = {}
    if os.path.exists(path):
        try:
            with open(path) as f:
                data = json.load(f)
        except Exception as e:
            print(f"  (waarschuwing: '{path}' onleesbaar ({e}) -> verse portefeuilles)")
            data = {}
    if not isinstance(data, dict):
        data = {}

    # Oud single-coin formaat herkennen ({"cash": ..., "coins": ...}) en
    # migreren naar de eerste munt in plaats van de historie te verliezen.
    if "cash" in data and not any(isinstance(v, dict) for v in data.values()):
        eerste = symbols[0]
        print(f"  (oud single-coin statusbestand gevonden -> gemigreerd naar {eerste})")
        data = {eerste: data}

    # Onbekende sleutels (bv. verwijderde munten) bewaren + melden.
    _extra_state = {k: v for k, v in data.items() if k not in symbols}
    if _extra_state:
        print(f"  (let op: state bevat munten buiten SYMBOLS, blijft bewaard: "
              f"{', '.join(_extra_state.keys())})")

    ports = {}
    for sym in symbols:
        d = data.get(sym)
        ports[sym] = Portfolio.from_dict(d) if isinstance(d, dict) else Portfolio()
    return ports


def save_all(path, ports):
    """
    Bewaar alle portefeuilles ATOMAIR (tmp-bestand -> omwisselen).
    Data van munten buiten de huidige SYMBOLS (uit _extra_state) wordt
    meegeschreven, zodat niets stilletjes verloren gaat.
    """
    payload = dict(_extra_state)
    payload.update({sym: pf.to_dict() for sym, pf in ports.items()})
    tmp = f"{path}.tmp"
    with open(tmp, "w") as f:
        json.dump(payload, f, indent=2)
    os.replace(tmp, path)


def total_value(ports, prices):
    """Totale waarde over alle munten, gegeven een dict {symbool: prijs}."""
    total = 0.0
    for sym, pf in ports.items():
        price = prices.get(sym)
        if price is not None:
            total += pf.value(price)
    return total
