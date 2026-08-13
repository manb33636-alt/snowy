#!/bin/bash
# install_schedule.sh
# ----------------------------------------------------------------------
# Zet de automatische Telegram-taken aan of uit (via macOS launchd):
#   - dagelijkse MARKTANALYSE        (08:00)        -> Telegram
#   - dagelijks HERTUNEN             (09:00)        -> retune_report.txt (+ Telegram bij verbetering)
#   - dagelijks VOORTGANGSRAPPORT    (20:00)        -> Telegram + report_log.txt
#   - wekelijkse BEOORDELING         (maandag 09:30)-> Telegram (go/no-go)
#
#   ./install_schedule.sh          -> alle AAN
#   ./install_schedule.sh remove   -> alle UIT
# ----------------------------------------------------------------------

PLISTS=(
    "$HOME/Library/LaunchAgents/com.tradingbot.analysis.plist"
    "$HOME/Library/LaunchAgents/com.tradingbot.retune.plist"
    "$HOME/Library/LaunchAgents/com.tradingbot.report.plist"
    "$HOME/Library/LaunchAgents/com.tradingbot.evaluate.plist"
)

if [ "$1" = "remove" ]; then
    for PLIST in "${PLISTS[@]}"; do
        launchctl unload "$PLIST" 2>/dev/null
    done
    echo "Automatische taken UITgeschakeld (analyse + hertune + rapport + beoordeling)."
else
    for PLIST in "${PLISTS[@]}"; do
        if [ -f "$PLIST" ]; then
            launchctl unload "$PLIST" 2>/dev/null
            launchctl load -w "$PLIST"
        else
            echo "Let op: ontbreekt -> $PLIST"
        fi
    done
    echo "Automatische taken INgeschakeld:"
    echo "  - marktanalyse       elke ochtend 08:00   (-> Telegram)"
    echo "  - hertunen           elke dag 09:00       (-> retune_report.txt)"
    echo "  - voortgangsrapport  elke avond 20:00     (-> Telegram)"
    echo "  - beoordeling        elke maandag 09:30   (-> Telegram go/no-go)"
fi
