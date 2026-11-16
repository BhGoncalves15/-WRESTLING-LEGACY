import { rosterEntry, type RosterEntry } from './roster-model'
import { SOURCES } from './sources'

const NXT = '2025-12-30'
const DEADLINE = '2025-12-06'
const TNA = '2025-12-18'
const FINAL_BATTLE = '2025-12-05'

export const PILOT_ROSTER: readonly RosterEntry[] = [
  rosterEntry('oba-femi', 'Oba Femi', 'nxt', 'men', 'Powerhouse', 13, 'Tweener', DEADLINE, SOURCES.nxtDeadline),
  rosterEntry('ricky-saints', 'Ricky Saints', 'nxt', 'men', 'All-Rounder', 12, 'Face', DEADLINE, SOURCES.nxtDeadline),
  rosterEntry('ethan-page', 'Ethan Page', 'nxt', 'men', 'Brawler', 11, 'Heel', NXT, SOURCES.nxtDecember),
  rosterEntry('tavion-heights', 'Tavion Heights', 'nxt', 'men', 'Technician', -1, 'Face', NXT, SOURCES.nxtDecember),
  rosterEntry('jasper-troy', 'Jasper Troy', 'nxt', 'men', 'Powerhouse', 0, 'Tweener', NXT, SOURCES.nxtDecember),
  rosterEntry('jevon-evans', 'Je’Von Evans', 'nxt', 'men', 'Highflyer', 6, 'Face', DEADLINE, SOURCES.nxtDeadline),
  rosterEntry('jacy-jayne', 'Jacy Jayne', 'nxt', 'women', 'Brawler', 12, 'Heel', NXT, SOURCES.nxtDecember),
  rosterEntry('wren-sinclair', 'Wren Sinclair', 'nxt', 'women', 'Technician', -2, 'Face', NXT, SOURCES.nxtDecember),
  rosterEntry('kendal-grey', 'Kendal Grey', 'nxt', 'women', 'Technician', 1, 'Face', NXT, SOURCES.nxtDecember),
  rosterEntry('tatum-paxley', 'Tatum Paxley', 'nxt', 'women', 'All-Rounder', 7, 'Face', NXT, SOURCES.nxtDecember),
  rosterEntry('izzi-dame', 'Izzi Dame', 'nxt', 'women', 'Powerhouse', 4, 'Heel', NXT, SOURCES.nxtDecember),
  rosterEntry('frankie-kazarian', 'Frankie Kazarian', 'tna', 'men', 'Technician', 12, 'Heel', TNA, SOURCES.tnaDecember),
  rosterEntry('leon-slater', 'Leon Slater', 'tna', 'men', 'Highflyer', 7, 'Face', '2025-12-05', SOURCES.tnaFinal),
  rosterEntry('mike-santana', 'Mike Santana', 'tna', 'men', 'Brawler', 12, 'Face', TNA, SOURCES.tnaDecember),
  rosterEntry('eddie-edwards', 'Eddie Edwards', 'tna', 'men', 'Brawler', 5, 'Heel', '2025-12-05', SOURCES.tnaFinal),
  rosterEntry('bear-bronson', 'Bear Bronson', 'tna', 'men', 'Powerhouse', -2, 'Tweener', TNA, SOURCES.tnaDecember),
  rosterEntry('cedric-alexander', 'Cedric Alexander', 'tna', 'men', 'Highflyer', 3, 'Face', TNA, SOURCES.tnaDecember),
  rosterEntry('lei-ying-lee', 'Léi Yǐng Lee', 'tna', 'women', 'Brawler', 10, 'Face', TNA, SOURCES.tnaDecember),
  rosterEntry('xia-brookside', 'Xia Brookside', 'tna', 'women', 'Technician', 0, 'Face', TNA, SOURCES.tnaDecember),
  rosterEntry('tessa-blanchard', 'Tessa Blanchard', 'tna', 'women', 'All-Rounder', 8, 'Heel', TNA, SOURCES.tnaDecember),
  rosterEntry('mila-moore', 'Mila Moore', 'tna', 'women', 'Brawler', -4, 'Heel', TNA, SOURCES.tnaDecember),
  rosterEntry('dani-luna', 'Dani Luna', 'tna', 'women', 'Powerhouse', 3, 'Tweener', TNA, SOURCES.tnaDecember),
  rosterEntry('bandido', 'Bandido', 'roh', 'men', 'Highflyer', 14, 'Face', FINAL_BATTLE, SOURCES.rohDecember),
  rosterEntry('blake-christian', 'Blake Christian', 'roh', 'men', 'Highflyer', 1, 'Heel', FINAL_BATTLE, SOURCES.rohDecember),
  rosterEntry('lee-moriarty', 'Lee Moriarty', 'roh', 'men', 'Submission Specialist', 6, 'Heel', FINAL_BATTLE, SOURCES.rohDecember),
  rosterEntry('komander', 'Komander', 'roh', 'men', 'Highflyer', 2, 'Face', FINAL_BATTLE, SOURCES.rohDecember),
  rosterEntry('sammy-guevara', 'Sammy Guevara', 'roh', 'men', 'Highflyer', 9, 'Heel', FINAL_BATTLE, SOURCES.rohDecember),
  rosterEntry('beast-mortos', 'The Beast Mortos', 'roh', 'men', 'Powerhouse', 7, 'Heel', FINAL_BATTLE, SOURCES.rohDecember),
  rosterEntry('athena', 'Athena', 'roh', 'women', 'All-Rounder', 15, 'Heel', FINAL_BATTLE, SOURCES.rohDecember),
  rosterEntry('deonna-purrazzo', 'Deonna Purrazzo', 'roh', 'women', 'Submission Specialist', 10, 'Face', FINAL_BATTLE, SOURCES.rohDecember),
  rosterEntry('billie-starkz', 'Billie Starkz', 'roh', 'women', 'Highflyer', 3, 'Tweener', FINAL_BATTLE, SOURCES.rohDecember),
  rosterEntry('red-velvet', 'Red Velvet', 'roh', 'women', 'Brawler', 7, 'Face', FINAL_BATTLE, SOURCES.rohDecember),
  rosterEntry('trish-adora', 'Trish Adora', 'roh', 'women', 'Technician', 0, 'Tweener', FINAL_BATTLE, SOURCES.rohDecember),
]
