# mpl_safe.py
# ----------------------------------------------------------------------
# Werkt een bekende matplotlib-bug op macOS om: bij het opstarten scant
# matplotlib de systeem-lettertypes via 'system_profiler', en in sommige
# omgevingen geeft dat onverwachte data terug -> crash (KeyError '_items').
#
# We onderscheppen alleen díe ene aanroep en geven een lege-maar-geldige
# uitkomst terug. Matplotlib valt dan terug op zijn eigen ingebouwde
# lettertype (DejaVu Sans) en werkt gewoon.
#
# Belangrijk: importeer dit bestand VOORDAT je matplotlib.pyplot importeert.
# ----------------------------------------------------------------------

import subprocess

_orig_check_output = subprocess.check_output

# Een geldige, lege property-list (zoals system_profiler zou teruggeven).
_EMPTY_PLIST = (
    b'<?xml version="1.0" encoding="UTF-8"?>'
    b'<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" '
    b'"http://www.apple.com/DTDs/PropertyList-1.0.dtd">'
    b'<plist version="1.0"><array><dict>'
    b'<key>_items</key><array></array></dict></array></plist>'
)


def _safe_check_output(cmd, *args, **kwargs):
    try:
        if isinstance(cmd, (list, tuple)) and any("SPFontsDataType" in str(c) for c in cmd):
            return _EMPTY_PLIST
    except Exception:
        pass
    return _orig_check_output(cmd, *args, **kwargs)


subprocess.check_output = _safe_check_output
