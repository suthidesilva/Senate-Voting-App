# Senate-Voting-System
The College of Idaho Coding Club is developing a customized voting system to meet the Senate Committee's needs while addressing the efficiency and transparency requirements. The voting system will allow senators to securely log in, cast their votes in real time, and view immediate results, with all session data being recorded and exportable.
---
The database has a default superuser `secretary` with the (hashed) password `changeme123`.
After you install `sqlite3` and `nodejs`, you need to install the dependencies with `npm install`, delete any existing database `rm senate_voting.db`, and setup the schema with `sqlite3 senate_voting.db < schema.sql` and `sqlite3 senate_voting.db < view.sql`; then you can run the application using `npm start`.  By default, it should be hosted under `localhost:7777`.
(Of course, we'd need a SSL certificate for an actual HTTPS server.)
