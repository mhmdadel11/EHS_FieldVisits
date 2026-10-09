V53 fix: The facility cards now refresh from SQL Server directly with retries.
Cache-busting versions were bumped to v53 so the browser cannot keep an older facilities-directory.js.
The card text changes from “لم تتم زيارتها بعد” to “تمت زيارتها X مرة/مرات” whenever matching SQL visits exist.
No SQL data is deleted or modified.
