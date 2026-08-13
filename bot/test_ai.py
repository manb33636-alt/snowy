# test_ai.py
# ----------------------------------------------------------------------
# Test of de slimme AI-nieuwsanalyse (Claude) werkt.
# Draai met:  python test_ai.py
#
# Heb je nog geen sleutel? Dan legt dit script uit wat je moet doen.
# ----------------------------------------------------------------------

import os

import config
import sentiment


def main():
    print("=== Claude-AI sentiment test ===\n")
    key = os.environ.get("ANTHROPIC_API_KEY", "")

    if not key:
        print("Er is nog GEEN ANTHROPIC_API_KEY gevonden.")
        print("Zo zet je de slimme AI-analyse aan:\n")
        print("  1. Maak een API-sleutel aan op https://console.anthropic.com")
        print("  2. Kopieer het sjabloon naar een .env-bestand:")
        print("        cp .env.example .env")
        print("     en zet je sleutel achter ANTHROPIC_API_KEY=")
        print("  3. Zet in config.py:   SENTIMENT_METHOD = \"claude\"")
        print("  4. Draai dit script opnieuw:   python test_ai.py")
        print("\n(De gratis woord-analyse blijft gewoon werken zonder sleutel.)")
        return

    print(f"Sleutel gevonden (begint met '{key[:7]}…').")
    print(f"Model uit config: {config.CLAUDE_MODEL}\n")

    sample = [
        "Bitcoin surges to new all-time high as institutions pile in",
        "Major crypto exchange hacked, billions stolen, market in panic",
        "Regulators approve spot Bitcoin ETF in landmark decision",
    ]
    print("Drie testkoppen naar Claude sturen...")
    try:
        score, reason = sentiment.claude_sentiment(sample)
        print(f"\n  Sentiment-score: {score:+.2f}")
        print(f"  Uitleg: {reason}")
        print("\n✅ Claude-AI werkt!")
        if config.SENTIMENT_METHOD != "claude":
            print("   Zet nog  SENTIMENT_METHOD = \"claude\"  in config.py om hem")
            print("   echt in de bot te gebruiken (nu staat hij op 'keyword').")
        else:
            print("   SENTIMENT_METHOD staat al op 'claude' — de bot gebruikt 'm.")
    except Exception as e:
        print(f"\n❌ Claude-aanroep mislukte: {e}")
        print("   Check of je sleutel klopt en of er tegoed op je account staat.")


if __name__ == "__main__":
    main()
