V51 - FACILITY VISIT COUNT

Updated the dashboard facility cards so the fixed "لم تتم زيارتها بعد" label is replaced with the actual visit count:
- 1 visit: تمت زيارتها مرة
- 2 visits: تمت زيارتها مرتين
- 3+ visits: تمت زيارتها N مرات

Matching is tolerant of Arabic diacritics, punctuation, trailing emirate names, and legacy name variants while still checking emirate when both values are present.
The directory waits for the SQL bootstrap before rendering the final counts. No SQL data is deleted or changed.
