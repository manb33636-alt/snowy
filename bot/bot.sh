#!/bin/bash
# bot.sh — bedien de live trading bot (via macOS launchd).
# Met launchd start de bot automatisch bij inloggen en herstart hij zichzelf
# als hij ooit crasht.
#
#   ./bot.sh start     -> aanzetten (en auto-start/auto-herstart inschakelen)
#   ./bot.sh stop      -> uitzetten
#   ./bot.sh restart   -> opnieuw starten
#   ./bot.sh status    -> draait hij? + laatste logregels

PLIST="$HOME/Library/LaunchAgents/com.tradingbot.live.plist"

case "$1" in
  start)
    launchctl unload "$PLIST" 2>/dev/null
    launchctl load -w "$PLIST"
    echo "Bot AAN — start automatisch bij inloggen en herstart bij een crash."
    ;;
  stop)
    launchctl unload "$PLIST" 2>/dev/null
    echo "Bot UIT."
    ;;
  restart)
    launchctl unload "$PLIST" 2>/dev/null
    launchctl load -w "$PLIST"
    echo "Bot herstart."
    ;;
  status)
    # launchctl list toont: PID  Status  Label. Staat er in kolom 1 een getal,
    # dan draait het proces ECHT nu. Staat er '-', dan is hij wel geladen maar
    # op dit moment niet actief (net gecrasht / wacht op herstart) — dat is iets
    # anders dan "draait", dus dat maken we eerlijk zichtbaar.
    line=$(launchctl list | grep com.tradingbot.live)
    if [ -z "$line" ]; then
        echo "Bot staat UIT (niet geladen in launchd)."
    else
        pid=$(echo "$line" | awk '{print $1}')
        if [ "$pid" = "-" ]; then
            echo "Bot is GELADEN maar draait NU NIET — net gecrasht of wacht op"
            echo "herstart door launchd. Check de laatste logregels hieronder."
        else
            echo "Bot DRAAIT (PID $pid, via launchd)."
        fi
    fi
    echo "--- laatste regels uit trades.log ---"
    tail -3 trades.log 2>/dev/null || echo "(nog geen log)"
    ;;
  *)
    echo "Gebruik: ./bot.sh {start|stop|restart|status}"
    ;;
esac
