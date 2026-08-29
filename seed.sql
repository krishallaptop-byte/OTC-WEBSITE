-- =========================================================
-- ORCHID TECH CLUB — SEED DATA (MySQL / MariaDB)
-- Run AFTER schema.sql. Populates demo content identical to
-- the original design so the site looks correct immediately.
-- =========================================================

SET NAMES utf8mb4;

-- ---------- SCHEMA UPGRADE (safe to re-run on existing installs) ----------
-- Adds the photo focal-point columns used by the hexagonal BOD photo frames
-- (object-position offsets so a member's face is always centered instead of
-- being cropped out). Fresh installs already get these from schema.sql;
-- this ALTER is only needed when re-importing seed.sql into an existing
-- database that was set up before this feature was added.
ALTER TABLE bod_members ADD COLUMN IF NOT EXISTS photo_x DECIMAL(5,2) NOT NULL DEFAULT 50.00 AFTER photo;
ALTER TABLE bod_members ADD COLUMN IF NOT EXISTS photo_y DECIMAL(5,2) NOT NULL DEFAULT 35.00 AFTER photo_x;

-- Admin user (username: ORCHIDtechCluB@OTC / password: Otc@TechWEBadmin@143)
-- Password is SHA-256("orchid_tech_club_salt_v1" + password) — same hash as before, verified by PHP hash() function.
INSERT IGNORE INTO admin_users (id, username, password_hash, role) VALUES
(1, 'ORCHIDtechCluB@OTC', 'a42d859cfa9ee5a7bc3cdaff9a6b25cc80b751be1a0b8fb5e97b8f5e84f6089d', 'admin');

