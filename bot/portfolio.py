# portfolio.py
# ----------------------------------------------------------------------
# De NEP-portemonnee (paper trading).
# Houdt bij hoeveel cash en hoeveel crypto je "hebt", rekent kosten mee,
# en regelt stop-loss / take-profit. Er gaat NOOIT echt geld om.
# ----------------------------------------------------------------------

import json
import os

import config


class Portfolio:
    def __init__(self, cash=config.START_CASH):
        self.cash = cash          # hoeveel USDT (nepgeld) we hebben
        self.coins = 0.0          # hoeveel crypto we bezitten
        self.entry_price = None   # tegen welke prijs we gekocht hebben
        self.high_since_entry = None  # hoogste koers sinds aankoop (trailing stop)
        self.last_ts = None       # tijdstip laatst verwerkte candle (voor inhaalslag)
        self.trades = []          # logboek van alle transacties

    def value(self, price):
        """Totale waarde = cash + (crypto * huidige koers)."""
        return self.cash + self.coins * price

    def in_position(self):
        """Hebben we op dit moment crypto in bezit?"""
        return self.coins > 0

    def buy(self, price, time, tag="TECH", meta=None):
        """
        Koop crypto met (een deel van) onze cash.
        `tag` legt vast WAAROM we kochten (TECH / NEWS / TECH+NEWS), zodat we
        later kunnen meten of het nieuws waarde toevoegt.
        `meta` (optioneel) is een dict met extra logging-info voor het trade-log
        en het dagrapport -- bv. {"confidence": 78, "indicators": {...},
        "news_sentiment": 0.4, "reason_open": "..."}. Verandert NOOIT de
        koopbeslissing zelf, is puur voor latere analyse.
        """
        if self.in_position():
            return  # we zitten al in de markt, niet dubbel kopen
        spend = self.cash * config.POSITION_SIZE
        if spend <= 0:
            return
        exec_price = price * (1 + config.SLIPPAGE)  # je koopt net iets duurder
        fee = spend * config.FEE
        self.coins = (spend - fee) / exec_price
        self.cash -= spend
        self.entry_price = exec_price
        self.high_since_entry = exec_price  # trailing stop begint bij je aankoopprijs
        self.trades.append((time, "BUY", exec_price, self.value(exec_price), tag, meta))

    def sell(self, price, time, reason="SELL", tag=None, meta=None):
        """Verkoop al onze crypto terug naar cash. `tag` = reden-categorie.
        `meta` (optioneel): zie buy() -- hier vaak {"reason_close": reason, ...}."""
        if not self.in_position():
            return
        exec_price = price * (1 - config.SLIPPAGE)  # je verkoopt net iets goedkoper
        proceeds = self.coins * exec_price
        fee = proceeds * config.FEE
        self.cash += proceeds - fee
        self.coins = 0.0
        self.entry_price = None
        self.high_since_entry = None
        self.trades.append((time, reason, exec_price, self.value(exec_price), tag, meta))

    def check_risk(self, price, time, low=None, high=None):
        """
        Automatische bescherming (stop-loss / take-profit / trailing), op basis
        van de HELE candle. Een stop kan al BINNEN de candle geraakt worden, niet
        pas op de slotkoers — dus we kijken naar de laagste/hoogste koers.
        Bij een gap-down vul je realistisch op de (slechtere) slotkoers.
        Geef `low`/`high` mee voor deze realistische check; anders wordt de
        slotkoers gebruikt (terugval-gedrag).
        """
        if not self.in_position():
            return False
        low = price if low is None else low
        high = price if high is None else high

        # Stop-loss: geraakt als de LAAGSTE koers onder het niveau zakt.
        stop_level = self.entry_price * (1 - config.STOP_LOSS)
        if low <= stop_level:
            self.sell(min(stop_level, price), time, reason="STOP-LOSS", tag="RISK",
                      meta={"reason_close": f"Stop-loss geraakt op {config.STOP_LOSS*100:.0f}% onder instapprijs."})
            return True

        # Take-profit: geraakt als de HOOGSTE koers het niveau bereikt.
        tp_level = self.entry_price * (1 + config.TAKE_PROFIT)
        if high >= tp_level:
            self.sell(tp_level, time, reason="TAKE-PROFIT", tag="RISK",
                      meta={"reason_close": f"Take-profit geraakt op {config.TAKE_PROFIT*100:.0f}% boven instapprijs."})
            return True

        # Trailing stop — ZONDER vooruitkijken: we toetsen de trigger tegen de
        # piek zoals die VÓÓR deze candle stond, en verhogen de piek pas daarna
        # met de high van deze candle. (Binnen één candle weet je niet of de
        # high vóór of ná de low kwam; dit is de conservatieve aanname.)
        if config.USE_TRAILING_STOP:
            prev_peak = (self.high_since_entry
                         if self.high_since_entry is not None else self.entry_price)
            trail_level = prev_peak * (1 - config.TRAILING_STOP)
            if low <= trail_level:
                self.sell(min(trail_level, price), time, reason="TRAILING-STOP", tag="RISK",
                          meta={"reason_close": f"Trailing-stop geraakt: {config.TRAILING_STOP*100:.0f}% terug vanaf de piek sinds instap."})
                return True
            self.high_since_entry = max(prev_peak, high)

        return False

    # --- Opslaan & laden (zodat de bot een herstart overleeft) ---------

    def to_dict(self):
        """Zet de portemonnee om naar iets dat als JSON opgeslagen kan worden."""
        return {
            "cash": self.cash,
            "coins": self.coins,
            "entry_price": self.entry_price,
            "high_since_entry": self.high_since_entry,
            "last_ts": self.last_ts,
            # tijdstippen als tekst opslaan; 5e element (tag) en 6e (meta) indien aanwezig.
            "trades": [[str(t[0]), t[1], t[2], t[3],
                        (t[4] if len(t) > 4 else None),
                        (t[5] if len(t) > 5 else None)] for t in self.trades],
        }

    def save(self, path):
        """
        Bewaar de huidige stand ATOMAIR: eerst naar een tijdelijk bestand
        schrijven, dan in één keer omwisselen. Zo kan een crash midden in het
        opslaan het echte statusbestand nooit half/kapot achterlaten.
        """
        tmp = f"{path}.tmp"
        with open(tmp, "w") as f:
            json.dump(self.to_dict(), f, indent=2)
        os.replace(tmp, path)  # atomaire vervanging op hetzelfde schijfvolume

    @classmethod
    def from_dict(cls, d):
        """Bouw een portemonnee uit een dict (zoals to_dict die maakt)."""
        pf = cls(cash=float(d.get("cash", config.START_CASH)))
        pf.coins = float(d.get("coins", 0.0))
        pf.entry_price = d.get("entry_price")
        pf.high_since_entry = d.get("high_since_entry")
        pf.last_ts = d.get("last_ts")
        pf.trades = [tuple(t) for t in d.get("trades", [])]
        return pf

    @classmethod
    def load(cls, path):
        """
        Laad een eerder opgeslagen portemonnee. Bestaat het bestand niet, is het
        beschadigd, of mist het sleutels, dan beginnen we VEILIG met een verse
        portemonnee in plaats van te crashen (belangrijk voor een bot die
        onbewaakt draait).
        """
        if not os.path.exists(path):
            return cls()
        try:
            with open(path) as f:
                return cls.from_dict(json.load(f))
        except Exception as e:
            print(f"  (waarschuwing: '{path}' onleesbaar ({e}) -> verse portemonnee)")
            return cls()
