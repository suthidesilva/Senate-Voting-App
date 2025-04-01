--Create view for roll call details
CREATE VIEW IF NOT EXISTS roll_call_view AS
SELECT 
    s.session_id,
    s.datetime as session_datetime,
    u.user_id,
    u.name as member_name,
    u.role_name,
    u.committee_name,
    creator.name as created_by_name,
    a.created_at as attendance_recorded_at
FROM sessions s
LEFT JOIN attendance a ON s.session_id = a.session_id
LEFT JOIN users u ON a.user_id = u.user_id
LEFT JOIN users creator ON s.created_by = creator.user_id
WHERE u.is_active = 1
ORDER BY s.datetime DESC, u.name ASC;

-- SELECT * FROM attendance;
-- SELECT * FROM roll_call_view WHERE session_id = 1;



-- DROP VIEW voting_results_view;
CREATE VIEW IF NOT EXISTS voting_results_view AS
WITH vote_counts AS (
    SELECT 
        v.agenda_id,
        COUNT(CASE WHEN v.vote = 'yay' THEN 1 END) as yay_count,
        COUNT(CASE WHEN v.vote = 'nay' THEN 1 END) as nay_count,
        COUNT(CASE WHEN v.vote = 'abstain' THEN 1 END) as abstain_count,
        COUNT(*) as total_votes
    FROM votes v
    GROUP BY v.agenda_id
)
SELECT 
    a.agenda_id,
    a.title as agenda_title,
    s.session_id,
    s.datetime as session_datetime,
    u.name as agenda_created_by,
    vc.yay_count,
    vc.nay_count,
    vc.abstain_count,
    vc.total_votes,
    CASE 
        WHEN vc.yay_count > vc.nay_count THEN 'Approved'
        WHEN vc.yay_count < vc.nay_count THEN 'Rejected'
        WHEN vc.yay_count = vc.nay_count AND (vc.yay_count + vc.nay_count) > 0 THEN 'Tie'
        ELSE 'No Decision'
    END as final_result
FROM agendas a
LEFT JOIN vote_counts vc ON a.agenda_id = vc.agenda_id
LEFT JOIN sessions s ON a.session_id = s.session_id
LEFT JOIN users u ON a.created_by = u.user_id
ORDER BY s.datetime DESC, a.agenda_id;


-- Views for individual votes on a specific Agenda. 
CREATE VIEW IF NOT EXISTS individual_votes_view AS
SELECT 
    a.agenda_id,
    a.title as agenda_title,
    s.session_id,
    u.name as voter_name,
    s.datetime as session_datetime,
    u.role_name,
    v.vote,
    v.created_at as vote_timestamp
FROM agendas a
LEFT JOIN votes v ON a.agenda_id = v.agenda_id
LEFT JOIN users u ON v.user_id = u.user_id
LEFT JOIN sessions s ON a.session_id = s.session_id
ORDER BY s.datetime DESC, a.agenda_id, u.name;




--SELECT * FROM attendance;
-- SELECT * FROM roll_call_view WHERE session_id = 1;

-- SELECT * FROM votes;
-- SELECT * FROM voting_results_view WHERE agenda_id = 'A001';
-- SELECT * FROM voting_results_view WHERE agenda_id = 'A002';
-- SELECT * FROM individual_votes_view WHERE agenda_id = 'A001';