-- ---------- SITE CONTENT (JSON blobs) ----------
-- Auto-generated block: each JSON value is emitted as a single-line,
-- properly-escaped SQL string literal (avoids raw-newline-in-JSON bugs).
INSERT IGNORE INTO site_content (`key`, value) VALUES ('homepage', '{"heroTitle":"ORCHID TECH CLUB","heroSubtitle":"Innovate • Build • Lead","heroLead":"A community of passionate learners, builders and innovators driving technology forward into a better tomorrow.","heroBackground":"","stats":{"yearsActive":3,"members":150,"projects":25,"workshops":40,"events":15,"achievements":10},"aboutPreviewTitle":"About Us","aboutPreviewText":"Orchid Tech Club is a vibrant community of tech enthusiasts united by curiosity, creativity and a passion for making an impact through technology. We bring together students from diverse backgrounds to learn, build, and grow together.","aboutPreviewImage":"/static/images/first-meeting-1.jpg","expertise":[{"icon":"fa-brain","label":"Artificial Intelligence"},{"icon":"fa-code","label":"Web Development"},{"icon":"fa-mobile-screen","label":"App Development"},{"icon":"fa-robot","label":"Robotics"},{"icon":"fa-shield-halved","label":"Cyber Security"},{"icon":"fa-chart-line","label":"Data Science"}]}');
INSERT IGNORE INTO site_content (`key`, value) VALUES ('about', '{"story":"Orchid Tech Club was founded with a vision to build a strong community of tech enthusiasts and create a platform for learning, sharing and building innovative solutions. What started as a small group of curious minds has grown into a thriving hub of builders, designers and problem solvers.\\n\\nToday, the club runs regular workshops, hackathons, and knowledge-sharing sessions — helping members grow their technical and leadership skills while working on real projects that matter.","storyImage":"/static/images/first-meeting-2.jpg","vision":"To be a leading community fostering innovation and technology education.","mission":"To provide opportunities, guidance and a platform to bring innovative ideas to life.","motto":"\\"Innovate • Build • Lead\\" — together we create a better tomorrow.","coreValues":"Teamwork, honesty, integrity and continuous improvement.","expertiseCards":[{"icon":"fa-brain","label":"AI/ML"},{"icon":"fa-pen-ruler","label":"UI/UX Design"},{"icon":"fa-code-compare","label":"Competitive Programming"},{"icon":"fa-flask","label":"Tech Research"},{"icon":"fa-vr-cardboard","label":"VR/AR Design"},{"icon":"fa-cloud","label":"Cloud Computing"}],"timeline":[{"year":"2025 — Present","title":"4th Executive Board","text":"Led by President Krishal Poudel. Focused on expanding workshops, hackathons and industry collaborations."},{"year":"2024 — 2025","title":"3rd Executive Board","text":"Strengthened the club\'s presence with the first major Tech Spark fest and new recruitment drives."},{"year":"2023 — 2024","title":"2nd Executive Board","text":"Introduced structured mentorship programs and the club\'s first official projects."},{"year":"2022 — 2023","title":"Founding Board","text":"Orchid Tech Club was founded by a small group of passionate students with a vision to build a tech community."}]}');
INSERT IGNORE INTO site_content (`key`, value) VALUES ('settings', '{"clubName":"Orchid Tech Club","logo":"/static/images/logo.png","favicon":"/static/images/logo.png","themePrimary":"#7b2ff7","themeSecondary":"#4facfe","email":"orchidtechclub@gmail.com","phone":"+977 980-0000000","address":"Bharatpur-10, Chitwan, Nepal","mapUrl":"https://www.google.com/maps?q=27.6689062,84.4317981&z=16&output=embed","mapLink":"https://maps.app.goo.gl/ubW3cY4NGfbgAbUn9","footerText":"Innovate. Build. Lead. Together we create a better tomorrow through technology, collaboration and continuous learning.","copyright":"© Orchid Tech Club. All rights reserved."}');
INSERT IGNORE INTO site_content (`key`, value) VALUES ('social', '{"facebook":"#","instagram":"#","linkedin":"#","youtube":"#","github":""}');
INSERT IGNORE INTO site_content (`key`, value) VALUES ('membership', '{"registrationStatus":"open","googleFormUrl":"https://forms.google.com/placeholder","registrationDeadline":"2025-12-31","instructions":"Fill out the form carefully. Shortlisted candidates will be contacted for further process.","benefits":["Learn from and with like-minded peers","Hands-on workshops and real projects","Genuine and long-lasting connections","Leadership and teamwork opportunities","Access to exclusive events and resources"],"faq":[{"q":"Who can join Orchid Tech Club?","a":"Any enrolled student with an interest in technology can apply."},{"q":"Is there a membership fee?","a":"No, membership is completely free."},{"q":"How long does the application process take?","a":"Typically 1-2 weeks from application to final decision."}]}');
INSERT IGNORE INTO site_content (`key`, value) VALUES ('nav', '{"links":[{"label":"Home","href":"index.html"},{"label":"About","href":"about.html"},{"label":"BOD History","href":"bod-history.html"},{"label":"Gallery","href":"gallery.html"},{"label":"News & Notices","href":"news.html"},{"label":"Resources","href":"resources.html"},{"label":"Projects","href":"projects.html"},{"label":"Membership","href":"membership.html"},{"label":"Contact","href":"contact.html"}]}');
INSERT IGNORE INTO site_content (`key`, value) VALUES ('footer', '{"quickLinks":[{"label":"About","href":"about.html"},{"label":"BOD History","href":"bod-history.html"},{"label":"Projects","href":"projects.html"},{"label":"Resources","href":"resources.html"}],"connectLinks":[{"label":"Gallery","href":"gallery.html"},{"label":"News & Notices","href":"news.html"},{"label":"Membership","href":"membership.html"},{"label":"Contact","href":"contact.html"}]}');

