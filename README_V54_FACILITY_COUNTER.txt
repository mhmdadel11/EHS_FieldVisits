V54 - FIX FACILITY CARD VISIT STATUS
The facility cards at the bottom of the dashboard are now updated by a dedicated
script that runs after the existing directory renderer and reads the authoritative
SQL Server visit list. The exact card text is changed from "لم تتم زيارتها بعد"
to "تمت زيارتها مرة/مرتين/3 مرات..." according to the number of matching visits.
No database rows are deleted or changed.