-- ---------- NEWS & NOTICES ----------
INSERT IGNORE INTO news (id, title, category, `date`, excerpt, cover_image, status, pinned, sort_order) VALUES
(1, 'Recruitment Drive 2025', 'notice', '2025-05-16', 'We are excited to announce the recruitment of new members! Passionate learners, builders and innovators are welcome to join the club.', '/static/images/first-meeting-1.jpg', 'published', 1, 1),
(2, 'Tech Spark 2025 Meeting', 'event', '2025-05-10', 'Our annual tech fest is coming soon! An exciting lineup of events and exciting new learning experiences awaits every member.', '/static/images/first-meeting-2.jpg', 'published', 0, 2),
(3, 'AI & ML Workshop', 'workshop', '2025-05-05', 'Hands-on workshop on AI/ML and Machine Learning tools and techniques for beginners and intermediate learners alike.', '/static/images/first-meeting-1.jpg', 'published', 0, 3),
(4, 'Interview Results', 'notice', '2025-03-18', 'The results of the recent interview will be published soon. Stay tuned for the official announcement — 7:00 PM sharp.', '/static/images/first-meeting-2.jpg', 'published', 0, 4),
(5, 'Web Development Workshop', 'workshop', '2025-03-15', 'Live logistics and web development workshop covering HTML, CSS, JavaScript fundamentals for club members.', '/static/images/first-meeting-2.jpg', 'published', 0, 5),
(6, 'Our Team Won 2nd Runner Up', 'achievement', '2025-03-12', 'Proud moment for Orchid Tech Club as our team secured 2nd Runner Up position at the inter-college hackathon.', '/static/images/first-meeting-1.jpg', 'published', 0, 6);

-- ---------- BOD YEARS + MEMBERS ----------
INSERT IGNORE INTO bod_years (id, title, is_current, sort_order) VALUES
(1, '2025–2026', 0, 1),
(2, '2026–2027', 1, 2);
-- NOTE: is_current is only applied by the INSERT above on a fresh install.
-- On an existing install where these rows already exist, INSERT IGNORE is a
-- no-op, so also force the correct current flag explicitly:
UPDATE bod_years SET is_current = 1 WHERE id = 2;
UPDATE bod_years SET is_current = 0 WHERE id = 1;

-- photo_x/photo_y = face-detection focal point (% of image width/height) for
-- each member's photo, so the hexagon frame's object-position always centers
-- on their face automatically. Computed once via an OpenCV DNN face detector
-- + skin-tone verification (to reject false positives like statues/objects
-- in the background) when each photo was added; editable afterwards from the
-- admin panel's drag-to-reposition control.
INSERT IGNORE INTO bod_members (id, year_id, name, position, photo, photo_x, photo_y, sort_order) VALUES
(1, 1, 'Aayushma R.', 'President', '', 50.00, 35.00, 1),
(2, 1, 'Sabnam Sherpa', 'Secretary', '', 50.00, 35.00, 2),
(3, 1, 'Suprina T.', 'Treasurer', '', 50.00, 35.00, 3),
(4, 1, 'Saugat Rai', 'Social Media Head', '', 50.00, 35.00, 4),
(5, 2, 'Krishal Poudel', 'President', '/static/images/president-krishal-poudel.jpg', 50.30, 51.10, 1),
(6, 2, 'Apekshay Gurung', 'Vice President', '/static/images/bod-2026-27-apekshay-gurung.jpg', 24.70, 33.40, 2),
(7, 2, 'Subarna Poudel', 'Secretary', '/static/images/bod-2026-27-subarna-poudel.jpg', 50.40, 46.80, 3),
(8, 2, 'Himanshu Chaurisiya', 'Treasurer', '/static/images/bod-2026-27-himanshu-chaurisiya.jpg', 46.40, 42.80, 4),
(9, 2, 'Prince Thapa', 'Editor', '/static/images/bod-2026-27-prince-thapa.jpg', 48.20, 43.10, 5),
(11, 2, 'Supriya Gurung', 'Social Media Head', '/static/images/bod-2026-27-supriya-gurung.jpg', 63.40, 51.10, 6),
(12, 2, 'Nischal Subedi', 'Event Manager', '/static/images/bod-2026-27-nischal-subedi.jpg', 65.70, 50.40, 7);
-- On an existing install, INSERT IGNORE is a no-op for ids that already
-- exist, so also force the photo_x/photo_y (and photo path) explicitly:
UPDATE bod_members SET photo='/static/images/president-krishal-poudel.jpg', photo_x=50.30, photo_y=51.10 WHERE id=5;
UPDATE bod_members SET name='Apekshay Gurung', position='Vice President', photo='/static/images/bod-2026-27-apekshay-gurung.jpg', photo_x=24.70, photo_y=33.40 WHERE id=6;
UPDATE bod_members SET name='Subarna Poudel', position='Secretary', photo='/static/images/bod-2026-27-subarna-poudel.jpg', photo_x=50.40, photo_y=46.80 WHERE id=7;
UPDATE bod_members SET name='Himanshu Chaurisiya', position='Treasurer', photo='/static/images/bod-2026-27-himanshu-chaurisiya.jpg', photo_x=46.40, photo_y=42.80 WHERE id=8;
UPDATE bod_members SET name='Prince Thapa', position='Editor', photo='/static/images/bod-2026-27-prince-thapa.jpg', photo_x=48.20, photo_y=43.10 WHERE id=9;
UPDATE bod_members SET name='Supriya Gurung', position='Social Media Head', photo='/static/images/bod-2026-27-supriya-gurung.jpg', photo_x=63.40, photo_y=51.10 WHERE id=11;
UPDATE bod_members SET name='Nischal Subedi', position='Event Manager', photo='/static/images/bod-2026-27-nischal-subedi.jpg', photo_x=65.70, photo_y=50.40 WHERE id=12;

-- ---------- GALLERY ALBUMS ----------
INSERT IGNORE INTO gallery_albums (id, name, event_date, cover_image, description, sort_order) VALUES
(1, 'First Meeting', '2025-03-01', '/static/images/first-meeting-1.jpg', 'Our very first club meeting bringing members together for the first time.', 1);

INSERT IGNORE INTO gallery_images (id, album_id, url, caption, sort_order) VALUES
(1, 1, '/static/images/first-meeting-1.jpg', 'First Meeting - Introduction Session', 1),
(2, 1, '/static/images/first-meeting-2.jpg', 'First Meeting - Roadmap Discussion', 2);

-- ---------- PROJECTS ----------
INSERT IGNORE INTO projects (id, title, tag, description, status, thumbnail, sort_order) VALUES
(1, 'Smart Attendance System', 'AI/ML', 'Facial recognition based automated attendance system for classrooms.', 'Completed', '/static/images/first-meeting-1.jpg', 1),
(2, 'Club Management Portal', 'Web Dev', 'A full-stack portal to manage members, events and resources of the club.', 'Ongoing', '/static/images/first-meeting-2.jpg', 2),
(3, 'Line Following Robot', 'Robotics', 'An autonomous robot capable of following a track using IR sensors.', 'Completed', '/static/images/first-meeting-1.jpg', 3),
(4, 'Campus Threat Detector', 'Cyber Security', 'A lightweight IDS tool to detect suspicious network activity on campus WiFi.', 'Ongoing', '/static/images/first-meeting-2.jpg', 4),
(5, 'Result Analytics Dashboard', 'Data Science', 'Visual analytics dashboard for tracking academic performance trends.', 'Completed', '/static/images/first-meeting-1.jpg', 5),
(6, 'Club VR Tour', 'VR/AR', 'A virtual reality walkthrough of the college campus for new students.', 'Planned', '/static/images/first-meeting-2.jpg', 6);

-- ---------- RESOURCES ----------
INSERT IGNORE INTO resources (id, title, description, category, sort_order) VALUES
(1, 'Programming Basics', 'Beginner-friendly guides for C, Python, and JavaScript.', 'Programming', 1),
(2, 'Web Development', 'HTML, CSS, JavaScript and modern frameworks tutorials.', 'Web Dev', 2),
(3, 'AI & Machine Learning', 'Introductory material for AI/ML enthusiasts.', 'AI/ML', 3),
(4, 'Robotics', 'Arduino and IoT project guides for hands-on learning.', 'Robotics', 4),
(5, 'Cyber Security', 'Ethical hacking basics and security best practices.', 'Security', 5),
(6, 'Data Science', 'Data analysis, visualization and statistics resources.', 'Data Science', 6);
